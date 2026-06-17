import * as userService from '../services/user.service.js'

/** PATCH /api/v1/users/me — body: { name?, avatar?, bio?, payoutAccount? } */
export const updateMe = async (req, res) => {
  const user = await userService.updateMe(req.user._id, req.body)
  res.json({ success: true, data: { user } })
}
