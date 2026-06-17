import * as progressService from '../services/progress.service.js'

/** GET /api/v1/enrollments — my enrollments with progress + course cards */
export const getMyEnrollments = async (req, res) => {
  const enrollments = await progressService.getMyEnrollments(req.user._id)
  res.json({ success: true, data: { enrollments } })
}

/** POST /api/v1/enrollments — body: { courseId } */
export const enroll = async (req, res) => {
  const enrollment = await progressService.enroll(req.user, req.body.courseId)
  res.status(201).json({ success: true, data: { enrollment } })
}

/**
 * POST /api/v1/enrollments/:courseId/complete-lesson — body: { lessonId, lessonSlug? }
 * Returns updated enrollment, XP awarded, fresh user (xp/streak), and a
 * certificate when this completes the course.
 */
export const completeLesson = async (req, res) => {
  const result = await progressService.completeLesson(req.user, req.params.courseId, req.body)
  res.json({ success: true, data: result })
}

/** GET /api/v1/me/dashboard — everything the learner dashboard needs */
export const getDashboard = async (req, res) => {
  const dashboard = await progressService.getDashboard(req.user)
  res.json({ success: true, data: dashboard })
}

/** GET /api/v1/certificates */
export const getMyCertificates = async (req, res) => {
  const certificates = await progressService.getMyCertificates(req.user._id)
  res.json({ success: true, data: { certificates } })
}
