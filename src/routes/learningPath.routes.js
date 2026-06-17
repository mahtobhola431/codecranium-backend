import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import * as learningPathController from '../controllers/learningPath.controller.js'

const router = Router()

router.get('/', asyncHandler(learningPathController.listPaths))
router.get('/:slug', asyncHandler(learningPathController.getPath))

export default router
