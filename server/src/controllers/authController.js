import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../utils/token.js';

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('rembrio-dummy-password', 12);

export async function register(req, res) {
  const { name, email, password } = req.valid.body;
  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists.');

  const user = new User({ name, email });
  await user.setPassword(password);
  await user.save();
  res.status(201).json({ success: true, data: { user: user.toPublic(), token: signToken(user) } });
}

export async function login(req, res) {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw ApiError.unauthorized('Invalid email or password.');
  res.json({ success: true, data: { user: user.toPublic(), token: signToken(user) } });
}

export async function me(req, res) {
  res.json({ success: true, data: { user: req.user.toPublic() } });
}

/** Bumping tokenVersion invalidates every JWT issued to this user (all devices). */
export async function logout(req, res) {
  req.user.tokenVersion += 1;
  await req.user.save();
  res.json({ success: true, data: { message: 'Signed out.' } });
}
