import type { BuildingType } from './enums';
import type { AssessmentParameters } from './parameters';
import type { FeatureImportance, MLModelMetrics } from './models';

/**
 * Contract between the Node API and the Python ML service (apps/ml).
 * Python mirrors these shapes as Pydantic models in apps/ml/app/schemas.py.
 * The ML branch may ADD optional fields, but must not rename or remove existing ones.
 */

export interface MLBuildingContext {
  type: BuildingType;
  /** Square metres. */
  builtUpArea: number;
  occupants: number;
  numberOfFloors: number;
  yearConstructed: number;
}

export interface MLPredictRequest {
  buildingId: string;
  assessmentId?: string;
  building: MLBuildingContext;
  parameters: AssessmentParameters;
}

export interface MLPredictResponse {
  /** `NOT_IMPLEMENTED` until the ML branch ships a model. Callers must not persist a null score. */
  status: 'OK' | 'NOT_IMPLEMENTED';
  /** 0-100, or null when no model is available. */
  predictedScore: number | null;
  modelVersion: string | null;
  featureImportance: FeatureImportance[];
  metadata: Record<string, unknown>;
  /** Always true: an ML score is advisory and never becomes the final score by itself. */
  advisory: true;
  message?: string;
}

export interface MLTrainRequest {
  /** User id of the admin who requested training. */
  triggeredBy?: string;
}

export interface MLTrainResponse {
  status: 'QUEUED' | 'NOT_IMPLEMENTED';
  runId: string | null;
  /** Set once a model exists. A trained model lands in AWAITING_APPROVAL, never ACTIVE. */
  modelVersion: string | null;
  message?: string;
}

export interface MLServiceModelStatus {
  status: 'NO_MODEL' | 'READY';
  /** Version of the ACTIVE (admin-approved) model, if any. */
  activeVersion: string | null;
  metrics: MLModelMetrics | null;
  trainedAt: string | null;
  message?: string;
}
