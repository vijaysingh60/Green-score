import { model, Schema, type HydratedDocument, type InferSchemaType, type MongooseQueryMiddleware } from 'mongoose';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '@greenscore/types';

/**
 * Append-only record of important changes (every score modification must create one).
 *
 *  - `changedBy` is the acting user, or null when the system acted (e.g. automatic scoring).
 *  - Entries are immutable: fields are `immutable`, and update/delete operations are blocked by
 *    hooks below. Write entries through `recordAudit()` (services/audit.service.ts).
 */
const auditLogSchema = new Schema(
  {
    entity: { type: String, enum: AUDIT_ENTITIES, required: true, immutable: true },
    entityId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true, immutable: true },
    previousValue: { type: Schema.Types.Mixed, default: null, immutable: true },
    newValue: { type: Schema.Types.Mixed, default: null, immutable: true },
    /** Admin display name, or null when the system acted. A plain string in the MVP (no accounts). */
    changedBy: { type: String, default: null, immutable: true },
    reason: { type: String, maxlength: 2000, default: null, immutable: true },
    timestamp: { type: Date, required: true, default: Date.now, immutable: true },
  },
  {
    versionKey: false,
    minimize: false,
    timestamps: false,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
      },
    },
  },
);

const BLOCKED_QUERY_OPS: MongooseQueryMiddleware[] = [
  'updateOne',
  'updateMany',
  'replaceOne',
  'findOneAndUpdate',
  'findOneAndReplace',
  'findOneAndDelete',
  'deleteOne',
  'deleteMany',
];

auditLogSchema.pre(BLOCKED_QUERY_OPS, function () {
  throw new Error('AuditLog is append-only: updates and deletes are not allowed');
});
auditLogSchema.pre('deleteOne', { document: true, query: false }, function () {
  throw new Error('AuditLog is append-only: updates and deletes are not allowed');
});
auditLogSchema.pre('save', function () {
  if (!this.isNew) throw new Error('AuditLog is append-only: existing entries cannot be modified');
});

// "History of this entity", newest first. Also serves entity-only and entity+id lookups.
auditLogSchema.index({ entity: 1, entityId: 1, timestamp: -1 });

export type AuditLogDoc = HydratedDocument<InferSchemaType<typeof auditLogSchema>>;
export const AuditLog = model('AuditLog', auditLogSchema);
