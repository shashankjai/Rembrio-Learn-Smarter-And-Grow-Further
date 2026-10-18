import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../utils/token.js';

export async function getProfile(req, res) {
  res.json({ success: true, data: { user: req.user.toPublic() } });
}

export async function updateProfile(req, res) {
  const { name, email, currentPassword, newPassword } = req.valid.body;
  const user = req.user;
  const sensitive = (email && email !== user.email) || newPassword;

  if (sensitive) {
    if (!currentPassword) throw ApiError.badRequest('Enter your current password to change your email or password.');
    if (!(await user.checkPassword(currentPassword))) throw ApiError.unauthorized('Current password is incorrect.');
  }
  if (email && email !== user.email) {
    if (await User.exists({ email, _id: { $ne: user._id } })) throw ApiError.conflict('That email is already in use.');
    user.email = email;
  }
  if (name) user.name = name;

  let token;
  if (newPassword) {
    await user.setPassword(newPassword);
    user.tokenVersion += 1; // sign out every other session
    token = true;
  }
  await user.save();
  res.json({ success: true, data: { user: user.toPublic(), ...(token ? { token: signToken(user) } : {}) } });
}
