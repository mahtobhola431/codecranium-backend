import mongoose from 'mongoose'

/**
 * One document per Razorpay order attempt. Created in 'created' state when
 * the checkout order is opened, then flipped to 'paid'/'failed' once
 * verified (either by the client-side verify call or the webhook —
 * whichever arrives first; both paths are idempotent).
 */
const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    amount: { type: Number, required: true }, // in paise
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed'],
      default: 'created',
      index: true,
    },
  },
  { timestamps: true }
)

paymentSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    courseId: this.course.toString(),
    orderId: this.razorpayOrderId,
    amount: this.amount,
    currency: this.currency,
    status: this.status,
    createdAt: this.createdAt.toISOString(),
  }
}

export const Payment = mongoose.model('Payment', paymentSchema)
