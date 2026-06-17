import mongoose from 'mongoose'

/**
 * Lightweight platform event log — feeds the admin dashboard activity feed
 * (ACTIVITY_FEED shape: { id, type, text, time }).
 */
const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['signup', 'upgrade', 'enroll', 'complete', 'flag'],
      required: true,
    },
    text: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

activitySchema.index({ createdAt: -1 })

activitySchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    type: this.type,
    text: this.text,
    time: this.createdAt.toISOString(),
  }
}

/** Fire-and-forget logger — activity logging must never break the main flow. */
activitySchema.statics.log = function (type, text, userId = null) {
  return this.create({ type, text, user: userId }).catch((err) =>
    console.error('Activity log failed:', err.message)
  )
}

export const Activity = mongoose.model('Activity', activitySchema)
