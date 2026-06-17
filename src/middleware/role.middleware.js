import { ApiError } from '../utils/ApiError.js'

/**
 * Restricts a route to specific roles.
 * Must be used AFTER the protect middleware (requires req.user).
 *
 * Usage:
 *   router.get('/admin/stats', protect, requireRole('admin'), asyncHandler(getStats))
 *   router.post('/courses', protect, requireRole('instructor', 'admin'), asyncHandler(createCourse))
 */
export const requireRole = (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, `Access denied — required role: ${roles.join(' or ')}`)
    }
    next()
  }