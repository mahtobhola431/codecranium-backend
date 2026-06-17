import { User } from '../models/User.model.js'
import { Activity } from '../models/Activity.model.js'
import { signToken } from '../utils/jwt.js'
import { ApiError } from '../utils/ApiError.js'

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
 * Returns the currently authenticated user.
 * req.user is attached by the protect middleware, this just shapes the response.
 */
export const getMe = async (userId) => {
  const user = await User.findById(userId)
  if (!user) throw new ApiError(404, 'User not found')
  return user.toPublic()
}