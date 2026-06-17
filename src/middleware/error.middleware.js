import { env } from '../config/env.js'

/**
 * Global error handler — must be the LAST app.use() in app.js.
 * Express recognises it as an error handler because it has 4 arguments.
 *
 * Handles:
 *  - ApiError (our custom class, known statusCode)
 *  - Mongoose ValidationError (400)
 *  - Mongoose CastError — bad ObjectId (400)
 *  - Mongoose duplicate key (409)
 *  - JWT errors caught elsewhere, forwarded as ApiError
 *  - Everything else → 500
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500
  let message = err.message || 'Something went wrong'

  // Mongoose: field failed schema validation
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ')
  }

  // Mongoose: invalid ObjectId (e.g. /users/not-an-id)
  if (err.name === 'CastError') {
    statusCode = 400
    message = `Invalid ${err.path}: ${err.value}`
  }

  // Mongoose: duplicate unique field (e.g. email already registered)
  if (err.code === 11000) {
    statusCode = 409
    const field = Object.keys(err.keyValue)[0]
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} is already in use`
  }

  // Never leak stack traces in production
  const response = { success: false, message }
  if (env.NODE_ENV === 'development') {
    response.stack = err.stack
  }

  res.status(statusCode).json(response)
}