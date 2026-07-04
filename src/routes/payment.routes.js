import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { protect } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { createOrderSchema, verifyPaymentSchema } from '../validators/payment.validator.js'
import * as paymentController from '../controllers/payment.controller.js'

const router = Router()

// Public — Razorpay calls this server-to-server, no bearer token to check
router.post('/webhook', asyncHandler(paymentController.webhook))

router.use(protect)

router.post('/orders', validate(createOrderSchema), asyncHandler(paymentController.createOrder))
router.post('/verify', validate(verifyPaymentSchema), asyncHandler(paymentController.verifyPayment))

export default router
