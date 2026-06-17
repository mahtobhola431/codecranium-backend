import { verifyToken } from '../utils/jwt.js'
import { User } from '../models/User.model.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

/**
 * Protects routes that require authentication.
 *
 * Reads the token from:  Authorization: Bearer <token>
 * (This is exactly what the frontend's api.ts interceptor sends)
 *
 * On success: attaches { id, name, email, role, xp, streak } to req.user
 * On failure: throws 401
 */
export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Not authenticated — no token provided')
  }

  const token = authHeader.split(' ')[1]

  let decoded
  try {
    decoded = verifyToken(token)
  } catch (err) {
    // jwt.verify throws JsonWebTokenError or TokenExpiredError
    const message =
      err.name === 'TokenExpiredError' ? 'Token has expired, please sign in again' : 'Invalid token'
    throw new ApiError(401, message)
  }

  // Fetch the latest user from DB so stale tokens don't carry deleted/changed data
  const user = await User.findById(decoded.id).select('-password')
  if (!user) {
    throw new ApiError(401, 'User no longer exists')
  }

  if (user.status === 'banned') {
    throw new ApiError(403, 'This account has been suspended')
  }

  req.user = user
  next()
})

/**
 * Like protect, but doesn't fail when there's no token — used on public routes
 * (course detail, lessons) that show extra data to logged-in users.
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next()

  try {
    const decoded = verifyToken(authHeader.split(' ')[1])
    const user = await User.findById(decoded.id).select('-password')
    if (user && user.status !== 'banned') req.user = user
  } catch {
    // Invalid/expired token on a public route — just treat as anonymous
  }
  next()
})