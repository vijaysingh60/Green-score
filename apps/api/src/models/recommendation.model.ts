import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import {
  CATEGORY_KEYS,
  RECOMMENDATION_PRIORITIES,
  RECOMMENDATION_SOURCES,
} from '@greenscore/types';
import { baseSchemaOptions } from './_shared';

const recommendationSchema = new Schema(
  {
    buildingId: { type: Schema.Types.ObjectId, ref: 'Building', required: true },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'BuildingAssessment' },
    category: { type: String, enum: CATEGORY_KEYS, required: true },
    /** Id from the improvements catalogue in @greenscore/shared, so the simulator can match it. */
    improvementId: { type: String, maxlength: 60 },
    icon: { type: String, maxlength: 8 },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    priority: { type: String, enum: RECOMMENDATION_PRIORITIES, required: true, default: 'MEDIUM' },
    potentialImpact: {
      /** Estimated points gained on the 100-point scale. */
      scoreGain: { type: Number, required: true, min: 0, max: 100 },
      note: { type: String, maxlength: 500 },
    },
    source: { type: String, enum: RECOMMENDATION_SOURCES, required: true },
    /** For source = ML / AI. */
    modelVersion: { type: String },
  },
  baseSchemaOptions,
);

recommendationSchema.index({ buildingId: 1, createdAt: -1 });

export type RecommendationDoc = HydratedDocument<InferSchemaType<typeof recommendationSchema>>;
export const Recommendation = model('Recommendation', recommendationSchema);
