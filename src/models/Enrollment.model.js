import mongoose from 'mongoose'

/**
 * One document per (user, course) pair.
 * Backs the frontend's EnrolledCourse interface + progressStore:
 *   { courseId, progress, lastLessonSlug, startedAt }
 */
const enrollmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    // Embedded lesson _ids (as strings) that the user finished
    completedLessons: [{ type: String }],
    lastLessonSlug: { type: String, default: '' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

// A user can only enroll once per course
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true })

/**
 * Shape for the frontend. `totalLessons` comes from the (populated or passed)
 * course so progress is always derived, never stale.
 */
enrollmentSchema.methods.toPublic = function (totalLessons) {
  const completed = this.completedLessons.length
  const progress =
    totalLessons > 0 ? Math.min(100, Math.round((completed / totalLessons) * 100)) : 0
  return {
    courseId: this.course._id ? this.course._id.toString() : this.course.toString(),
    progress,
    completedLessons: this.completedLessons,
    lastLessonSlug: this.lastLessonSlug,
    startedAt: this.startedAt.toISOString(),
    completedAt: this.completedAt ? this.completedAt.toISOString() : null,
  }
}

export const Enrollment = mongoose.model('Enrollment', enrollmentSchema)
