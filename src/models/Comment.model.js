import mongoose from 'mongoose'

/**
 * Lesson discussion comments.
 * Public shape matches the frontend Comment interface; moderation fields
 * (status, flagReason) back the admin ModComment view.
 */
const commentSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    lessonSlug: { type: String, required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: {
      type: String,
      required: [true, 'Comment cannot be empty'],
      trim: true,
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    // Top-level comments have parent: null; replies point at their parent
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Moderation — new comments are auto-approved unless flagged by the spam heuristic
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
      index: true,
    },
    flagReason: { type: String, default: '' },
  },
  { timestamps: true }
)

/** Public shape (author must be populated). Replies are attached by the service. */
commentSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    author: this.author?.name ?? 'Unknown User',
    avatar: this.author?.avatar ?? '',
    content: this.content,
    createdAt: this.createdAt.toISOString(),
    likes: this.likedBy.length,
  }
}

/** Admin moderation shape — matches the frontend ModComment interface. */
commentSchema.methods.toModeration = function () {
  return {
    id: this._id.toString(),
    author: this.author?.name ?? 'Unknown User',
    email: this.author?.email ?? '',
    courseTitle: this.course?.title ?? '',
    lessonTitle: this.lessonSlug,
    content: this.content,
    postedAt: this.createdAt.toISOString(),
    status: this.status,
    ...(this.flagReason ? { flagReason: this.flagReason } : {}),
  }
}

export const Comment = mongoose.model('Comment', commentSchema)
