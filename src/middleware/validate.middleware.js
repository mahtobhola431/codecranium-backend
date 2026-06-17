/**
 * Middleware factory that validates req.body against a Zod schema.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), asyncHandler(register))
 *
 * On failure returns:
 *   400 { success: false, message: "Validation failed", errors: [{ field, message }] }
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    })
  }

  // Replace req.body with the parsed (coerced + trimmed) data
  req.body = result.data
  next()
}