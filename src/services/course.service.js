import { Course } from '../models/Course.model.js'
import { Enrollment } from '../models/Enrollment.model.js'
import { ApiError } from '../utils/ApiError.js'

const SORTS = {
  popular: { students: -1 },
  rating: { rating: -1, reviewCount: -1 },
  newest: { createdAt: -1 },
  'price-low': { price: 1 },
  'price-high': { price: -1 },
}

/**
 * Public catalog.
 * Query params: q, category, difficulty, price (free|paid), sort, page, limit
 */
export const listCourses = async (query = {}) => {
  const { q, category, difficulty, price, sort = 'popular' } = query
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 24))

  const filter = { status: 'published' }
  if (category) filter.category = category
  if (difficulty) filter.difficulty = difficulty
  if (price === 'free') filter.price = 0
  if (price === 'paid') filter.price = { $gt: 0 }
  if (q) {
    // Regex over title/tags keeps partial matches working (text index is exact-word)
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ title: rx }, { description: rx }, { tags: rx }]
  }

  const [courses, total] = await Promise.all([
    Course.find(filter)
      .sort(SORTS[sort] ?? SORTS.popular)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('instructor', 'name avatar bio'),
    Course.countDocuments(filter),
  ])

  return {
    courses: courses.map((c) => c.toCard()),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

/** Course detail by slug. Drafts/archived are only visible to their owner or admins. */
export const getCourseBySlug = async (slug, requester = null) => {
  const course = await Course.findOne({ slug }).populate('instructor', 'name avatar bio')
  if (!course) throw new ApiError(404, 'Course not found')

  if (course.status !== 'published') {
    const isOwner = requester && course.instructor._id.toString() === requester._id.toString()
    const isAdmin = requester?.role === 'admin'
    if (!isOwner && !isAdmin) throw new ApiError(404, 'Course not found')
  }

  return course.toPublic()
}

/**
 * Single lesson with content.
 * Free preview lessons are public; everything else requires enrollment
 * (or being the course instructor / an admin).
 */
export const getLesson = async (slug, lessonSlug, requester = null) => {
  const course = await Course.findOne({ slug, status: 'published' }).populate(
    'instructor',
    'name avatar bio'
  )
  if (!course) throw new ApiError(404, 'Course not found')

  const lesson = course.findLessonBySlug(lessonSlug)
  if (!lesson) throw new ApiError(404, 'Lesson not found')

  let hasAccess = lesson.isPreview
  if (!hasAccess && requester) {
    const isOwner = course.instructor._id.toString() === requester._id.toString()
    const isAdmin = requester.role === 'admin'
    const enrolled = await Enrollment.exists({ user: requester._id, course: course._id })
    hasAccess = isOwner || isAdmin || Boolean(enrolled)
  }
  if (!hasAccess) {
    throw new ApiError(403, 'Enroll in this course to access this lesson')
  }

  return {
    course: { id: course._id.toString(), slug: course.slug, title: course.title },
    lesson: Course.shapeLesson(lesson, { includeContent: true }),
  }
}

// ─── Instructor CRUD ──────────────────────────────────────────────────────────

export const createCourse = async (instructorId, data) => {
  const existing = await Course.findOne({ slug: data.slug })
  if (existing) throw new ApiError(409, 'A course with that slug already exists')

  const course = await Course.create({ ...data, instructor: instructorId, status: 'draft' })
  await course.populate('instructor', 'name avatar bio')
  return course.toPublic()
}

/** Loads a course and asserts the requester owns it (admins bypass). */
const findOwnedCourse = async (courseId, requester) => {
  const course = await Course.findById(courseId)
  if (!course) throw new ApiError(404, 'Course not found')
  const isOwner = course.instructor.toString() === requester._id.toString()
  if (!isOwner && requester.role !== 'admin') {
    throw new ApiError(403, 'You can only manage your own courses')
  }
  return course
}

/** Full course for the instructor editor (any status, owner/admin only). */
export const getCourseForEdit = async (courseId, requester) => {
  const course = await findOwnedCourse(courseId, requester)
  await course.populate('instructor', 'name avatar bio')
  return course.toPublic()
}

export const updateCourse = async (courseId, requester, updates) => {
  const course = await findOwnedCourse(courseId, requester)
  Object.assign(course, updates)
  await course.save()
  await course.populate('instructor', 'name avatar bio')
  return course.toPublic()
}

export const setCourseStatus = async (courseId, requester, status) => {
  const course = await findOwnedCourse(courseId, requester)
  course.status = status
  await course.save()
  await course.populate('instructor', 'name avatar bio')
  return course.toPublic()
}

export const deleteCourse = async (courseId, requester) => {
  const course = await findOwnedCourse(courseId, requester)
  if (course.students > 0) {
    // Never hard-delete a course people paid for — archive it instead
    course.status = 'archived'
    await course.save()
    return { archived: true }
  }
  await course.deleteOne()
  return { deleted: true }
}
