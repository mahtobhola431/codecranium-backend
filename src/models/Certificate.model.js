import mongoose from 'mongoose'

/**
 * Issued automatically when a learner completes every lesson in a course.
 * Matches the frontend Certificate interface.
 */
const certificateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    courseTitle: { type: String, required: true }, // denormalised — survives course edits
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

certificateSchema.index({ user: 1, course: 1 }, { unique: true })

certificateSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    courseId: this.course._id ? this.course._id.toString() : this.course.toString(),
    courseTitle: this.courseTitle,
    issuedAt: this.issuedAt.toISOString(),
  }
}

export const Certificate = mongoose.model('Certificate', certificateSchema)
