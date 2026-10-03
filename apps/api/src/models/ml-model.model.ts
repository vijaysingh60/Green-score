import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { ML_MODEL_STATUSES } from '@greenscore/types';
import { baseSchemaOptions } from './_shared';

/**
 * Registry of trained models.
 *
 * Lifecycle: TRAINING -> AWAITING_APPROVAL -> ACTIVE | REJECTED, later ARCHIVED.
 * A newly trained model must NEVER become active on its own. Two guards enforce this:
 *   1. an ACTIVE model must carry `approvedBy` + `approvedAt` (validate hook), and
 *   2. at most one model can be ACTIVE (partial unique index).
 */
const mlModelSchema = new Schema(
  {
    version: { type: String, required: true, unique: true, trim: true },
    algorithm: { type: String, required: true, trim: true },
    datasetSize: { type: Number, required: true, min: 0, default: 0 },
    mae: { type: Number, min: 0, default: null },
    rmse: { type: Number, min: 0, default: null },
    r2: { type: Number, default: null },
    status: { type: String, enum: ML_MODEL_STATUSES, required: true, default: 'TRAINING' },
    modelPath: { type: String, required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
  },
  baseSchemaOptions,
);

mlModelSchema.pre('validate', function () {
  const mlModel = this as MLModelDoc;
  if (mlModel.status === 'ACTIVE' && (!mlModel.approvedBy || !mlModel.approvedAt)) {
    mlModel.invalidate('status', 'A model can only be ACTIVE after an admin approved it (approvedBy + approvedAt)');
  }
});

// Only one ACTIVE model at a time.
mlModelSchema.index(
  { status: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' }, name: 'one_active_model' },
);

export type MLModelDoc = HydratedDocument<InferSchemaType<typeof mlModelSchema>>;
export const MLModelRecord = model('MLModel', mlModelSchema);
