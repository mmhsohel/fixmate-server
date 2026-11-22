import { HttpError } from '../utils/errors.js';
import { isProd } from '../config/env.js';

export const notFound = (req, _res, next) =>
  next(new HttpError(404, `Route ${req.method} ${req.originalUrl} not found`));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  const status = err.status || (err.type === 'entity.too.large' ? 413 : 500);
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({
    success: false,
    message: status >= 500 && isProd ? 'Internal server error' : err.message,
    details: err.details,
  });
}
