import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File is too large. The maximum size is ${env.maxUploadMb} MB.`
        : `Upload error: ${err.message}`;
  } else if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  } else if (err.code === 11000) {
    status = 409;
    message = 'A record with these details already exists';
  }

  if (status >= 500) {
    // Log the server-side detail only; never leak internals to the client.
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err.message);
    if (env.isProd) message = 'Internal server error';
  }

  res.status(status).json({ success: false, error: { message, ...(details ? { details } : {}) } });
}
