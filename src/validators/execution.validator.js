import { z } from 'zod'

export const executeSchema = z.object({
  language: z.enum(['javascript', 'typescript', 'python', 'rust', 'go', 'bash']),
  code: z.string().min(1, 'Code is required').max(20000, 'Code is too long (max 20,000 characters)'),
  stdin: z.string().max(5000).optional(),
})
