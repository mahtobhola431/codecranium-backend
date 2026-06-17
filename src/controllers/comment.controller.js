import * as commentService from '../services/comment.service.js'

/** POST /api/v1/comments — body: { courseId, lessonSlug, content, parentId? } */
export const createComment = async (req, res) => {
  const comment = await commentService.createComment(req.user, req.body)
  res.status(201).json({ success: true, data: { comment } })
}

/** POST /api/v1/comments/:id/like — toggles the requester's like */
export const toggleLike = async (req, res) => {
  const result = await commentService.toggleLike(req.user, req.params.id)
  res.json({ success: true, data: result })
}
