import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/token.js';
import { User } from '../models/User.js';

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized();

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid or expired session. Please sign in again.');
    }

    const user = await User.findById(payload.sub);
    if (!user || (user.tokenVersion ?? 0) !== payload.tv) {
      throw ApiError.unauthorized('Session is no longer valid. Please sign in again.');
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
