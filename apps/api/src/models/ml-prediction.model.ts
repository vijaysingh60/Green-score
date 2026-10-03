import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { baseSchemaOptions } from './_shared';

/**
 * One advisory prediction from the ML service for one assessment.
 * Never the final authority: it can only ever feed `Score.mlPredictedScore`.
 */
const mlPredictionSchema = new Schema(
  {
    buildingId: { type: Schema.Types.ObjectId, ref: 'Building', required: true },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'BuildingAssessment', required: true },
    predictedScore: { type: Number, required: true, min: 0, max: 100 },
    modelVersion: { type: String, required: true },
    predictionMetadata: { type: Schema.Types.Mixed, default: () => ({}) },
    featureImportance: {
      type: [
        new Schema(
          {
            feature: { type: String, required: true },
            importance: { type: Number, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { ...baseSchemaOptions, minimize: false },
);

mlPredictionSchema.index({ buildingId: 1, createdAt: -1 }); // latest prediction for a building
mlPredictionSchema.index({ modelVersion: 1 }); //              per-model analysis

export type MLPredictionDoc = HydratedDocument<InferSchemaType<typeof mlPredictionSchema>>;
export const MLPrediction = model('MLPrediction', mlPredictionSchema);
