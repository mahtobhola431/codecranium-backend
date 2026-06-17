import { z } from 'zod'

export const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  avatar: z.string().trim().max(500).optional(),
  bio: z.string().trim().max(500).optional(),
  payoutAccount: z.string().trim().max(200).optional(),
})

// Admin: change a student's standing or plan
export const adminUpdateStudentSchema = z.object({
  status: z.enum(['active', 'inactive', 'banned']).optional(),
  plan: z.enum(['Free', 'Pro', 'Team']).optional(),
  role: z.enum(['learner', 'instructor', 'admin']).optional(),
})
