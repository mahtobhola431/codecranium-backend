import mongoose from 'mongoose'

/**
 * Monthly instructor payouts — backs the instructor revenue page
 * (PAYOUT_HISTORY shape: { id, month, amount, status, paidOn }).
 */
const payoutSchema = new mongoose.Schema(
  {
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    month: { type: String, required: true }, // e.g. "2025-05"
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paidOn: { type: Date, default: null },
  },
  { timestamps: true }
)

payoutSchema.index({ instructor: 1, month: 1 }, { unique: true })

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

payoutSchema.methods.toPublic = function () {
  const [year, month] = this.month.split('-')
  return {
    id: this._id.toString(),
    month: `${MONTH_LABELS[Number(month) - 1]} ${year}`,
    amount: this.amount,
    status: this.status,
    paidOn: this.paidOn ? this.paidOn.toISOString().slice(0, 10) : null,
  }
}

export const Payout = mongoose.model('Payout', payoutSchema)
