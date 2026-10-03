import type { AssessmentParameters, MapSummary, ScoreBreakdown } from '@greenscore/types';

/** Hover facts for a map pin, taken from the assessment and the (verified) breakdown. */
export function buildMapSummary(
  parameters: AssessmentParameters | null | undefined,
  breakdown: ScoreBreakdown | null | undefined,
): MapSummary {
  const energy = parameters?.energy;
  return {
    electricityKwh: energy?.electricityConsumption ?? null,
    solarInstalled: energy?.solarInstalled ?? null,
    solarKwp: energy?.solarCapacity ?? null,
    breakdown: breakdown ?? null,
  };
}
