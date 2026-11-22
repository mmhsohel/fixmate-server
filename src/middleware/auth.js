import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { usersCol } from '../config/db.js';
import { HttpError, asyncHandler } from '../utils/errors.js';

/**
 * Verifies the short-lived JWT minted by the Next.js app (/api/token) from a valid BetterAuth session.
 * The role is always re-read from the database so role changes apply immediately.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { issuer: 'fixmate' });
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
  const user = await usersCol().findOne({ email: payload.email });
  if (!user) throw new HttpError(401, 'User not found');

  req.user = {
    id: String(user._id),
    name: user.name,
    email: user.email,
    image: user.image || null,
    role: user.role || 'customer',
  };
  next();
});

export const requireRole =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user?.role) ? next() : next(new HttpError(403, 'You are not allowed to do this'));
