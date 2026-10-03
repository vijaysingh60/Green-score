import type { MLPredictRequest, MLPredictResponse, MLServiceModelStatus } from '@greenscore/types';
import { SIMULATED_ML_MODEL_VERSION, simulateMlScore } from '@greenscore/shared';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Thin client for the Python ML service, with a safety net for demos: if the service is down
 * or has no model, we return a clearly-labelled SIMULATED prediction instead of failing.
 * Either way the result is advisory only and is stored in its own slot (mlPredictedScore).
 */

const TIMEOUT_MS = 4000;

async function mlFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getEnv().ML_SERVICE_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`ML service responded ${response.status}`);
  return (await response.json()) as T;
}

export interface PredictionResult {
  predictedScore: number;
  modelVersion: string;
  featureImportance: Array<{ feature: string; importance: number }>;
  metadata: Record<string, unknown>;
  simulated: boolean;
}

export async function predictScore(
  request: MLPredictRequest,
  preliminaryTotal: number,
): Promise<PredictionResult> {
  try {
    const result = await mlFetch<MLPredictResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    if (result.status === 'OK' && typeof result.predictedScore === 'number' && result.modelVersion) {
      return {
        predictedScore: result.predictedScore,
        modelVersion: result.modelVersion,
        featureImportance: result.featureImportance,
        metadata: result.metadata,
        simulated: false,
      };
    }
    logger.warn('ML service returned no prediction; using simulated score');
  } catch (error) {
    logger.warn(`ML service unavailable (${error instanceof Error ? error.message : error}); using simulated score`);
  }
  return {
    predictedScore: simulateMlScore(preliminaryTotal, request.buildingId),
    modelVersion: SIMULATED_ML_MODEL_VERSION,
    featureImportance: [],
    metadata: { simulated: true, reason: 'ML service unavailable' },
    simulated: true,
  };
}

export async function getMlServiceStatus(): Promise<
  { reachable: true; model: MLServiceModelStatus } | { reachable: false; error: string }
> {
  try {
    return { reachable: true, model: await mlFetch<MLServiceModelStatus>('/model/status') };
  } catch (error) {
    return { reachable: false, error: error instanceof Error ? error.message : String(error) };
  }
}
