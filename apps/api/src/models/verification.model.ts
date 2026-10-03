import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import {
  CATEGORY_KEYS,
  PARAMETER_VERIFICATION_STATUSES,
  VERIFICATION_STATUSES,
} from '@greenscore/types';
import { baseSchemaOptions } from './_shared';
import { mlPredictedScoreSchema, preliminaryScoreSchema, scoreResultSchema } from './score.schemas';

/**
 * An admin's review of one assessment. It snapshots the scores the admin was shown
 * (preliminary + advisory ML) next to the score they decided on, so the decision stays
 * explainable even after the live Score document changes.
 *
 * `status`: UNDER_REVIEW while in progress, then VERIFIED or REJECTED.
 */
const parameterVerificationSchema = new Schema(
  {
    category: { type: String, enum: CATEGORY_KEYS, required: true },
    parameter: { type: String, required: true, maxlength: 80 },
    status: { type: String, enum: PARAMETER_VERIFICATION_STATUSES, required: true },
    note: { type: String, maxlength: 1000 },
    /** Value the admin confirmed, when it differs from what the owner submitted. */
    verifiedValue: { type: Schema.Types.Mixed },
    evidenceDocumentIds: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
  },
  { _id: false },
);

const verificationSchema = new Schema(
  {
    buildingId: { type: Schema.Types.ObjectId, ref: 'Building', required: true },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'BuildingAssessment', required: true },
    /** Admin display name. A plain string in the MVP (no accounts). */
    adminId: { type: String, required: true },
    status: { type: String, enum: VERIFICATION_STATUSES, required: true, default: 'UNDER_REVIEW' },
    parameterVerification: { type: [parameterVerificationSchema], default: [] },
    preliminaryScore: { type: preliminaryScoreSchema, default: null },
    mlPredictedScore: { type: mlPredictedScoreSchema, default: null },
    finalScore: { type: scoreResultSchema, default: null },
    reason: { type: String, maxlength: 2000, default: null },
  },
  baseSchemaOptions,
);

verificationSchema.index({ buildingId: 1, createdAt: -1 }); // review history of a building

export type VerificationDoc = HydratedDocument<InferSchemaType<typeof verificationSchema>>;
export const Verification = model('Verification', verificationSchema);
