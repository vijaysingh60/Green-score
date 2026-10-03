import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { baseSchemaOptions } from './_shared';
import {
  finalScoreSchema,
  mlPredictedScoreSchema,
  preliminaryScoreSchema,
  projectedScoreSchema,
} from './score.schemas';

/**
 * One Score document per building, holding the CURRENT value of four independent slots:
 *
 *   preliminaryScore    rule-based, automatic              (set by the scoring service)
 *   mlPredictedScore    ML output, ADVISORY ONLY           (set by the ML integration)
 *   projectedScore      latest saved "what if" scenario    (set by the simulator)
 *   finalVerifiedScore  the admin's decision               (set ONLY by the admin verification flow)
 *
 * Rule: a slot is only ever written by its own producer. Nothing is copied from one slot into
 * another. History lives in AuditLog (every change) and Verification (every admin decision).
 */
const scoreSchema = new Schema(
  {
    buildingId: { type: Schema.Types.ObjectId, ref: 'Building', required: true },
    /** The assessment the preliminary score was calculated from. */
    assessmentId: { type: Schema.Types.ObjectId, ref: 'BuildingAssessment', default: null },
    preliminaryScore: { type: preliminaryScoreSchema, default: null },
    mlPredictedScore: { type: mlPredictedScoreSchema, default: null },
    projectedScore: { type: projectedScoreSchema, default: null },
    finalVerifiedScore: { type: finalScoreSchema, default: null },
    /** Mirrors Building.isDemo. Demo scores are exempt from the human-verifier requirement below. */
    isDemo: { type: Boolean, required: true, default: false },
  },
  baseSchemaOptions,
);

scoreSchema.index({ buildingId: 1 }, { unique: true });

/**
 * Guard rails for the final slot: a real VERIFIED score must carry a total, a breakdown and the
 * human who verified it; any non-VERIFIED decision must not carry a total at all.
 * (Query-style updates bypass hooks, so write the final slot with `doc.save()`.)
 */
scoreSchema.pre('validate', function () {
  const score = this as ScoreDoc; // Mongoose 9 types `this` as unknown here
  const final = score.finalVerifiedScore;
  if (!final) return;

  if (final.verificationStatus === 'VERIFIED') {
    if (final.totalScore == null || !final.breakdown) {
      score.invalidate('finalVerifiedScore.totalScore', 'A VERIFIED score needs a total and breakdown');
    }
    if (!score.isDemo && (!final.verifiedBy || !final.verifiedAt)) {
      score.invalidate(
        'finalVerifiedScore.verifiedBy',
        'A VERIFIED score must record the admin (verifiedBy) and time (verifiedAt) of the human verification',
      );
    }
  } else if (final.totalScore != null) {
    score.invalidate(
      'finalVerifiedScore.totalScore',
      'Only a VERIFIED decision may carry a final total score',
    );
  }
});

export type ScoreDoc = HydratedDocument<InferSchemaType<typeof scoreSchema>>;
export const ScoreModel = model('Score', scoreSchema);
