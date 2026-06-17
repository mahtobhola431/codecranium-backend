import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { protect } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { enrollSchema, completeLessonSchema } from '../validators/progress.validator.js'
import * as progressController from '../controllers/progress.controller.js'

const router = Router()

router.use(protect) // everything below requires auth

router.get('/', asyncHandler(progressController.getMyEnrollments))
router.post('/', validate(enrollSchema), asyncHandler(progressController.enroll))
router.post(
  '/:courseId/complete-lesson',
  validate(completeLessonSchema),
  asyncHandler(progressController.completeLesson)
)

export default router
