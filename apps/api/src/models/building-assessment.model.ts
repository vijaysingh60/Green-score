import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { baseSchemaOptions } from './_shared';
import { assessmentParametersSchema } from './assessment.schema';

/**
 * One submitted set of sustainability parameters for a building.
 * Assessments are immutable history: an edit creates a new `version`, so scores, ML training
 * data and verification records can always point at exactly what was assessed.
 */
const buildingAssessmentSchema = new Schema(
  {
    buildingId: { type: Schema.Types.ObjectId, ref: 'Building', required: true },
    version: { type: Number, required: true, min: 1 },
    /** Version of the parameter set (ASSESSMENT_SCHEMA_VERSION in @greenscore/shared). */
    schemaVersion: { type: String, required: true },
    parameters: { type: assessmentParametersSchema, required: true, default: () => ({}) },
    /** Escape hatch for parameters not yet promoted into the typed model. Stored, never scored. */
    extra: { type: Schema.Types.Mixed },
    notes: { type: String, trim: true, maxlength: 2000 },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { ...baseSchemaOptions, minimize: false },
);

// Latest version first; also guarantees version numbers are unique per building.
buildingAssessmentSchema.index({ buildingId: 1, version: -1 }, { unique: true });

export type BuildingAssessmentDoc = HydratedDocument<InferSchemaType<typeof buildingAssessmentSchema>>;
export const BuildingAssessment = model('BuildingAssessment', buildingAssessmentSchema);
