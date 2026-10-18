import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/** tokenVersion lets us invalidate every outstanding token on logout / password change. */
export function signToken(user) {
  return jwt.sign({ sub: String(user._id), tv: user.tokenVersion ?? 0 }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
