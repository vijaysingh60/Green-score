import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { ML_TRAINING_RUN_STATUSES } from '@greenscore/types';
import { baseSchemaOptions } from './_shared';

const mlTrainingRunSchema = new Schema(
  {
    modelVersion: { type: String, required: true },
    datasetSize: { type: Number, required: true, min: 0, default: 0 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    metrics: {
      mae: { type: Number, min: 0 },
      rmse: { type: Number, min: 0 },
      r2: { type: Number },
    },
    status: { type: String, enum: ML_TRAINING_RUN_STATUSES, required: true, default: 'QUEUED' },
    error: { type: String, maxlength: 4000, default: null },
  },
  { ...baseSchemaOptions, minimize: false },
);

mlTrainingRunSchema.index({ createdAt: -1 }); // newest runs first in the admin models page

export type MLTrainingRunDoc = HydratedDocument<InferSchemaType<typeof mlTrainingRunSchema>>;
export const MLTrainingRun = model('MLTrainingRun', mlTrainingRunSchema);
