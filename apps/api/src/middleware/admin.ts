import type { RequestHandler } from 'express';
import { getEnv } from '../config/env';
import { ApiError } from '../utils/api-error';

/**
 * MVP admin gate: a shared demo passcode sent as `x-admin-passcode`.
 * This is NOT real authentication. It only keeps the verify action out of casual reach.
 */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  const passcode = req.header('x-admin-passcode');
  if (!passcode) throw ApiError.unauthenticated('Admin passcode required');
  if (passcode !== getEnv().ADMIN_PASSCODE) throw ApiError.forbidden('Incorrect admin passcode');
  next();
};
