import { z } from 'zod'

const CATEGORIES = ['javascript', 'react', 'python', 'typescript', 'nodejs', 'css', 'rust', 'go']
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']
const CODE_LANGUAGES = ['javascript', 'typescript', 'python', 'rust', 'go', 'bash']
const LESSON_TYPES = ['video', 'article', 'quiz', 'challenge']

const lessonSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Lesson slug can only contain lowercase letters, numbers and hyphens'),
  title: z.string().trim().min(2).max(120),
  duration: z.number().int().min(0).default(0),
  type: z.enum(LESSON_TYPES).default('article'),
  isPreview: z.boolean().default(false),
  codeLanguage: z.enum(CODE_LANGUAGES).optional(),
  content: z.string().max(100_000).optional(),
  starterCode: z.string().max(20_000).optional(),
})

const sectionSchema = z.object({
  title: z.string().trim().min(2).max(120),
  lessons: z.array(lessonSchema).default([]),
})

export const createCourseSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(300),
  longDescription: z.string().trim().max(5000).optional(),
  category: z.enum(CATEGORIES),
  difficulty: z.enum(DIFFICULTIES).default('beginner'),
  duration: z.number().int().min(0).default(0),
  price: z.number().min(0).max(1000).default(0),
  gradient: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().toLowerCase().max(30)).max(10).default([]),
  whatYouLearn: z.array(z.string().trim().max(200)).max(12).default([]),
  sections: z.array(sectionSchema).default([]),
  codeLanguage: z.enum(CODE_LANGUAGES).default('javascript'),
})

// Everything optional for PATCH — slug stays immutable once created
export const updateCourseSchema = createCourseSchema.partial().omit({ slug: true })

export const courseStatusSchema = z.object({
  status: z.enum(['published', 'draft', 'archived']),
})
