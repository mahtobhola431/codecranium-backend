import { LearningPath } from '../models/LearningPath.model.js'
import { ApiError } from '../utils/ApiError.js'

export const listPaths = async () => {
  const paths = await LearningPath.find().sort({ createdAt: 1 })
  return paths.map((p) => p.toPublic())
}

/** Path detail including the full course cards (for the path page). */
export const getPathBySlug = async (slug) => {
  const path = await LearningPath.findOne({ slug }).populate({
    path: 'courses',
    match: { status: 'published' },
    populate: { path: 'instructor', select: 'name avatar bio' },
  })
  if (!path) throw new ApiError(404, 'Learning path not found')

  return {
    ...path.toPublic(),
    courses: path.courses.map((c) => c.toCard()),
  }
}
