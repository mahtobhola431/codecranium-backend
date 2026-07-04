import crypto from 'crypto'
import Razorpay from 'razorpay'
import { env } from '../config/env.js'
import { Course } from '../models/Course.model.js'
import { Enrollment } from '../models/Enrollment.model.js'
import { Payment } from '../models/Payment.model.js'
import { ApiError } from '../utils/ApiError.js'
import { createEnrollment } from './progress.service.js'

/**
 * Lazily constructed so the server can boot before Razorpay keys are
 * provisioned — only requests that actually touch payments fail, not startup.
 */
let razorpayClient = null
const getRazorpay = () => {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new ApiError(500, 'Razorpay is not configured on this server yet')
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
  }
  return razorpayClient
}

/** POST /payments/orders — body: { courseId }. Creates a Razorpay order for a paid course. */
export const createOrder = async (user, courseId) => {
  const course = await Course.findOne({ _id: courseId, status: 'published' })
  if (!course) throw new ApiError(404, 'Course not found')
  if (course.price <= 0) throw new ApiError(400, 'This course is free — enroll directly')

  const alreadyEnrolled = await Enrollment.exists({ user: user._id, course: course._id })
  if (alreadyEnrolled) throw new ApiError(409, 'Already enrolled in this course')

  const amountInPaise = Math.round(course.price * 100)
  const order = await getRazorpay().orders.create({
    amount: amountInPaise,
    currency: 'INR',
    // Razorpay caps receipt at 40 chars
    receipt: `crs_${course._id}_${Date.now()}`.slice(0, 40),
    notes: { courseId: course._id.toString(), userId: user._id.toString() },
  })

  await Payment.create({
    user: user._id,
    course: course._id,
    razorpayOrderId: order.id,
    amount: amountInPaise,
    currency: order.currency,
    status: 'created',
  })

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID,
    course: { id: course._id.toString(), title: course.title, price: course.price },
  }
}

/** Verifies the checkout.js callback signature — the standard Razorpay HMAC check. */
const isValidCheckoutSignature = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')
  return expected === razorpay_signature
}

/**
 * POST /payments/verify — called by the frontend right after Razorpay's
 * checkout modal succeeds. Verifies the signature, marks the Payment paid,
 * and creates the Enrollment. Idempotent: if the webhook already completed
 * this payment, we just return the existing enrollment state.
 */
export const verifyPayment = async (user, body) => {
  if (!env.RAZORPAY_KEY_SECRET) throw new ApiError(500, 'Razorpay is not configured on this server yet')

  const payment = await Payment.findOne({
    razorpayOrderId: body.razorpay_order_id,
    user: user._id,
  })
  if (!payment) throw new ApiError(404, 'Payment order not found')

  if (payment.status === 'paid') {
    const existing = await Enrollment.findOne({ user: user._id, course: payment.course })
    if (existing) {
      const course = await Course.findById(payment.course)
      return existing.toPublic(course.allLessons().length)
    }
  }

  if (!isValidCheckoutSignature(body)) {
    payment.status = 'failed'
    await payment.save()
    throw new ApiError(400, 'Payment verification failed — signature mismatch')
  }

  payment.status = 'paid'
  payment.razorpayPaymentId = body.razorpay_payment_id
  payment.razorpaySignature = body.razorpay_signature
  await payment.save()

  const course = await Course.findById(payment.course)
  return createEnrollment(user, course)
}

/** Verifies the raw-body HMAC Razorpay sends in the X-Razorpay-Signature header. */
const isValidWebhookSignature = (rawBody, signature) => {
  if (!env.RAZORPAY_WEBHOOK_SECRET || !signature) return false
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')
  return expected === signature
}

/**
 * POST /payments/webhook — Razorpay's server-to-server callback. This is the
 * source of truth if the client never called /verify (browser closed,
 * network drop mid-checkout, etc). Handles payment.captured only; other
 * events are acknowledged and ignored.
 */
export const handleWebhook = async (rawBody, signature) => {
  if (!isValidWebhookSignature(rawBody, signature)) {
    throw new ApiError(400, 'Invalid webhook signature')
  }

  const event = JSON.parse(rawBody.toString('utf8'))
  if (event.event !== 'payment.captured') return { ignored: true }

  const orderId = event.payload?.payment?.entity?.order_id
  const paymentId = event.payload?.payment?.entity?.id
  if (!orderId) return { ignored: true }

  const payment = await Payment.findOne({ razorpayOrderId: orderId }).populate('user')
  if (!payment || payment.status === 'paid') return { ignored: true }

  payment.status = 'paid'
  payment.razorpayPaymentId = paymentId
  await payment.save()

  const course = await Course.findById(payment.course)
  const alreadyEnrolled = await Enrollment.exists({ user: payment.user._id, course: course._id })
  if (!alreadyEnrolled) {
    await createEnrollment(payment.user, course)
  }

  return { processed: true }
}
