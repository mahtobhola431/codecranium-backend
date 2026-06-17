import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

/**
 * Signs a JWT with the user's id and role.
 * The frontend stores this token in localStorage under 'cc-auth-token'
 * and sends it as Authorization: Bearer <token>.
 */
export const signToken = (userId, role) =>
  jwt.sign({ id: userId, role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN })

/**
 * Verifies a token and returns the decoded payload.
 * Throws a JsonWebTokenError if invalid or expired.
 */
export const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET)