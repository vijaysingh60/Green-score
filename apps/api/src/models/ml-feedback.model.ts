import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { baseSchemaOptions } from './_shared';

/**
 * ML prediction vs the human-verified score for the same building: the ground truth for
 * evaluation and retraining. Only a HUMAN-verified score may be used as truth, which is why
 * `verificationId` (the admin's Verification record) is required.
 */
const mlFeedbackSchema = new Schema(
  {
    buildingId: { type: Schema.Types.ObjectId, ref: 'Building', required: true },
    predictionId: { type: Schema.Types.ObjectId, ref: 'MLPrediction', required: true },
    verificationId: { type: Schema.Types.ObjectId, ref: 'Verification', required: true },
    mlScore: { type: Number, required: true, min: 0, max: 100 },
    humanVerifiedScore: { type: Number, required: true, min: 0, max: 100 },
    /** |mlScore - humanVerifiedScore|, always derived (see hook), never trusted from input. */
    absoluteError: { type: Number, required: true, min: 0 },
    modelVersion: { type: String, required: true },
  },
  baseSchemaOptions,
);

mlFeedbackSchema.pre('validate', function () {
  const feedback = this as MLFeedbackDoc;
  if (typeof feedback.mlScore === 'number' && typeof feedback.humanVerifiedScore === 'number') {
    feedback.absoluteError =
      Math.round(Math.abs(feedback.mlScore - feedback.humanVerifiedScore) * 100) / 100;
  }
});

mlFeedbackSchema.index({ buildingId: 1 });
mlFeedbackSchema.index({ modelVersion: 1 }); // error per model version

export type MLFeedbackDoc = HydratedDocument<InferSchemaType<typeof mlFeedbackSchema>>;
export const MLFeedback = model('MLFeedback', mlFeedbackSchema);
