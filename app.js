import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { env } from './src/config/env.js'
import { errorHandler } from './src/middleware/error.middleware.js'

// Routes
import authRoutes from './src/routes/auth.routes.js'
import courseRoutes from './src/routes/course.routes.js'
import progressRoutes from './src/routes/progress.routes.js'
import commentRoutes from './src/routes/comment.routes.js'
import learningPathRoutes from './src/routes/learningPath.routes.js'
import userRoutes from './src/routes/user.routes.js'
import instructorRoutes from './src/routes/instructor.routes.js'
import adminRoutes from './src/routes/admin.routes.js'

const app = express()

// ─── Security ───────────────────────────────────────────────────────────────
app.use(helmet())

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
)

// Stricter rate limit for auth endpoints — prevents brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 attempts per window
  message: { success: false, message: 'Too many attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
})

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
})

// ─── Parsing & Logging ───────────────────────────────────────────────────────
// 2mb — course editors send full lesson content/markdown in one payload
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes)
app.use('/api/v1/courses', apiLimiter, courseRoutes)
app.use('/api/v1/enrollments', apiLimiter, progressRoutes)
app.use('/api/v1/comments', apiLimiter, commentRoutes)
app.use('/api/v1/learning-paths', apiLimiter, learningPathRoutes)
app.use('/api/v1/users', apiLimiter, userRoutes)
app.use('/api/v1/instructor', apiLimiter, instructorRoutes)
app.use('/api/v1/admin', apiLimiter, adminRoutes)

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', env: env.NODE_ENV }))

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
})

// ─── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler)

export default app