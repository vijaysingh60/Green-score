import type { AssessmentParameters, CarbonEstimate } from '@greenscore/types';
import type { ScoringContext } from './scoring/engine';

/** Indicative grid emission factor for India (kg CO2e per kWh). Placeholder for the MVP. */
export const GRID_EMISSION_FACTOR = 0.82;
/** Indicative annual solar yield for Hyderabad (kWh per kWp per year). */
const SOLAR_YIELD_KWH_PER_KWP = 1500;

const round = (value: number, digits = 1): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/**
 * Simple operational-carbon estimate from annual grid electricity use.
 * Returns null when electricity use was not provided. NOT an audited footprint.
 */
export function estimateCarbon(
  parameters: AssessmentParameters,
  context: ScoringContext = {},
): CarbonEstimate | null {
  const kwh = parameters.energy?.electricityConsumption;
  if (typeof kwh !== 'number' || !Number.isFinite(kwh) || kwh <= 0) return null;

  const tonnes = (kwh * GRID_EMISSION_FACTOR) / 1000;
  const area = context.builtUpArea;
  const solarKwp = parameters.energy?.solarCapacity;

  return {
    annualElectricityKwh: Math.round(kwh),
    annualTonnesCO2e: round(tonnes),
    kgCO2ePerSqm: area && area > 0 ? round((tonnes * 1000) / area) : 0,
    solarAvoidedTonnesCO2e:
      typeof solarKwp === 'number' && solarKwp > 0
        ? round((solarKwp * SOLAR_YIELD_KWH_PER_KWP * GRID_EMISSION_FACTOR) / 1000)
        : null,
    emissionFactor: GRID_EMISSION_FACTOR,
    note: 'Indicative estimate from electricity use only. Not an audited carbon footprint.',
  };
}
