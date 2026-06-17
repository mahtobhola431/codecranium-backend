import { Course } from '../models/Course.model.js'
import { Enrollment } from '../models/Enrollment.model.js'
import { Payout } from '../models/Payout.model.js'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Headline numbers for the instructor dashboard. */
export const getOverview = async (instructor) => {
  const courses = await Course.find({ instructor: instructor._id })

  const published = courses.filter((c) => c.status === 'published')
  const totalStudents = courses.reduce((sum, c) => sum + c.students, 0)
  const totalRevenue = courses.reduce((sum, c) => sum + c.revenue, 0)
  const rated = published.filter((c) => c.rating > 0)
  const avgRating = rated.length
    ? Number((rated.reduce((sum, c) => sum + c.rating, 0) / rated.length).toFixed(2))
    : 0

  return {
    profile: {
      ...instructor.toPublic(),
      payoutAccount: instructor.payoutAccount,
      totalStudents,
      totalRevenue,
      avgRating,
    },
    courseCount: courses.length,
    publishedCount: published.length,
    draftCount: courses.filter((c) => c.status === 'draft').length,
  }
}

/** All of this instructor's courses, drafts included. */
export const getMyCourses = async (instructorId) => {
  const courses = await Course.find({ instructor: instructorId })
    .sort({ updatedAt: -1 })
    .populate('instructor', 'name avatar bio')
  return courses.map((c) => ({ ...c.toCard(), status: c.status, revenue: c.revenue }))
}

/** Per-course analytics — matches INSTRUCTOR_COURSE_ANALYTICS shape. */
export const getCourseAnalytics = async (instructorId) => {
  const courses = await Course.find({ instructor: instructorId, status: 'published' })

  return Promise.all(
    courses.map(async (course) => {
      const totalLessons = course.allLessons().length
      const [enrollmentCount, completedCount] = await Promise.all([
        Enrollment.countDocuments({ course: course._id }),
        Enrollment.countDocuments({ course: course._id, completedAt: { $ne: null } }),
      ])
      return {
        courseId: course._id.toString(),
        title: course.title,
        students: course.students,
        completionRate: enrollmentCount
          ? Math.round((completedCount / enrollmentCount) * 100)
          : 0,
        rating: course.rating,
        revenue: course.revenue,
        reviewCount: course.reviewCount,
        gradient: course.gradient,
        price: course.price,
        totalLessons,
      }
    })
  )
}

/** Monthly earnings (last 12 months of enrollments in paid courses) + payout history. */
export const getRevenue = async (instructor) => {
  const courses = await Course.find({ instructor: instructor._id }).select('_id price')
  const paidCourseIds = courses.filter((c) => c.price > 0).map((c) => c._id)
  const priceById = new Map(courses.map((c) => [c._id.toString(), c.price]))

  const since = new Date()
  since.setMonth(since.getMonth() - 11)
  since.setDate(1)
  since.setHours(0, 0, 0, 0)

  const enrollments = await Enrollment.find({
    course: { $in: paidCourseIds },
    createdAt: { $gte: since },
  }).select('course createdAt')

  // Bucket revenue + student count by month
  const buckets = new Map()
  for (let i = 0; i < 12; i++) {
    const d = new Date(since.getFullYear(), since.getMonth() + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.set(key, { month: MONTH_LABELS[d.getMonth()], earnings: 0, students: 0 })
  }
  for (const e of enrollments) {
    const key = `${e.createdAt.getFullYear()}-${String(e.createdAt.getMonth() + 1).padStart(2, '0')}`
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.earnings += priceById.get(e.course.toString()) ?? 0
      bucket.students += 1
    }
  }

  const payouts = await Payout.find({ instructor: instructor._id }).sort({ month: -1 })

  return {
    monthlyEarnings: [...buckets.values()],
    payouts: payouts.map((p) => p.toPublic()),
    payoutAccount: instructor.payoutAccount,
  }
}

/** Recent students across this instructor's courses. */
export const getMyStudents = async (instructorId, limit = 50) => {
  const courses = await Course.find({ instructor: instructorId }).select('_id title sections')
  const courseById = new Map(courses.map((c) => [c._id.toString(), c]))

  const enrollments = await Enrollment.find({ course: { $in: [...courseById.keys()] } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name xp')

  return enrollments
    .filter((e) => e.user)
    .map((e) => {
      const course = courseById.get(e.course.toString())
      const totalLessons = course ? course.allLessons().length : 0
      return {
        name: e.user.name,
        course: course?.title ?? '',
        progress: totalLessons
          ? Math.min(100, Math.round((e.completedLessons.length / totalLessons) * 100))
          : 0,
        joined: e.createdAt.toISOString().slice(0, 10),
        xp: e.user.xp,
      }
    })
}
