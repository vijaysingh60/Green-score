import { Schema } from 'mongoose';
import { CATEGORY_KEYS, VERIFICATION_STATUSES } from '@greenscore/types';

/**
 * Sub-schemas for the four SEPARATE score slots (and the snapshots verification records keep).
 * They are deliberately distinct schemas: no slot is ever computed from, or copied into, another.
 */

const categoryFields = (required: boolean) =>
  Object.fromEntries(
    CATEGORY_KEYS.map((key) => [key, { type: Number, min: 0, required }]),
  );

/** Points per category. `required` for full scores, relaxed for partial ML breakdowns. */
export const breakdownSchema = new Schema(categoryFields(true), { _id: false });
export const partialBreakdownSchema = new Schema(categoryFields(false), { _id: false });

const total = { type: Number, required: true, min: 0, max: 100 } as const;

/** 1. Rule-based, calculated automatically from an assessment. */
export const preliminaryScoreSchema = new Schema(
  {
    totalScore: total,
    breakdown: { type: breakdownSchema, required: true },
    methodologyVersion: { type: String, required: true },
    unscoredParameters: { type: [String], default: [] },
    calculatedAt: { type: Date, required: true },
  },
  { _id: false },
);

/** 2. ML output. Advisory only. */
export const mlPredictedScoreSchema = new Schema(
  {
    totalScore: total,
    breakdown: { type: partialBreakdownSchema },
    modelVersion: { type: String, required: true },
    predictionId: { type: Schema.Types.ObjectId, ref: 'MLPrediction' },
    predictedAt: { type: Date, required: true },
  },
  { _id: false },
);

/** 3. "What if" scenario result. */
export const projectedScoreSchema = new Schema(
  {
    totalScore: total,
    breakdown: { type: breakdownSchema, required: true },
    methodologyVersion: { type: String, required: true },
    scenario: {
      name: { type: String, required: true, maxlength: 120 },
      description: { type: String, maxlength: 500 },
      /** Parameter overrides, same shape as an assessment's `parameters`. */
      changes: { type: Schema.Types.Mixed, required: true },
    },
    baselineTotalScore: total,
    calculatedAt: { type: Date, required: true },
  },
  { _id: false },
);

/**
 * 4. The admin's decision. `totalScore` / `breakdown` are only present for VERIFIED
 * (enforced in the Score model's validate hook).
 */
export const finalScoreSchema = new Schema(
  {
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES, required: true },
    totalScore: { type: Number, min: 0, max: 100, default: null },
    breakdown: { type: breakdownSchema, default: null },
    /** Admin display name. A plain string in the MVP (no accounts). */
    verifiedBy: { type: String, default: null },
    verifiedAt: { type: Date, default: null },
    verificationReason: { type: String, maxlength: 2000, default: null },
    verificationId: { type: Schema.Types.ObjectId, ref: 'Verification', default: null },
    methodologyVersion: { type: String, required: true },
  },
  { _id: false },
);

/** A plain total + breakdown pair, used by Verification.finalScore. */
export const scoreResultSchema = new Schema(
  {
    totalScore: total,
    breakdown: { type: breakdownSchema, required: true },
  },
  { _id: false },
);
