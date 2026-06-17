import * as instructorService from '../services/instructor.service.js'
import * as courseService from '../services/course.service.js'

/** GET /api/v1/instructor/overview */
export const getOverview = async (req, res) => {
  const overview = await instructorService.getOverview(req.user)
  res.json({ success: true, data: overview })
}

/** GET /api/v1/instructor/courses — all of my courses incl. drafts */
export const getMyCourses = async (req, res) => {
  const courses = await instructorService.getMyCourses(req.user._id)
  res.json({ success: true, data: { courses } })
}

/** POST /api/v1/instructor/courses — create (starts as draft) */
export const createCourse = async (req, res) => {
  const course = await courseService.createCourse(req.user._id, req.body)
  res.status(201).json({ success: true, data: { course } })
}

/** GET /api/v1/instructor/courses/:id — full course for the editor */
export const getCourseForEdit = async (req, res) => {
  const course = await courseService.getCourseForEdit(req.params.id, req.user)
  res.json({ success: true, data: { course } })
}

/** PATCH /api/v1/instructor/courses/:id */
export const updateCourse = async (req, res) => {
  const course = await courseService.updateCourse(req.params.id, req.user, req.body)
  res.json({ success: true, data: { course } })
}

/** PATCH /api/v1/instructor/courses/:id/status — body: { status } */
export const setCourseStatus = async (req, res) => {
  const course = await courseService.setCourseStatus(req.params.id, req.user, req.body.status)
  res.json({ success: true, data: { course } })
}

/** DELETE /api/v1/instructor/courses/:id — archives instead if it has students */
export const deleteCourse = async (req, res) => {
  const result = await courseService.deleteCourse(req.params.id, req.user)
  res.json({ success: true, data: result })
}

/** GET /api/v1/instructor/analytics — per-course completion/revenue stats */
export const getAnalytics = async (req, res) => {
  const analytics = await instructorService.getCourseAnalytics(req.user._id)
  res.json({ success: true, data: { analytics } })
}

/** GET /api/v1/instructor/revenue — monthly earnings + payout history */
export const getRevenue = async (req, res) => {
  const revenue = await instructorService.getRevenue(req.user)
  res.json({ success: true, data: revenue })
}

/** GET /api/v1/instructor/students — recent students across my courses */
export const getMyStudents = async (req, res) => {
  const students = await instructorService.getMyStudents(req.user._id)
  res.json({ success: true, data: { students } })
}
