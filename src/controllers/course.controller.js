import * as courseService from '../services/course.service.js'
import * as commentService from '../services/comment.service.js'

/**
 * GET /api/v1/courses
 * Query: q, category, difficulty, price=free|paid, sort=popular|rating|newest|price-low|price-high, page, limit
 */
export const listCourses = async (req, res) => {
  const result = await courseService.listCourses(req.query)
  res.json({ success: true, data: result })
}

/** GET /api/v1/courses/:slug */
export const getCourse = async (req, res) => {
  const course = await courseService.getCourseBySlug(req.params.slug, req.user)
  res.json({ success: true, data: { course } })
}

/**
 * GET /api/v1/courses/:slug/lessons/:lessonSlug
 * Preview lessons are public; the rest require enrollment.
 */
export const getLesson = async (req, res) => {
  const result = await courseService.getLesson(req.params.slug, req.params.lessonSlug, req.user)
  res.json({ success: true, data: result })
}

/** GET /api/v1/courses/:slug/lessons/:lessonSlug/comments */
export const getLessonComments = async (req, res) => {
  const comments = await commentService.getLessonComments(req.params.slug, req.params.lessonSlug)
  res.json({ success: true, data: { comments } })
}
