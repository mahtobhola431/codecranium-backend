import { z } from 'zod'

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name cannot exceed 60 characters')
    .optional(), // frontend has name as optional — falls back to email prefix
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long'), // bcrypt silently truncates at 72 bytes
})

export const googleSchema = z.object({
  // The ID token (a JWT) handed to us by Google Identity Services on the client.
  // Everything inside it is verified server-side — we only check it's present.
  credential: z.string().min(1, 'Google credential is required'),
})

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
})