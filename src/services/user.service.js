import { User } from '../models/User.model.js'
import { ApiError } from '../utils/ApiError.js'

/** Update the authenticated user's own profile. */
export const updateMe = async (userId, updates) => {
  const user = await User.findById(userId)
  if (!user) throw new ApiError(404, 'User not found')

  // payoutAccount only makes sense for instructors
  if (updates.payoutAccount !== undefined && user.role !== 'instructor') {
    delete updates.payoutAccount
  }

  Object.assign(user, updates)
  await user.save()
  return user.toPublic()
}
