import { OAuth2Client } from 'google-auth-library'
import { User } from '../models/User.model.js'
import { Activity } from '../models/Activity.model.js'
import { signToken } from '../utils/jwt.js'
import { ApiError } from '../utils/ApiError.js'
import { env } from '../config/env.js'

// Lazily constructed so the server still boots without a Google client ID —
// same pattern as getRazorpay() in payment.service.js
let googleClient = null
const getGoogleClient = () => {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new ApiError(500, 'Google Sign-In is not configured on this server yet')
  }
  if (!googleClient) googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID)
  return googleClient
}

/**
 * Registers a new learner account.
 *
 * - If name is omitted (matches frontend behaviour), derive it from the email prefix
 * - Returns { user, token } shaped for the frontend's authStore.login(user, token)
 */
export const register = async ({ name, email, password }) => {
  // Derive name from email prefix if not provided — mirrors frontend behaviour
  const resolvedName = name?.trim() || email.split('@')[0]

  // Check for existing account manually for a clearer error message
  // (Mongoose duplicate key error is also caught by the global handler but this is cleaner)
  const existing = await User.findOne({ email })
  if (existing) {
    throw new ApiError(409, 'An account with that email already exists')
  }

  const user = await User.create({
    name: resolvedName,
    email,
    password, // hashed by the pre-save hook in User.model.js
    role: 'learner',
  })

  const token = signToken(user._id, user.role)

  Activity.log('signup', `${user.name} signed up (${user.plan} plan)`, user._id)

  return {
    user: user.toPublic(), // { id, name, email, avatar, xp, streak, joinedAt }
    token,
  }
}

/**
 * Logs in with email + password.
 *
 * - Uses .select('+password') to explicitly fetch the hashed password
 *   (it's select:false on the schema so it's never returned by default)
 * - Calls user.comparePassword() which runs bcrypt.compare internally
 */
export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password')

  // Deliberately vague error — don't reveal whether email or password is wrong
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password')
  }

  if (user.status === 'banned') {
    throw new ApiError(403, 'This account has been suspended')
  }

  const token = signToken(user._id, user.role)

  return {
    user: user.toPublic(),
    token,
  }
}

/**
 * Signs in (or signs up) with a Google ID token from the frontend's
 * Google Identity Services button. One endpoint serves both — Google is the
 * source of truth for the email, so there's no separate "register" step.
 *
 * The credential is a JWT signed by Google. verifyIdToken() checks the
 * signature against Google's public keys, the expiry, the issuer, and — the
 * load-bearing part — that `aud` equals our own client ID. Without the audience
 * check, an ID token minted for any *other* Google app would be accepted here.
 */
export const googleAuth = async ({ credential }) => {
  let payload
  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    })
    payload = ticket.getPayload()
  } catch (err) {
    if (err instanceof ApiError) throw err // "not configured"
    throw new ApiError(401, 'Google sign-in failed. Please try again.')
  }

  const { sub: googleId, email, email_verified: emailVerified, name, picture } = payload

  // Google can issue tokens for unverified addresses; trusting one would let
  // someone claim an email they don't own (and take over a local account below).
  if (!email || !emailVerified) {
    throw new ApiError(401, 'Your Google account does not have a verified email address')
  }

  const normalizedEmail = email.toLowerCase()
  let isNewUser = false

  // 1. Returning Google user — match on the stable subject ID, not the email
  //    (Google emails can change; `sub` never does).
  let user = await User.findOne({ googleId })

  if (!user) {
    // 2. Existing local account with the same email — link the two rather than
    //    failing on the unique-email index. Safe because Google has verified
    //    ownership of this address. They keep their password and can still use it.
    user = await User.findOne({ email: normalizedEmail })

    if (user) {
      user.googleId = googleId
      if (!user.avatar && picture) user.avatar = picture
      await user.save()
    } else {
      // 3. Brand new user — no password, authProvider marks them passwordless.
      user = await User.create({
        name: name?.trim() || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        googleId,
        authProvider: 'google',
        avatar: picture || '',
        role: 'learner',
      })
      isNewUser = true
    }
  }

  if (user.status === 'banned') {
    throw new ApiError(403, 'This account has been suspended')
  }

  const token = signToken(user._id, user.role)

  if (isNewUser) {
    Activity.log('signup', `${user.name} signed up with Google (${user.plan} plan)`, user._id)
  }

  return { user: user.toPublic(), token }
}

/**
 * Returns the currently authenticated user.
 * req.user is attached by the protect middleware, this just shapes the response.
 */
export const getMe = async (userId) => {
  const user = await User.findById(userId)
  if (!user) throw new ApiError(404, 'User not found')
  return user.toPublic()
}