import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { USER_ROLES } from '@greenscore/types';
import { baseSchemaOptions } from './_shared';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    /** bcrypt hash. Never stored or logged as plain text. Excluded from queries by default. */
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, required: true, default: 'USER' },
  },
  baseSchemaOptions,
);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const User = model('User', userSchema);
