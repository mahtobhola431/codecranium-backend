import mongoose from 'mongoose'

/**
 * Curated course sequences — matches the frontend LearningPath interface.
 */
const learningPathSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, maxlength: 300 },
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    totalHours: { type: Number, default: 0 },
    icon: { type: String, default: '🚀' },
    gradient: { type: String, default: 'from-blue-500 to-violet-500' },
  },
  { timestamps: true }
)

learningPathSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    slug: this.slug,
    title: this.title,
    description: this.description,
    // Frontend expects courseIds: string[] — works whether or not courses are populated
    courseIds: this.courses.map((c) => (c._id ? c._id.toString() : c.toString())),
    difficulty: this.difficulty,
    totalHours: this.totalHours,
    icon: this.icon,
    gradient: this.gradient,
  }
}

export const LearningPath = mongoose.model('LearningPath', learningPathSchema)
