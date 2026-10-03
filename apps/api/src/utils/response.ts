import type { Response } from 'express';
import type { ApiSuccess } from '@greenscore/types';

/** Every successful JSON response goes through here so the `{ data, meta? }` envelope stays uniform. */
export function sendData<T, M = Record<string, unknown>>(
  res: Response,
  data: T,
  options: { status?: number; meta?: M } = {},
): void {
  const body: ApiSuccess<T, M> = options.meta ? { data, meta: options.meta } : { data };
  res.status(options.status ?? 200).json(body);
}
