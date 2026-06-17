import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { protect } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { updateMeSchema } from '../validators/user.validator.js'
import * as userController from '../controllers/user.controller.js'
import * as progressController from '../controllers/progress.controller.js'

const router = Router()

router.use(protect)

router.patch('/me', validate(updateMeSchema), asyncHandler(userController.updateMe))
router.get('/me/dashboard', asyncHandler(progressController.getDashboard))
router.get('/me/certificates', asyncHandler(progressController.getMyCertificates))

export default router
