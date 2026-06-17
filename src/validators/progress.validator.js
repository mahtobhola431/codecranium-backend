import { z } from 'zod'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')

export const enrollSchema = z.object({
  courseId: objectId,
})

export const completeLessonSchema = z.object({
  lessonId: z.string().trim().min(1, 'lessonId is required'),
  lessonSlug: z.string().trim().optional(), // updates "continue where you left off"
})
