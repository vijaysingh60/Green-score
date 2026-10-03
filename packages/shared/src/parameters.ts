import type {
  AssessmentParameters,
  CategoryKey,
  QualityLevel,
} from '@greenscore/types';
import { CATEGORY_KEYS } from '@greenscore/types';

/**
 * Parameter registry: the single source of truth for WHAT can be asked about a building.
 *
 * Consumers (all generated from this, never hand-copied):
 *   - Mongoose assessment schema   (apps/api/src/models/assessment.schema.ts)
 *   - zod request validation       (apps/api/src/validators/assessment.validators.ts)
 *   - the scoring engine           (./scoring/engine.ts)
 *   - the assessment form          (feature/user-platform: render inputs from this registry)
 *
 * The mapped types below make the compiler enforce that:
 *   - every field of AssessmentParameters has a definition (and no extra ones exist), and
 *   - a field's `kind` matches its TypeScript type (boolean -> 'boolean', QualityLevel -> 'level').
 */

/**
 * How a parameter is entered and validated.
 *  - boolean : yes / no
 *  - percent : number 0-100
 *  - number  : non-negative measurement with a unit
 *  - level   : NONE | BASIC | GOOD | EXCELLENT
 */
export type ParameterKind = 'boolean' | 'percent' | 'number' | 'level';

export interface ParameterDefinition<K extends ParameterKind = ParameterKind> {
  label: string;
  description: string;
  kind: K;
  /** Unit for `number` kinds, e.g. "kWh/year". */
  unit?: string;
}

type KindFor<V> = [V] extends [boolean]
  ? 'boolean'
  : [V] extends [QualityLevel]
    ? 'level'
    : 'percent' | 'number';

type DefinitionMap<P> = {
  [K in keyof P]-?: ParameterDefinition<KindFor<NonNullable<P[K]>>>;
};

export type ParameterDefinitions = {
  [C in CategoryKey]: DefinitionMap<NonNullable<AssessmentParameters[C]>>;
};

export const PARAMETER_DEFINITIONS: ParameterDefinitions = {
  energy: {
    electricityConsumption: {
      label: 'Annual electricity consumption',
      description: 'Total grid electricity used over a year.',
      kind: 'number',
      unit: 'kWh/year',
    },
    solarInstalled: {
      label: 'Solar PV installed',
      description: 'Rooftop or on-site solar photovoltaic system is installed.',
      kind: 'boolean',
    },
    solarCapacity: {
      label: 'Solar capacity',
      description: 'Installed solar PV capacity.',
      kind: 'number',
      unit: 'kWp',
    },
    energyEfficientLighting: {
      label: 'Energy-efficient lighting',
      description: 'Share of lighting that is LED or equivalent.',
      kind: 'percent',
      unit: '%',
    },
    energyEfficientAppliances: {
      label: 'Energy-efficient appliances',
      description: 'Share of appliances with a high efficiency rating (e.g. BEE 4-5 star).',
      kind: 'percent',
      unit: '%',
    },
    hvacEfficiency: {
      label: 'HVAC efficiency',
      description: 'Efficiency of heating, ventilation and air-conditioning systems.',
      kind: 'level',
    },
    energyMonitoring: {
      label: 'Energy monitoring',
      description: 'Sub-metering or an energy management system tracks consumption.',
      kind: 'boolean',
    },
  },
  water: {
    waterConsumption: {
      label: 'Annual water consumption',
      description: 'Total municipal, tanker and borewell water used over a year.',
      kind: 'number',
      unit: 'kL/year',
    },
    rainwaterHarvesting: {
      label: 'Rainwater harvesting',
      description: 'A rainwater harvesting system is in place.',
      kind: 'boolean',
    },
    rainwaterHarvestingCapacity: {
      label: 'Rainwater harvesting capacity',
      description: 'Combined storage and recharge capacity.',
      kind: 'number',
      unit: 'kL',
    },
    greywaterRecycling: {
      label: 'Greywater recycling',
      description: 'Greywater is collected and reused.',
      kind: 'boolean',
    },
    wastewaterTreatment: {
      label: 'Wastewater treatment',
      description: 'On-site sewage treatment plant (STP) or equivalent.',
      kind: 'boolean',
    },
    recycledWaterUsage: {
      label: 'Recycled water usage',
      description: 'Share of non-potable demand met with recycled water.',
      kind: 'percent',
      unit: '%',
    },
    waterEfficientFixtures: {
      label: 'Water-efficient fixtures',
      description: 'Share of taps, flushes and showers that are low-flow.',
      kind: 'percent',
      unit: '%',
    },
  },
  waste: {
    wasteSegregation: {
      label: 'Waste segregation',
      description: 'Waste is segregated at source.',
      kind: 'boolean',
    },
    composting: {
      label: 'Composting',
      description: 'Organic waste is composted on site.',
      kind: 'boolean',
    },
    recycling: {
      label: 'Recycling',
      description: 'Recyclable waste is sent for recycling.',
      kind: 'boolean',
    },
    eWasteManagement: {
      label: 'E-waste management',
      description: 'Electronic waste is handed to authorised recyclers.',
      kind: 'boolean',
    },
    wetWasteManagement: {
      label: 'Wet waste management',
      description: 'Wet / organic waste has a defined treatment route.',
      kind: 'boolean',
    },
    dryWasteManagement: {
      label: 'Dry waste management',
      description: 'Dry waste has a defined collection and recovery route.',
      kind: 'boolean',
    },
  },
  greenCover: {
    greenAreaPercentage: {
      label: 'Green area',
      description: 'Landscaped or vegetated area as a share of the plot.',
      kind: 'percent',
      unit: '%',
    },
    treeCount: {
      label: 'Number of trees',
      description: 'Trees on the plot.',
      kind: 'number',
      unit: 'trees',
    },
    rooftopGarden: {
      label: 'Rooftop garden',
      description: 'A planted rooftop garden or terrace garden.',
      kind: 'boolean',
    },
    greenRoof: {
      label: 'Green roof',
      description: 'A vegetated roof system.',
      kind: 'boolean',
    },
    shadedAreas: {
      label: 'Shaded areas',
      description: 'Share of open and paved areas shaded by trees or structures.',
      kind: 'percent',
      unit: '%',
    },
    permeableSurfaces: {
      label: 'Permeable surfaces',
      description: 'Share of site surface that lets water soak into the ground.',
      kind: 'percent',
      unit: '%',
    },
  },
  materials: {
    sustainableMaterials: {
      label: 'Sustainable materials',
      description: 'Share of materials that are certified sustainable or low-carbon.',
      kind: 'percent',
      unit: '%',
    },
    localMaterials: {
      label: 'Locally sourced materials',
      description: 'Share of materials sourced within the region.',
      kind: 'percent',
      unit: '%',
    },
    recycledMaterials: {
      label: 'Recycled materials',
      description: 'Share of materials with recycled content.',
      kind: 'percent',
      unit: '%',
    },
    efficientWindows: {
      label: 'Efficient windows',
      description: 'Glazing with low solar heat gain / good thermal performance.',
      kind: 'boolean',
    },
    insulation: {
      label: 'Insulation',
      description: 'Quality of wall and roof insulation.',
      kind: 'level',
    },
  },
  indoorEnvironment: {
    ventilation: {
      label: 'Ventilation',
      description: 'Quality of fresh-air supply to occupied spaces.',
      kind: 'level',
    },
    indoorAirQuality: {
      label: 'Indoor air quality measures',
      description: 'Low-VOC finishes, filtration, monitoring and similar measures.',
      kind: 'level',
    },
    daylight: {
      label: 'Daylight',
      description: 'Access to daylight in regularly occupied spaces.',
      kind: 'level',
    },
    thermalComfort: {
      label: 'Thermal comfort',
      description: 'Occupant comfort across hot and monsoon seasons.',
      kind: 'level',
    },
  },
  mobility: {
    evCharging: {
      label: 'EV charging',
      description: 'Electric-vehicle charging points are available.',
      kind: 'boolean',
    },
    bicycleParking: {
      label: 'Bicycle parking',
      description: 'Secure bicycle parking is provided.',
      kind: 'boolean',
    },
    publicTransportAccessibility: {
      label: 'Public transport access',
      description: 'Walking access to metro, bus or MMTS services.',
      kind: 'level',
    },
  },
  climateResilience: {
    coolRoof: {
      label: 'Cool roof',
      description: 'Reflective or cool-roof finish to reduce heat gain.',
      kind: 'boolean',
    },
    naturalVentilation: {
      label: 'Natural ventilation',
      description: 'Design supports cross-ventilation and passive cooling.',
      kind: 'level',
    },
    heatReduction: {
      label: 'Heat reduction measures',
      description: 'Shading, orientation and other heat-island mitigation.',
      kind: 'level',
    },
    floodWaterManagement: {
      label: 'Flood and stormwater management',
      description: 'Drainage, retention or other measures against urban flooding.',
      kind: 'boolean',
    },
    greenInfrastructure: {
      label: 'Green infrastructure',
      description: 'Bioswales, planted buffers or similar nature-based measures.',
      kind: 'boolean',
    },
  },
};

export interface ParameterEntry extends ParameterDefinition {
  category: CategoryKey;
  key: string;
}

/** Flat list of every parameter, in category order. */
export const PARAMETER_ENTRIES: readonly ParameterEntry[] = CATEGORY_KEYS.flatMap((category) =>
  Object.entries(PARAMETER_DEFINITIONS[category] as Record<string, ParameterDefinition>).map(
    ([key, definition]) => ({ ...definition, category, key }),
  ),
);

export function getParameterDefinitions(category: CategoryKey): Record<string, ParameterDefinition> {
  return PARAMETER_DEFINITIONS[category] as Record<string, ParameterDefinition>;
}

/** Bump when parameters are added, removed or change meaning. Stored on every assessment. */
export const ASSESSMENT_SCHEMA_VERSION = '1.0.0';
