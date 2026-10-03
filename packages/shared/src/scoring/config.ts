import type {
  AssessmentParameters,
  CategoryKey,
  QualityLevel,
} from '@greenscore/types';
import { CATEGORY_KEYS } from '@greenscore/types';

/**
 * CENTRALISED SCORING CONFIGURATION: edit this file to change the methodology.
 *
 * DISCLAIMER: this is a prototype / hackathon methodology. It is NOT an official
 * government or IGBC certification methodology and must never be presented as one.
 *
 * Conventions
 *  - Each parameter's `weight` is its maximum points. Weights in a category add up to that
 *    category's `maxPoints`, and category maxima add up to 100 (checked by the unit tests).
 *  - A parameter earns `weight x fraction`, where fraction (0..1) comes from its kind:
 *      boolean -> 0 or 1          percent -> value / 100        level -> `levelFractions`
 *      number  -> its `rule` below (normalised by building size / occupants).
 *  - Parameters the owner left blank earn 0.
 *  - Parameters that cannot be scored (e.g. size-normalised but building area unknown) are
 *    left out of that category's denominator and reported in `unscoredParameters`.
 *  - Changing weights, rules or bands? Bump `methodologyVersion` so stored scores stay
 *    interpretable.
 */

export type NumericRule =
  /** Higher is better: value per 1,000 m2 of built-up area, full marks at `target`. */
  | { type: 'targetPerThousandSqm'; target: number }
  /** Lower is better: an intensity metric, full marks at `best`, zero at `worst`. */
  | {
      type: 'intensity';
      metric: 'kwhPerSqmYear' | 'litresPerPersonDay';
      best: number;
      worst: number;
    };

export interface ParameterScoring {
  /** Maximum points this parameter can contribute. */
  weight: number;
  /** Required for parameters whose registry `kind` is 'number'. Forbidden otherwise. */
  rule?: NumericRule;
}

type ScoringMap<P> = { [K in keyof P]-?: ParameterScoring };

export interface CategoryConfig<C extends CategoryKey = CategoryKey> {
  label: string;
  maxPoints: number;
  parameters: ScoringMap<NonNullable<AssessmentParameters[C]>>;
}

export interface ScoreBand {
  id: 'needs-improvement' | 'developing' | 'good' | 'leading';
  label: string;
  /** Inclusive lower bound on the 0-100 scale. */
  min: number;
}

export interface ScoringConfig {
  methodologyVersion: string;
  methodologyName: string;
  disclaimer: string;
  levelFractions: Record<QualityLevel, number>;
  categories: { [C in CategoryKey]: CategoryConfig<C> };
  /** Ascending by `min`. Descriptive bands only: these are not certification tiers. */
  bands: readonly ScoreBand[];
}

export const SCORING_CONFIG: ScoringConfig = {
  methodologyVersion: 'prototype-0.1.0',
  methodologyName: 'GREENScore Hyderabad prototype framework',
  disclaimer:
    'Prototype methodology for a hackathon. Not an official government or IGBC certification.',

  levelFractions: {
    NONE: 0,
    BASIC: 0.4,
    GOOD: 0.75,
    EXCELLENT: 1,
  },

  categories: {
    energy: {
      label: 'Energy',
      maxPoints: 25,
      parameters: {
        // Benchmarks are indicative placeholders, to be refined with local data.
        electricityConsumption: {
          weight: 8,
          rule: { type: 'intensity', metric: 'kwhPerSqmYear', best: 50, worst: 220 },
        },
        solarInstalled: { weight: 3 },
        solarCapacity: { weight: 5, rule: { type: 'targetPerThousandSqm', target: 30 } },
        energyEfficientLighting: { weight: 3 },
        energyEfficientAppliances: { weight: 2 },
        hvacEfficiency: { weight: 3 },
        energyMonitoring: { weight: 1 },
      },
    },
    water: {
      label: 'Water',
      maxPoints: 20,
      parameters: {
        waterConsumption: {
          weight: 6,
          rule: { type: 'intensity', metric: 'litresPerPersonDay', best: 50, worst: 150 },
        },
        rainwaterHarvesting: { weight: 2 },
        rainwaterHarvestingCapacity: {
          weight: 3,
          rule: { type: 'targetPerThousandSqm', target: 20 },
        },
        greywaterRecycling: { weight: 2 },
        wastewaterTreatment: { weight: 2 },
        recycledWaterUsage: { weight: 3 },
        waterEfficientFixtures: { weight: 2 },
      },
    },
    waste: {
      label: 'Waste',
      maxPoints: 15,
      parameters: {
        wasteSegregation: { weight: 3 },
        composting: { weight: 2 },
        recycling: { weight: 3 },
        eWasteManagement: { weight: 2 },
        wetWasteManagement: { weight: 3 },
        dryWasteManagement: { weight: 2 },
      },
    },
    greenCover: {
      label: 'Green Cover & Site',
      maxPoints: 10,
      parameters: {
        greenAreaPercentage: { weight: 3 },
        treeCount: { weight: 2, rule: { type: 'targetPerThousandSqm', target: 12 } },
        rooftopGarden: { weight: 1 },
        greenRoof: { weight: 1 },
        shadedAreas: { weight: 1 },
        permeableSurfaces: { weight: 2 },
      },
    },
    materials: {
      label: 'Sustainable Materials',
      maxPoints: 10,
      parameters: {
        sustainableMaterials: { weight: 3 },
        localMaterials: { weight: 2 },
        recycledMaterials: { weight: 2 },
        efficientWindows: { weight: 1 },
        insulation: { weight: 2 },
      },
    },
    indoorEnvironment: {
      label: 'Indoor Environment',
      maxPoints: 5,
      parameters: {
        ventilation: { weight: 1 },
        indoorAirQuality: { weight: 2 },
        daylight: { weight: 1 },
        thermalComfort: { weight: 1 },
      },
    },
    mobility: {
      label: 'Sustainable Mobility',
      maxPoints: 5,
      parameters: {
        evCharging: { weight: 2 },
        bicycleParking: { weight: 1 },
        publicTransportAccessibility: { weight: 2 },
      },
    },
    climateResilience: {
      label: 'Climate Resilience',
      maxPoints: 10,
      parameters: {
        coolRoof: { weight: 2 },
        naturalVentilation: { weight: 2 },
        heatReduction: { weight: 2 },
        floodWaterManagement: { weight: 2 },
        greenInfrastructure: { weight: 2 },
      },
    },
  },

  bands: [
    { id: 'needs-improvement', label: 'Needs improvement', min: 0 },
    { id: 'developing', label: 'Developing', min: 40 },
    { id: 'good', label: 'Good', min: 60 },
    { id: 'leading', label: 'Leading', min: 80 },
  ],
};

/** Sum of category maxima. 100 for the current framework. */
export function getTotalPoints(config: ScoringConfig = SCORING_CONFIG): number {
  return CATEGORY_KEYS.reduce((sum, key) => sum + config.categories[key].maxPoints, 0);
}

export const TOTAL_POINTS = getTotalPoints();

/** Max points per category, in framework order. Handy for charts and progress bars. */
export function getCategoryMaxPoints(
  config: ScoringConfig = SCORING_CONFIG,
): Record<CategoryKey, number> {
  const entries = CATEGORY_KEYS.map((key) => [key, config.categories[key].maxPoints] as const);
  return Object.fromEntries(entries) as Record<CategoryKey, number>;
}
