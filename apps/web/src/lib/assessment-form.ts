import type {
  AssessmentParameters,
  BuildingType,
  DocumentCategory,
  DocumentType,
  MockDocumentInput,
  QualityLevel,
  SubmitBuildingInput,
} from '@greenscore/types';
import { isWithinHyderabad } from '@greenscore/shared';

/**
 * Form state for "Add your building" and its mapping to the API payload.
 * Numeric inputs are kept as strings while typing; blanks mean "not provided" (earns 0 points).
 */
export interface FormState {
  // Basics
  name: string;
  type: BuildingType | '';
  address: string;
  locality: string;
  pincode: string;
  latitude: string;
  longitude: string;
  yearConstructed: string;
  numberOfFloors: string;
  builtUpArea: string;
  occupants: string;
  // Energy
  electricity: string;
  solarInstalled: boolean;
  solarCapacity: string;
  lighting: string;
  hvac: QualityLevel | undefined;
  // Water
  waterUsage: string;
  rainwater: boolean;
  greywater: boolean;
  // Waste
  segregation: boolean;
  recycling: boolean;
  composting: boolean;
  // Green
  greenArea: string;
  trees: string;
  greenRoof: boolean;
  // Mobility
  evCharging: boolean;
  bicycleParking: boolean;
  // Climate
  naturalVentilation: QualityLevel | undefined;
  coolRoof: boolean;
  heatReduction: QualityLevel | undefined;
  // Materials
  sustainableMaterials: string;
  recycledMaterials: string;
  // Documents (names only, MVP)
  documents: string[];
}

export const EMPTY_FORM: FormState = {
  name: '', type: '', address: '', locality: '', pincode: '', latitude: '', longitude: '',
  yearConstructed: '', numberOfFloors: '', builtUpArea: '', occupants: '',
  electricity: '', solarInstalled: false, solarCapacity: '', lighting: '', hvac: undefined,
  waterUsage: '', rainwater: false, greywater: false,
  segregation: false, recycling: false, composting: false,
  greenArea: '', trees: '', greenRoof: false,
  evCharging: false, bicycleParking: false,
  naturalVentilation: undefined, coolRoof: false, heatReduction: undefined,
  sustainableMaterials: '', recycledMaterials: '',
  documents: [],
};

/** A plausible mid-range building so a demo can be filled in with one click. */
export const SAMPLE_FORM: FormState = {
  name: 'Sample Green Heights',
  type: 'RESIDENTIAL',
  address: 'Demo address, Road No. 12',
  // Manikonda has no demo building nearby, so the new pin is easy to spot on the map.
  locality: 'Manikonda',
  pincode: '500089',
  latitude: '17.4052',
  longitude: '78.3894',
  yearConstructed: '2018',
  numberOfFloors: '12',
  builtUpArea: '14000',
  occupants: '620',
  electricity: '1150000',
  solarInstalled: true,
  solarCapacity: '90',
  lighting: '85',
  hvac: 'GOOD',
  waterUsage: '34000',
  rainwater: true,
  greywater: false,
  segregation: true,
  recycling: true,
  composting: false,
  greenArea: '24',
  trees: '110',
  greenRoof: false,
  evCharging: false,
  bicycleParking: true,
  naturalVentilation: 'GOOD',
  coolRoof: false,
  heatReduction: 'BASIC',
  sustainableMaterials: '40',
  recycledMaterials: '20',
  documents: ['Electricity bills FY25.pdf', 'Solar installation proof.pdf'],
};

const num = (value: string): number | undefined => {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const pct = (value: string): number | undefined => {
  const parsed = num(value);
  return parsed === undefined ? undefined : Math.min(100, Math.max(0, parsed));
};

/** Form -> assessment parameters (the shape the scoring engine, API and ML service share). */
export function buildParameters(s: FormState): AssessmentParameters {
  return {
    energy: {
      electricityConsumption: num(s.electricity),
      solarInstalled: s.solarInstalled,
      solarCapacity: s.solarInstalled ? num(s.solarCapacity) : undefined,
      energyEfficientLighting: pct(s.lighting),
      hvacEfficiency: s.hvac,
    },
    water: {
      waterConsumption: num(s.waterUsage),
      rainwaterHarvesting: s.rainwater,
      greywaterRecycling: s.greywater,
    },
    waste: {
      wasteSegregation: s.segregation,
      recycling: s.recycling,
      composting: s.composting,
    },
    greenCover: {
      greenAreaPercentage: pct(s.greenArea),
      treeCount: num(s.trees),
      greenRoof: s.greenRoof,
    },
    mobility: {
      evCharging: s.evCharging,
      bicycleParking: s.bicycleParking,
    },
    climateResilience: {
      naturalVentilation: s.naturalVentilation,
      coolRoof: s.coolRoof,
      heatReduction: s.heatReduction,
    },
    materials: {
      sustainableMaterials: pct(s.sustainableMaterials),
      recycledMaterials: pct(s.recycledMaterials),
    },
  };
}

export function guessDocument(fileName: string): MockDocumentInput {
  const name = fileName.toLowerCase();
  let documentType: DocumentType = 'OTHER';
  let category: DocumentCategory = 'general';
  if (/electric|power|bill/.test(name)) [documentType, category] = ['ELECTRICITY_BILL', 'energy'];
  else if (/water/.test(name)) [documentType, category] = ['WATER_BILL', 'water'];
  else if (/solar/.test(name)) [documentType, category] = ['SOLAR_INSTALLATION_PROOF', 'energy'];
  else if (/rain|harvest/.test(name)) [documentType, category] = ['RAINWATER_HARVESTING_PROOF', 'water'];
  else if (/waste/.test(name)) [documentType, category] = ['WASTE_MANAGEMENT_RECORD', 'waste'];
  else if (/photo|site|image/.test(name)) documentType = 'SITE_PHOTO';
  else if (/plan|drawing/.test(name)) documentType = 'BUILDING_PLAN';
  return { fileName, documentType, category };
}

export function buildSubmission(s: FormState): SubmitBuildingInput {
  return {
    building: {
      name: s.name.trim(),
      type: s.type as BuildingType,
      address: s.address.trim(),
      locality: s.locality,
      city: 'Hyderabad',
      pincode: s.pincode.trim(),
      latitude: Number(s.latitude),
      longitude: Number(s.longitude),
      yearConstructed: Number(s.yearConstructed),
      numberOfFloors: Number(s.numberOfFloors),
      builtUpArea: Number(s.builtUpArea),
      occupants: Number(s.occupants),
    },
    parameters: buildParameters(s),
    documents: s.documents.map(guessDocument),
  };
}

export type BasicsErrors = Partial<Record<keyof FormState, string>>;

/** Validate the "Basics" step (the only required fields). */
export function validateBasics(s: FormState): BasicsErrors {
  const errors: BasicsErrors = {};
  const nowYear = new Date().getFullYear();
  if (s.name.trim().length < 2) errors.name = 'Enter the building name';
  if (!s.type) errors.type = 'Choose a building type';
  if (s.address.trim().length < 3) errors.address = 'Enter the address';
  if (!s.locality) errors.locality = 'Choose a locality';
  if (!/^[1-9]\d{5}$/.test(s.pincode.trim())) errors.pincode = 'Enter a 6-digit pincode';
  const lat = Number(s.latitude);
  const lng = Number(s.longitude);
  if (!s.latitude || !s.longitude || !isWithinHyderabad(lat, lng)) {
    errors.latitude = 'Coordinates must be inside the Hyderabad region';
  }
  const year = Number(s.yearConstructed);
  if (!Number.isInteger(year) || year < 1800 || year > nowYear + 5) errors.yearConstructed = `Enter a year between 1800 and ${nowYear + 5}`;
  const floors = Number(s.numberOfFloors);
  if (!Number.isInteger(floors) || floors < 1) errors.numberOfFloors = 'At least 1 floor';
  if (!(Number(s.builtUpArea) > 0)) errors.builtUpArea = 'Enter the built-up area in m²';
  const occupants = Number(s.occupants);
  if (s.occupants === '' || !Number.isInteger(occupants) || occupants < 0) errors.occupants = 'Enter the number of occupants';
  return errors;
}
