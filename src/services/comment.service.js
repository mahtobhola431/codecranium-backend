import { Comment } from '../models/Comment.model.js'
import { Course } from '../models/Course.model.js'
import { Activity } from '../models/Activity.model.js'
import { ApiError } from '../utils/ApiError.js'

// Cheap spam heuristic — flagged comments go to the admin moderation queue
const SPAM_PATTERNS = [/https?:\/\//i, /\b(free|cheap|discount)\b.*\b(course|deal|offer)\b/i]
const looksLikeSpam = (content) => SPAM_PATTERNS.some((rx) => rx.test(content))

/** Approved comments for a lesson, threaded (replies nested under parents). */
export const getLessonComments = async (courseSlug, lessonSlug) => {
  const course = await Course.findOne({ slug: courseSlug })
  if (!course) throw new ApiError(404, 'Course not found')

  const comments = await Comment.find({
    course: course._id,
    lessonSlug,
    status: 'approved',
  })
    .sort({ createdAt: -1 })
    .populate('author', 'name avatar')

  const topLevel = comments.filter((c) => !c.parent)
  const replies = comments.filter((c) => c.parent)

  return topLevel.map((c) => ({
    ...c.toPublic(),
    replies: replies
      .filter((r) => r.parent.toString() === c._id.toString())
      .reverse() // oldest reply first, like a thread
      .map((r) => r.toPublic()),
  }))
}

export const createComment = async (user, { courseId, lessonSlug, content, parentId }) => {
  const course = await Course.findById(courseId)
  if (!course) throw new ApiError(404, 'Course not found')
  if (!course.findLessonBySlug(lessonSlug)) throw new ApiError(404, 'Lesson not found')

  if (parentId) {
    const parent = await Comment.findById(parentId)
    if (!parent) throw new ApiError(404, 'Parent comment not found')
    if (parent.parent) throw new ApiError(400, 'Replies can only be one level deep')
  }

  const flagged = looksLikeSpam(content)
  const comment = await Comment.create({
    course: course._id,
    lessonSlug,
    author: user._id,
    content,
    parent: parentId ?? null,
    status: flagged ? 'pending' : 'approved',
    flagReason: flagged ? 'Spam link detected' : '',
  })

  if (flagged) {
    Activity.log('flag', `Comment flagged in ${course.title}`, user._id)
  }

  await comment.populate('author', 'name avatar')
  return { ...comment.toPublic(), status: comment.status }
}

/** Toggle like — one like per user. */
export const toggleLike = async (user, commentId) => {
  const comment = await Comment.findById(commentId)
  if (!comment) throw new ApiError(404, 'Comment not found')

  const userId = user._id.toString()
  const liked = comment.likedBy.some((id) => id.toString() === userId)

  if (liked) comment.likedBy.pull(user._id)
  else comment.likedBy.push(user._id)
  await comment.save()

  return { id: comment._id.toString(), likes: comment.likedBy.length, liked: !liked }
}
