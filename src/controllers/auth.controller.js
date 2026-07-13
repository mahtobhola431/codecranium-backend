import * as authService from '../services/auth.service.js'

/**
 * POST /api/v1/auth/register
 * Body: { name?, email, password }
 *
 * Response:
 *   201 { success: true, data: { user, token } }
 *
 * The frontend's handleSubmit calls authStore.login(user, token) with this.
 */
export const register = async (req, res) => {
  const result = await authService.register(req.body)
  res.status(201).json({ success: true, data: result })
}

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 *
 * Response:
 *   200 { success: true, data: { user, token } }
 */
export const login = async (req, res) => {
  const result = await authService.login(req.body)
  res.status(200).json({ success: true, data: result })
}

/**
 * POST /api/v1/auth/google
 * Body: { credential }  — the ID token from the Google Identity Services button
 *
 * Response:
 *   200 { success: true, data: { user, token } }
 *
 * Handles both sign-up and sign-in: if the Google account is new we create the
 * user, otherwise we sign the existing one in. Same { user, token } shape as
 * /login, so the frontend calls authStore.login(user, token) either way.
 */
export const google = async (req, res) => {
  const result = await authService.googleAuth(req.body)
  res.status(200).json({ success: true, data: result })
}

/**
 * GET /api/v1/auth/me
 * Headers: Authorization: Bearer <token>
 *
 * Response:
 *   200 { success: true, data: { user } }
 *
 * Used on app startup to re-hydrate the auth store from a persisted token.
 */
export const getMe = async (req, res) => {
  const user = await authService.getMe(req.user._id)
  res.status(200).json({ success: true, data: { user } })
}

/**
 * POST /api/v1/auth/logout
 * (Stateless JWT — just a signal for the client to clear its store)
 *
 * Response:
 *   200 { success: true, message: 'Logged out successfully' }
 */
export const logout = (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' })
}