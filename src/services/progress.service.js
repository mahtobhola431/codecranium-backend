import { Course } from '../models/Course.model.js'
import { Enrollment } from '../models/Enrollment.model.js'
import { Certificate } from '../models/Certificate.model.js'
import { Activity } from '../models/Activity.model.js'
import { User } from '../models/User.model.js'
import { ApiError } from '../utils/ApiError.js'

// XP awarded per lesson type — gamification shown on the learner dashboard
const XP_PER_LESSON = { video: 50, article: 50, quiz: 75, challenge: 100 }
const XP_COURSE_COMPLETE_BONUS = 500

/**
 * Updates the daily streak: +1 if last activity was yesterday,
 * reset to 1 if the chain broke, unchanged if already active today.
 */
const touchStreak = (user) => {
  const today = new Date().toISOString().slice(0, 10)
  const last = user.lastActiveDate?.toISOString().slice(0, 10)
  if (last === today) return

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  user.streak = last === yesterday ? user.streak + 1 : 1
  user.lastActiveDate = new Date()
}

export const enroll = async (user, courseId) => {
  const course = await Course.findOne({ _id: courseId, status: 'published' })
  if (!course) throw new ApiError(404, 'Course not found')

  const existing = await Enrollment.findOne({ user: user._id, course: course._id })
  if (existing) throw new ApiError(409, 'Already enrolled in this course')

  const enrollment = await Enrollment.create({ user: user._id, course: course._id })

  // Denormalised counters — student count + revenue for paid courses
  course.students += 1
  if (course.price > 0) course.revenue += course.price
  await course.save()

  Activity.log('enroll', `${user.name} enrolled in ${course.title}`, user._id)

  return enrollment.toPublic(course.allLessons().length)
}

export const completeLesson = async (user, courseId, { lessonId, lessonSlug }) => {
  const [course, enrollment] = await Promise.all([
    Course.findById(courseId),
    Enrollment.findOne({ user: user._id, course: courseId }),
  ])
  if (!course) throw new ApiError(404, 'Course not found')
  if (!enrollment) throw new ApiError(403, 'You are not enrolled in this course')

  const lessons = course.allLessons()
  const lesson = lessons.find((l) => l._id.toString() === lessonId || l.slug === lessonId)
  if (!lesson) throw new ApiError(404, 'Lesson not found in this course')

  const lessonKey = lesson._id.toString()
  let xpAwarded = 0
  let certificate = null

  if (!enrollment.completedLessons.includes(lessonKey)) {
    enrollment.completedLessons.push(lessonKey)
    xpAwarded = XP_PER_LESSON[lesson.type] ?? 50

    // Course finished? Issue a certificate (idempotent via unique index)
    if (enrollment.completedLessons.length >= lessons.length && !enrollment.completedAt) {
      enrollment.completedAt = new Date()
      xpAwarded += XP_COURSE_COMPLETE_BONUS
      certificate = await Certificate.findOneAndUpdate(
        { user: user._id, course: course._id },
        { $setOnInsert: { courseTitle: course.title, issuedAt: new Date() } },
        { upsert: true, new: true }
      )
      Activity.log('complete', `${user.name} completed ${course.title}`, user._id)
    }
  }

  enrollment.lastLessonSlug = lessonSlug || lesson.slug
  await enrollment.save()

  // Update gamification on the user
  const freshUser = await User.findById(user._id)
  if (freshUser) {
    freshUser.xp += xpAwarded
    touchStreak(freshUser)
    await freshUser.save()
  }

  return {
    enrollment: enrollment.toPublic(lessons.length),
    xpAwarded,
    user: freshUser ? freshUser.toPublic() : undefined,
    ...(certificate ? { certificate: certificate.toPublic() } : {}),
  }
}

/** All of the user's enrollments with derived progress + course cards. */
export const getMyEnrollments = async (userId) => {
  const enrollments = await Enrollment.find({ user: userId }).populate({
    path: 'course',
    populate: { path: 'instructor', select: 'name avatar bio' },
  })

  return enrollments
    .filter((e) => e.course) // course may have been hard-deleted
    .map((e) => ({
      ...e.toPublic(e.course.allLessons().length),
      course: e.course.toCard(),
    }))
}

/** Everything the learner dashboard needs in one round trip. */
export const getDashboard = async (user) => {
  const [enrollments, certificates] = await Promise.all([
    getMyEnrollments(user._id),
    Certificate.find({ user: user._id }).sort({ issuedAt: -1 }),
  ])

  const inProgress = enrollments.filter((e) => !e.completedAt)
  const completed = enrollments.filter((e) => e.completedAt)

  return {
    user: user.toPublic(),
    enrollments,
    certificates: certificates.map((c) => c.toPublic()),
    stats: {
      enrolledCount: enrollments.length,
      inProgressCount: inProgress.length,
      completedCount: completed.length,
      totalXp: user.xp,
      streak: user.streak,
    },
  }
}

export const getMyCertificates = async (userId) => {
  const certificates = await Certificate.find({ user: userId }).sort({ issuedAt: -1 })
  return certificates.map((c) => c.toPublic())
}
