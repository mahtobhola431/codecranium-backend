import * as adminService from '../services/admin.service.js'

/** GET /api/v1/admin/stats — platform headline numbers */
export const getStats = async (req, res) => {
  const stats = await adminService.getStats()
  res.json({ success: true, data: { stats } })
}

/** GET /api/v1/admin/analytics/revenue — last 12 months */
export const getMonthlyRevenue = async (req, res) => {
  const monthly = await adminService.getMonthlyRevenue()
  res.json({ success: true, data: { monthly } })
}

/** GET /api/v1/admin/students — query: q, status, plan, page, limit */
export const listStudents = async (req, res) => {
  const result = await adminService.listStudents(req.query)
  res.json({ success: true, data: result })
}

/** PATCH /api/v1/admin/students/:id — body: { status?, plan?, role? } */
export const updateStudent = async (req, res) => {
  const user = await adminService.updateStudent(req.params.id, req.body)
  res.json({ success: true, data: { user } })
}

/** GET /api/v1/admin/courses — every course, any status */
export const listAllCourses = async (req, res) => {
  const courses = await adminService.listAllCourses()
  res.json({ success: true, data: { courses } })
}

/** GET /api/v1/admin/comments?status=pending — moderation queue */
export const listComments = async (req, res) => {
  const comments = await adminService.listComments(req.query.status)
  res.json({ success: true, data: { comments } })
}

/** PATCH /api/v1/admin/comments/:id — body: { status: approved|rejected } */
export const moderateComment = async (req, res) => {
  const comment = await adminService.moderateComment(req.params.id, req.body.status)
  res.json({ success: true, data: { comment } })
}

/** GET /api/v1/admin/activity — recent platform events */
export const getActivityFeed = async (req, res) => {
  const activity = await adminService.getActivityFeed()
  res.json({ success: true, data: { activity } })
}
