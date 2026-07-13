import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middleware/validate.middleware.js'
import { protect } from '../middleware/auth.middleware.js'
import { registerSchema, loginSchema, googleSchema } from '../validators/auth.validator.js'
import * as authController from '../controllers/auth.controller.js'

const router = Router()

// Public routes
router.post('/register', validate(registerSchema), asyncHandler(authController.register))
router.post('/login',    validate(loginSchema),    asyncHandler(authController.login))
// Google Sign-In — one route for both signup and login
router.post('/google',   validate(googleSchema),   asyncHandler(authController.google))

// Protected routes (require a valid JWT)
router.get('/me',     protect, asyncHandler(authController.getMe))
router.post('/logout', protect, asyncHandler(authController.logout))

export default router