/**
 * Wraps an async controller so any thrown error is forwarded to
 * Express's global error handler via next(err).
 *
 * Usage:
 *   router.post('/login', asyncHandler(authController.login))
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)