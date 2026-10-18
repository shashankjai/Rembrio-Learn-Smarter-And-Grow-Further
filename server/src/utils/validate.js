import mongoose from 'mongoose';
import { ApiError } from './ApiError.js';

/** Validate req[source] with a zod schema and replace it with the parsed value. */
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(ApiError.badRequest(details[0]?.message || 'Invalid request', details));
    }
    // Express 5 makes req.query read-only, so store parsed values separately.
    req.valid = { ...(req.valid || {}), [source]: result.data };
    next();
  };

export const isObjectId = (value) => typeof value === 'string' && mongoose.isValidObjectId(value);

/** Reject malformed :id params with 404 so ids never reach Mongoose casting. */
export const validateObjectIdParam =
  (name = 'id') =>
  (req, _res, next) => {
    if (!isObjectId(req.params[name])) return next(ApiError.notFound());
    next();
  };
