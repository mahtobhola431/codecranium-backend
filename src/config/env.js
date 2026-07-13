import { z } from 'zod'

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string({ required_error: 'MONGODB_URI is required' }),
  JWT_SECRET: z.string({ required_error: 'JWT_SECRET is required' }).min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().default('https://codecranium-frontend.vercel.app'),

  // Razorpay — optional so the server still boots before keys are provisioned;
  // payment routes throw a clear error at request time if these are missing.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Judge0 — public code-execution API, no key required (community demo instance)
  JUDGE0_API_URL: z.string().default('https://ce.judge0.com'),

  // Google Sign-In — optional so the server still boots before the OAuth client
  // is provisioned; /auth/google throws a clear error at request time if missing.
  // This must be the same client ID the frontend renders its button with.
  GOOGLE_CLIENT_ID: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌  Invalid environment variables:')
  parsed.error.issues.forEach((issue) => {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`)
  })
  process.exit(1)
}

export const env = parsed.data