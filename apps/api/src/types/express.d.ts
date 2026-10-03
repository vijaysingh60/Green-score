import type { AuthUser } from '@greenscore/types';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by `authenticate` / `optionalAuthenticate`. */
    user?: AuthUser;
  }
}
