import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { ApiError } from '../utils/api-error';
import { logger } from '../utils/logger';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.path}`));
};

/** Turns any thrown error into the standard `{ error: { code, message, details? } }` envelope. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  let apiError: ApiError;
  if (err instanceof ApiError) {
    apiError = err;
  } else if (err instanceof ZodError) {
    apiError = ApiError.validation(
      'Request validation failed',
      err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  } else if (err instanceof mongoose.Error.ValidationError) {
    apiError = ApiError.validation(
      'Data validation failed',
      Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    );
  } else if (err instanceof mongoose.Error.CastError) {
    apiError = ApiError.badRequest(`Invalid value for ${err.path}`);
  } else if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    apiError = ApiError.conflict('A record with the same unique value already exists');
  } else if (
    typeof err === 'object' &&
    err !== null &&
    (err as { type?: string }).type === 'entity.parse.failed'
  ) {
    apiError = ApiError.badRequest('Request body is not valid JSON');
  } else {
    logger.error('Unhandled error', err);
    apiError = new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong');
  }

  res.status(apiError.status).json({
    error: { code: apiError.code, message: apiError.message, details: apiError.details },
  });
};
