import { z } from 'zod'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')

export const createCommentSchema = z.object({
  courseId: objectId,
  lessonSlug: z.string().trim().min(1, 'lessonSlug is required'),
  content: z.string().trim().min(1, 'Comment cannot be empty').max(2000),
  parentId: objectId.optional(),
})

export const moderateCommentSchema = z.object({
  status: z.enum(['approved', 'rejected']),
})
