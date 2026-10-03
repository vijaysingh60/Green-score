import type {
  AssessmentParameters,
  Building,
  BuildingType,
  CategoryKey,
  MapBuilding,
  QualityLevel,
  ScoreResult,
  VerificationStatus,
} from '@greenscore/types';
import { CATEGORY_KEYS } from '@greenscore/types';
import { buildMapSummary } from '../map-summary';
import { PARAMETER_ENTRIES } from '../parameters';
import { SCORING_CONFIG } from '../scoring/config';
import { calculatePreliminaryScore, type ScoreCalculation } from '../scoring/engine';

/**
 * DEMO / SAMPLE DATA: for development and demos only.
 *
 * These are invented buildings placed at approximate locality coordinates. They are NOT real
 * buildings and none of their scores are real verified assessments. Everything derived from
 * this file carries `isDemo: true`, and the UI must label it as sample data.
 *
 * Used by:
 *   - `npm run db:seed` (apps/api)  to populate MongoDB
 *   - apps/web                       as an offline fallback when the API is unreachable
 */

export const DEMO_DATA_NOTICE =
  'Demo data for development. These are sample buildings, not real verified assessments.';

type DemoBuildingFields = Omit<Building, 'id' | 'owner' | 'createdAt' | 'updatedAt' | 'isDemo'>;

interface DemoSeed extends Omit<DemoBuildingFields, 'status'> {
  key: string;
  /** 0..1: how sustainable the generated parameters are. */
  strength: number;
  status: VerificationStatus;
  /** Sample admin adjustment applied to Energy for VERIFIED demos, so prelim != final. */
  finalAdjustment?: number;
}

const base = { city: 'Hyderabad' } as const;

export const DEMO_SEEDS: readonly DemoSeed[] = [
  {
    ...base, key: 'gachibowli-tech-park', name: 'Sample Tech Park, Gachibowli', type: 'OFFICE',
    address: 'Demo address, Gachibowli', locality: 'Gachibowli', pincode: '500032',
    latitude: 17.4401, longitude: 78.3489, yearConstructed: 2019, numberOfFloors: 12,
    builtUpArea: 42000, occupants: 3500, strength: 0.76, status: 'VERIFIED', finalAdjustment: -1.5,
  },
  {
    ...base, key: 'madhapur-mixed-use-tower', name: 'Sample Mixed-use Tower, Madhapur', type: 'MIXED_USE',
    address: 'Demo address, Madhapur', locality: 'Madhapur', pincode: '500081',
    latitude: 17.4486, longitude: 78.3908, yearConstructed: 2022, numberOfFloors: 18,
    builtUpArea: 36000, occupants: 2800, strength: 0.84, status: 'VERIFIED', finalAdjustment: 1,
  },
  {
    ...base, key: 'hitec-city-business-centre', name: 'Sample Business Centre, HITEC City', type: 'COMMERCIAL',
    address: 'Demo address, HITEC City', locality: 'HITEC City', pincode: '500081',
    latitude: 17.4435, longitude: 78.3772, yearConstructed: 2017, numberOfFloors: 14,
    builtUpArea: 28000, occupants: 2200, strength: 0.72, status: 'VERIFIED', finalAdjustment: -2,
  },
  {
    ...base, key: 'jubilee-hills-residency', name: 'Sample Residency, Jubilee Hills', type: 'RESIDENTIAL',
    address: 'Demo address, Jubilee Hills', locality: 'Jubilee Hills', pincode: '500033',
    latitude: 17.4326, longitude: 78.4071, yearConstructed: 2014, numberOfFloors: 8,
    builtUpArea: 9500, occupants: 280, strength: 0.62, status: 'VERIFIED', finalAdjustment: 0.5,
  },
  {
    ...base, key: 'begumpet-hotel', name: 'Sample Hotel, Begumpet', type: 'HOSPITALITY',
    address: 'Demo address, Begumpet', locality: 'Begumpet', pincode: '500016',
    latitude: 17.4399, longitude: 78.4623, yearConstructed: 2010, numberOfFloors: 9,
    builtUpArea: 14000, occupants: 600, strength: 0.55, status: 'VERIFIED', finalAdjustment: -1,
  },
  {
    ...base, key: 'kukatpally-apartments', name: 'Sample Apartments, Kukatpally', type: 'RESIDENTIAL',
    address: 'Demo address, Kukatpally', locality: 'Kukatpally', pincode: '500072',
    latitude: 17.4948, longitude: 78.3996, yearConstructed: 2012, numberOfFloors: 10,
    builtUpArea: 12000, occupants: 520, strength: 0.5, status: 'VERIFIED', finalAdjustment: 1.5,
  },
  {
    ...base, key: 'kondapur-public-school', name: 'Sample Public School, Kondapur', type: 'EDUCATIONAL',
    address: 'Demo address, Kondapur', locality: 'Kondapur', pincode: '500084',
    latitude: 17.46, longitude: 78.364, yearConstructed: 2008, numberOfFloors: 3,
    builtUpArea: 6500, occupants: 900, strength: 0.44, status: 'VERIFIED', finalAdjustment: 0,
  },
  {
    ...base, key: 'banjara-hills-care-hospital', name: 'Sample Care Hospital, Banjara Hills', type: 'HEALTHCARE',
    address: 'Demo address, Banjara Hills', locality: 'Banjara Hills', pincode: '500034',
    latitude: 17.4126, longitude: 78.4482, yearConstructed: 2005, numberOfFloors: 7,
    builtUpArea: 18000, occupants: 1400, strength: 0.36, status: 'VERIFIED', finalAdjustment: -1,
  },
  {
    ...base, key: 'uppal-industrial-unit', name: 'Sample Industrial Unit, Uppal', type: 'INDUSTRIAL',
    address: 'Demo address, Uppal', locality: 'Uppal', pincode: '500039',
    latitude: 17.4058, longitude: 78.5591, yearConstructed: 2001, numberOfFloors: 2,
    builtUpArea: 15000, occupants: 350, strength: 0.27, status: 'VERIFIED', finalAdjustment: 0.5,
  },
  {
    ...base, key: 'charminar-heritage-market', name: 'Sample Heritage Market, Charminar', type: 'RETAIL',
    address: 'Demo address, Charminar', locality: 'Charminar', pincode: '500002',
    latitude: 17.3616, longitude: 78.4747, yearConstructed: 1975, numberOfFloors: 3,
    builtUpArea: 4200, occupants: 600, strength: 0.17, status: 'VERIFIED', finalAdjustment: 0,
  },
  // Not yet verified: they exist so the admin queue and owner views have something to show.
  {
    ...base, key: 'narsingi-villas', name: 'Sample Villas, Narsingi', type: 'RESIDENTIAL',
    address: 'Demo address, Narsingi', locality: 'Narsingi', pincode: '500075',
    latitude: 17.398, longitude: 78.359, yearConstructed: 2020, numberOfFloors: 2,
    builtUpArea: 5200, occupants: 90, strength: 0.58, status: 'SUBMITTED',
  },
  {
    ...base, key: 'financial-district-campus', name: 'Sample Campus, Financial District', type: 'OFFICE',
    address: 'Demo address, Financial District', locality: 'Financial District', pincode: '500032',
    latitude: 17.4175, longitude: 78.343, yearConstructed: 2021, numberOfFloors: 16,
    builtUpArea: 52000, occupants: 4200, strength: 0.7, status: 'UNDER_REVIEW',
  },
];

// ---------------------------------------------------------------------------
// Deterministic parameter generation (no randomness: same input, same output)
// ---------------------------------------------------------------------------

/** Stable pseudo-random fraction in [0, 1) derived from a string (FNV-1a). */
function fraction(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

function levelFor(strength: number, key: string): QualityLevel {
  const score = strength + (fraction(key) - 0.5) * 0.4;
  if (score < 0.15) return 'NONE';
  if (score < 0.45) return 'BASIC';
  if (score < 0.75) return 'GOOD';
  return 'EXCELLENT';
}

type NumericGenerator = (strength: number, areaKsqm: number, occupants: number) => number;

const NUMERIC_GENERATORS: Record<string, NumericGenerator> = {
  electricityConsumption: (s, area) => Math.round(area * 1000 * lerp(230, 55, s)),
  waterConsumption: (s, _area, occupants) => Math.round((occupants * lerp(150, 50, s) * 365) / 1000),
  solarCapacity: (s, area) => Math.round(area * lerp(6, 30, s)),
  rainwaterHarvestingCapacity: (s, area) => Math.round(area * lerp(6, 24, s)),
  treeCount: (s, area) => Math.round(area * lerp(1, 14, s)),
};

export function generateDemoParameters(
  strength: number,
  context: { builtUpArea: number; occupants: number },
): AssessmentParameters {
  const areaKsqm = context.builtUpArea / 1000;
  const result: Record<string, Record<string, unknown>> = {};

  for (const entry of PARAMETER_ENTRIES) {
    const section = (result[entry.category] ??= {});
    const id = `${entry.category}.${entry.key}`;
    switch (entry.kind) {
      case 'boolean':
        section[entry.key] = strength > fraction(id);
        break;
      case 'percent':
        section[entry.key] = clamp(Math.round((strength + (fraction(id) - 0.5) * 0.3) * 100), 0, 100);
        break;
      case 'level':
        section[entry.key] = levelFor(strength, id);
        break;
      case 'number': {
        const generate = NUMERIC_GENERATORS[entry.key];
        if (generate) section[entry.key] = generate(strength, areaKsqm, context.occupants);
        break;
      }
    }
  }

  // Keep dependent fields consistent: no capacity without the installation.
  const energy = result.energy;
  if (energy && energy.solarInstalled === false) delete energy.solarCapacity;
  const water = result.water;
  if (water && water.rainwaterHarvesting === false) delete water.rainwaterHarvestingCapacity;

  return result as AssessmentParameters;
}

// ---------------------------------------------------------------------------
// Dataset builders
// ---------------------------------------------------------------------------

export interface DemoRecord {
  key: string;
  building: DemoBuildingFields;
  parameters: AssessmentParameters;
  preliminary: ScoreCalculation;
  /** Sample "admin-approved" score. Present only for demo buildings with status VERIFIED. */
  sampleFinal: ScoreResult | null;
}

function applyAdjustment(preliminary: ScoreResult, adjustment: number): ScoreResult {
  const category: CategoryKey = 'energy';
  const max = SCORING_CONFIG.categories[category].maxPoints;
  const breakdown = { ...preliminary.breakdown };
  breakdown[category] = clamp(Math.round((breakdown[category] + adjustment) * 10) / 10, 0, max);
  const totalScore =
    Math.round(CATEGORY_KEYS.reduce((sum, key) => sum + breakdown[key], 0) * 10) / 10;
  return { totalScore, breakdown };
}

export function buildDemoDataset(): DemoRecord[] {
  return DEMO_SEEDS.map(({ key, strength, finalAdjustment, ...building }) => {
    const parameters = generateDemoParameters(strength, building);
    const preliminary = calculatePreliminaryScore(parameters, building);
    const sampleFinal =
      building.status === 'VERIFIED'
        ? applyAdjustment(preliminary, finalAdjustment ?? 0)
        : null;
    return { key, building, parameters, preliminary, sampleFinal };
  });
}

export const demoBuildingId = (key: string): string => `demo-${key}`;

/**
 * Map markers for the offline fallback. Mirrors `GET /api/buildings`: only VERIFIED-status
 * buildings are listed, and every entry has `isDemo: true`.
 */
export function getDemoMapBuildings(): MapBuilding[] {
  return buildDemoDataset()
    .filter((record) => record.building.status === 'VERIFIED')
    .map(({ key, building, sampleFinal, parameters }) => ({
      id: demoBuildingId(key),
      name: building.name,
      type: building.type as BuildingType,
      locality: building.locality,
      latitude: building.latitude,
      longitude: building.longitude,
      status: building.status,
      isDemo: true,
      finalVerifiedScore: sampleFinal?.totalScore ?? null,
      summary: buildMapSummary(parameters, sampleFinal?.breakdown ?? null),
    }));
}
