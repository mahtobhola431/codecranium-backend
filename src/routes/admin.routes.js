import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { protect } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { adminUpdateStudentSchema } from '../validators/user.validator.js'
import { moderateCommentSchema } from '../validators/comment.validator.js'
import * as adminController from '../controllers/admin.controller.js'

const router = Router()

router.use(protect, requireRole('admin'))

router.get('/stats', asyncHandler(adminController.getStats))
router.get('/analytics/revenue', asyncHandler(adminController.getMonthlyRevenue))
router.get('/activity', asyncHandler(adminController.getActivityFeed))

router.get('/students', asyncHandler(adminController.listStudents))
router.patch('/students/:id', validate(adminUpdateStudentSchema), asyncHandler(adminController.updateStudent))

router.get('/courses', asyncHandler(adminController.listAllCourses))

router.get('/comments', asyncHandler(adminController.listComments))
router.patch('/comments/:id', validate(moderateCommentSchema), asyncHandler(adminController.moderateComment))

export default router
