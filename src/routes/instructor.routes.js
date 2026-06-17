import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { protect } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import {
  createCourseSchema,
  updateCourseSchema,
  courseStatusSchema,
} from '../validators/course.validator.js'
import * as instructorController from '../controllers/instructor.controller.js'

const router = Router()

router.use(protect, requireRole('instructor', 'admin'))

router.get('/overview', asyncHandler(instructorController.getOverview))
router.get('/analytics', asyncHandler(instructorController.getAnalytics))
router.get('/revenue', asyncHandler(instructorController.getRevenue))
router.get('/students', asyncHandler(instructorController.getMyStudents))

router.get('/courses', asyncHandler(instructorController.getMyCourses))
router.post('/courses', validate(createCourseSchema), asyncHandler(instructorController.createCourse))
router.get('/courses/:id', asyncHandler(instructorController.getCourseForEdit))
router.patch('/courses/:id', validate(updateCourseSchema), asyncHandler(instructorController.updateCourse))
router.patch('/courses/:id/status', validate(courseStatusSchema), asyncHandler(instructorController.setCourseStatus))
router.delete('/courses/:id', asyncHandler(instructorController.deleteCourse))

export default router
