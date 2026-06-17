import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { optionalAuth } from '../middleware/auth.middleware.js'
import * as courseController from '../controllers/course.controller.js'

const router = Router()

// Public catalog — optionalAuth lets owners/admins see their drafts
// and enrolled learners access full lessons
router.get('/', asyncHandler(courseController.listCourses))
router.get('/:slug', optionalAuth, asyncHandler(courseController.getCourse))
router.get('/:slug/lessons/:lessonSlug', optionalAuth, asyncHandler(courseController.getLesson))
router.get('/:slug/lessons/:lessonSlug/comments', asyncHandler(courseController.getLessonComments))

export default router
