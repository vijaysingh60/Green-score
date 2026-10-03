import { isValidObjectId, Types } from 'mongoose';
import { ApiError } from './api-error';

/** Parse a path param into an ObjectId. A malformed id is reported as "not found". */
export function parseObjectId(value: string | undefined, label = 'Resource'): Types.ObjectId {
  if (!value || !isValidObjectId(value) || value.length !== 24) {
    throw ApiError.notFound(`${label} not found`);
  }
  return new Types.ObjectId(value);
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
