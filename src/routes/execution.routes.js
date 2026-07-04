import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { protect } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { executeSchema } from '../validators/execution.validator.js'
import * as executionController from '../controllers/execution.controller.js'

const router = Router()

router.use(protect) // logged-in learners only — the public Piston instance has tight rate limits
router.post('/', validate(executeSchema), asyncHandler(executionController.execute))

export default router
