import * as paymentService from '../services/payment.service.js'

/** POST /api/v1/payments/orders — body: { courseId } */
export const createOrder = async (req, res) => {
  const order = await paymentService.createOrder(req.user, req.body.courseId)
  res.status(201).json({ success: true, data: order })
}

/** POST /api/v1/payments/verify — body: razorpay_order_id/payment_id/signature */
export const verifyPayment = async (req, res) => {
  const enrollment = await paymentService.verifyPayment(req.user, req.body)
  res.json({ success: true, data: { enrollment } })
}

/** POST /api/v1/payments/webhook — server-to-server, no user auth */
export const webhook = async (req, res) => {
  const result = await paymentService.handleWebhook(req.rawBody, req.headers['x-razorpay-signature'])
  res.json({ success: true, data: result })
}
