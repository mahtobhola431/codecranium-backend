import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { protect } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { createCommentSchema } from '../validators/comment.validator.js'
import * as commentController from '../controllers/comment.controller.js'

const router = Router()

router.use(protect)

router.post('/', validate(createCommentSchema), asyncHandler(commentController.createComment))
router.post('/:id/like', asyncHandler(commentController.toggleLike))

export default router
