/**
 * Conventions shared by every model.
 *
 *  - `timestamps` -> createdAt / updatedAt
 *  - `versionKey: false` -> no `__v`
 *  - JSON output maps `_id` -> `id` and never leaks `passwordHash`, so documents can be sent
 *    straight to the client and match the wire types in `@greenscore/types`.
 */

export function toJSONTransform(_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> {
  // Sub-documents declared with `_id: false` have no `_id`, so guard before mapping.
  if (ret._id !== undefined) {
    ret.id = String(ret._id);
    delete ret._id;
  }
  delete ret.passwordHash;
  return ret;
}

export const baseSchemaOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: { transform: toJSONTransform },
} as const;
