import { HttpError } from '../utils/errors.js';

export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(new HttpError(400, details[0]?.message || 'Invalid input', details));
  }
  req.body = result.data;
  next();
};
