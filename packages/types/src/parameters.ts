import type { CategoryKey, QualityLevel } from './enums';

/**
 * Assessment parameters, grouped by scored category.
 *
 * - Every parameter is optional: draft assessments may be partially filled in.
 * - The category keys match `ScoreBreakdown` exactly.
 * - Units are fixed here and documented in docs/scoring.md. Convert in the UI, not in storage.
 *
 * TO ADD A PARAMETER (one place per concern, all checked by the compiler/tests):
 *   1. Add the field to the interface below.
 *   2. Add its metadata to PARAMETER_DEFINITIONS   (packages/shared/src/parameters.ts).
 *   3. Add its weight to SCORING_CONFIG            (packages/shared/src/scoring/config.ts).
 * The Mongoose schema and the zod validator are generated from (2), so they follow automatically.
 */

export interface EnergyParameters {
  /** Annual grid electricity use, kWh/year. */
  electricityConsumption?: number;
  solarInstalled?: boolean;
  /** Installed solar PV capacity, kWp. */
  solarCapacity?: number;
  /** Share of lighting that is energy efficient (LED etc.), 0-100. */
  energyEfficientLighting?: number;
  /** Share of appliances rated efficient (e.g. BEE 4-5 star), 0-100. */
  energyEfficientAppliances?: number;
  hvacEfficiency?: QualityLevel;
  /** Sub-metering / energy management system in place. */
  energyMonitoring?: boolean;
}

export interface WaterParameters {
  /** Annual municipal + borewell water use, kL/year. */
  waterConsumption?: number;
  rainwaterHarvesting?: boolean;
  /** Rainwater storage / recharge capacity, kL. */
  rainwaterHarvestingCapacity?: number;
  greywaterRecycling?: boolean;
  wastewaterTreatment?: boolean;
  /** Share of non-potable demand met with recycled water, 0-100. */
  recycledWaterUsage?: number;
  /** Share of fixtures that are low-flow / water efficient, 0-100. */
  waterEfficientFixtures?: number;
}

export interface WasteParameters {
  wasteSegregation?: boolean;
  composting?: boolean;
  recycling?: boolean;
  eWasteManagement?: boolean;
  wetWasteManagement?: boolean;
  dryWasteManagement?: boolean;
}

/** "Green Cover & Site". */
export interface GreenCoverParameters {
  /** Landscaped / green area as a share of the plot, 0-100. */
  greenAreaPercentage?: number;
  treeCount?: number;
  rooftopGarden?: boolean;
  greenRoof?: boolean;
  /** Share of open / paved area that is shaded, 0-100. */
  shadedAreas?: number;
  /** Share of site surface that is permeable, 0-100. */
  permeableSurfaces?: number;
}

export interface MaterialsParameters {
  /** Share of materials with sustainable certification / low embodied carbon, 0-100. */
  sustainableMaterials?: number;
  /** Share of materials sourced locally, 0-100. */
  localMaterials?: number;
  /** Share of recycled-content materials, 0-100. */
  recycledMaterials?: number;
  efficientWindows?: boolean;
  insulation?: QualityLevel;
}

export interface IndoorEnvironmentParameters {
  ventilation?: QualityLevel;
  indoorAirQuality?: QualityLevel;
  daylight?: QualityLevel;
  thermalComfort?: QualityLevel;
}

export interface MobilityParameters {
  evCharging?: boolean;
  bicycleParking?: boolean;
  publicTransportAccessibility?: QualityLevel;
}

export interface ClimateResilienceParameters {
  coolRoof?: boolean;
  naturalVentilation?: QualityLevel;
  heatReduction?: QualityLevel;
  floodWaterManagement?: boolean;
  greenInfrastructure?: boolean;
}

/** Everything a building owner can submit about a building. */
export interface AssessmentParameters {
  energy?: EnergyParameters;
  water?: WaterParameters;
  waste?: WasteParameters;
  greenCover?: GreenCoverParameters;
  materials?: MaterialsParameters;
  indoorEnvironment?: IndoorEnvironmentParameters;
  mobility?: MobilityParameters;
  climateResilience?: ClimateResilienceParameters;
}

/** Parameter names within one category. */
export type ParameterKey<C extends CategoryKey> = keyof NonNullable<AssessmentParameters[C]> & string;

/** Free-form, not-yet-promoted parameters (experiments). Not scored. */
export type ExtraParameters = Record<string, string | number | boolean>;
