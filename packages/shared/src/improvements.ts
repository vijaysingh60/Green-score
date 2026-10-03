import type {
  AssessmentParameters,
  CategoryKey,
  Recommendation,
  RecommendationPriority,
} from '@greenscore/types';
import type { ScoringContext } from './scoring/engine';
import { calculatePreliminaryScore, mergeParameters } from './scoring/engine';

/**
 * Catalogue of practical improvements. ONE list powers both:
 *   - rule-based recommendations on the building profile, and
 *   - the "What-if" simulator (toggle improvements, see the projected score).
 *
 * Each improvement's score gain is measured by the real scoring engine (no hard-coded numbers),
 * so it always matches the methodology in scoring/config.ts.
 */

export interface Improvement {
  id: string;
  icon: string;
  category: CategoryKey;
  title: string;
  description: string;
  /** Parameter changes, computed against the (possibly already improved) current values. */
  apply: (current: AssessmentParameters, context: ScoringContext) => AssessmentParameters;
}

const ksqm = (context: ScoringContext): number => Math.max((context.builtUpArea ?? 1000) / 1000, 0.5);
const atLeast = (current: number | undefined, target: number): number => Math.max(current ?? 0, target);

export const IMPROVEMENTS: readonly Improvement[] = [
  {
    id: 'solar',
    icon: '☀️',
    category: 'energy',
    title: 'Add rooftop solar',
    description: 'Install a rooftop solar PV system to cut grid electricity use and emissions.',
    apply: (p, c) => ({
      energy: { solarInstalled: true, solarCapacity: atLeast(p.energy?.solarCapacity, Math.round(ksqm(c) * 20)) },
    }),
  },
  {
    id: 'led',
    icon: '💡',
    category: 'energy',
    title: 'Switch to 100% LED lighting',
    description: 'Replace remaining conventional lighting with LED fixtures and controls.',
    apply: () => ({ energy: { energyEfficientLighting: 100 } }),
  },
  {
    id: 'hvac',
    icon: '❄️',
    category: 'energy',
    title: 'Upgrade to high-efficiency HVAC',
    description: 'Move to inverter / star-rated cooling and tune set-points to cut the biggest energy load.',
    apply: () => ({ energy: { hvacEfficiency: 'EXCELLENT' } }),
  },
  {
    id: 'monitoring',
    icon: '📊',
    category: 'energy',
    title: 'Install energy monitoring',
    description: 'Add sub-meters or an energy dashboard so wastage is visible and fixable.',
    apply: () => ({ energy: { energyMonitoring: true } }),
  },
  {
    id: 'rainwater',
    icon: '💧',
    category: 'water',
    title: 'Add rainwater harvesting',
    description: 'Capture roof runoff in storage and recharge pits, valuable in Hyderabad’s monsoon.',
    apply: (p, c) => ({
      water: {
        rainwaterHarvesting: true,
        rainwaterHarvestingCapacity: atLeast(p.water?.rainwaterHarvestingCapacity, Math.round(ksqm(c) * 20)),
      },
    }),
  },
  {
    id: 'greywater',
    icon: '♻️',
    category: 'water',
    title: 'Reuse greywater',
    description: 'Treat and reuse greywater for flushing and landscaping.',
    apply: (p) => ({
      water: {
        greywaterRecycling: true,
        wastewaterTreatment: true,
        recycledWaterUsage: atLeast(p.water?.recycledWaterUsage, 50),
      },
    }),
  },
  {
    id: 'fixtures',
    icon: '🚰',
    category: 'water',
    title: 'Fit low-flow fixtures',
    description: 'Replace taps, flushes and showers with water-efficient fixtures.',
    apply: () => ({ water: { waterEfficientFixtures: 100 } }),
  },
  {
    id: 'composting',
    icon: '🍃',
    category: 'waste',
    title: 'Segregate and compost wet waste',
    description: 'Segregate at source and compost organic waste on site.',
    apply: () => ({ waste: { wasteSegregation: true, composting: true, wetWasteManagement: true } }),
  },
  {
    id: 'recycling',
    icon: '🗑️',
    category: 'waste',
    title: 'Set up recycling and e-waste routes',
    description: 'Send dry waste and electronics to authorised recyclers.',
    apply: () => ({ waste: { recycling: true, eWasteManagement: true, dryWasteManagement: true } }),
  },
  {
    id: 'greencover',
    icon: '🌳',
    category: 'greenCover',
    title: 'Increase green coverage',
    description: 'Plant native trees, add landscaping and permeable surfaces to cool the site.',
    apply: (p, c) => ({
      greenCover: {
        greenAreaPercentage: atLeast(p.greenCover?.greenAreaPercentage, 35),
        treeCount: atLeast(p.greenCover?.treeCount, Math.ceil(ksqm(c) * 12)),
        permeableSurfaces: atLeast(p.greenCover?.permeableSurfaces, 40),
        shadedAreas: atLeast(p.greenCover?.shadedAreas, 40),
      },
    }),
  },
  {
    id: 'greenroof',
    icon: '🌿',
    category: 'greenCover',
    title: 'Add a green roof or rooftop garden',
    description: 'Turn unused roof space into vegetation that insulates and absorbs rain.',
    apply: () => ({ greenCover: { greenRoof: true, rooftopGarden: true } }),
  },
  {
    id: 'ev',
    icon: '🚗',
    category: 'mobility',
    title: 'Add EV charging and bike parking',
    description: 'Provide EV chargers and secure bicycle parking for residents and visitors.',
    apply: () => ({ mobility: { evCharging: true, bicycleParking: true } }),
  },
  {
    id: 'coolroof',
    icon: '🏠',
    category: 'climateResilience',
    title: 'Apply a cool roof',
    description: 'A reflective roof coating cuts heat gain during Hyderabad’s hot summers.',
    apply: () => ({ climateResilience: { coolRoof: true, heatReduction: 'EXCELLENT' } }),
  },
  {
    id: 'ventilation',
    icon: '🌬️',
    category: 'climateResilience',
    title: 'Improve natural ventilation',
    description: 'Open up cross-ventilation paths and shading to reduce cooling demand.',
    apply: () => ({ climateResilience: { naturalVentilation: 'EXCELLENT' } }),
  },
  {
    id: 'materials',
    icon: '🧱',
    category: 'materials',
    title: 'Use sustainable and recycled materials',
    description: 'Specify certified, local and recycled-content materials for upgrades.',
    apply: (p) => ({
      materials: {
        sustainableMaterials: atLeast(p.materials?.sustainableMaterials, 60),
        recycledMaterials: atLeast(p.materials?.recycledMaterials, 30),
        localMaterials: atLeast(p.materials?.localMaterials, 50),
      },
    }),
  },
  {
    id: 'envelope',
    icon: '🪟',
    category: 'materials',
    title: 'Upgrade windows and insulation',
    description: 'Efficient glazing and roof / wall insulation keep heat out.',
    apply: () => ({ materials: { efficientWindows: true, insulation: 'EXCELLENT' } }),
  },
  {
    id: 'indoor',
    icon: '🌤️',
    category: 'indoorEnvironment',
    title: 'Improve indoor air and daylight',
    description: 'Low-VOC finishes, filtration and better daylight make spaces healthier.',
    apply: () => ({
      indoorEnvironment: { indoorAirQuality: 'EXCELLENT', daylight: 'EXCELLENT', ventilation: 'EXCELLENT' },
    }),
  },
];

export interface ImprovementOption {
  id: string;
  icon: string;
  category: CategoryKey;
  title: string;
  description: string;
  /** Points this improvement adds on its own, measured by the scoring engine. */
  scoreGain: number;
}

/** Apply improvements in order, so each one sees the effect of the previous ones. */
export function applyImprovements(
  parameters: AssessmentParameters,
  ids: readonly string[],
  context: ScoringContext = {},
): AssessmentParameters {
  let current = parameters;
  for (const id of ids) {
    const improvement = IMPROVEMENTS.find((item) => item.id === id);
    if (improvement) current = mergeParameters(current, improvement.apply(current, context));
  }
  return current;
}

/** Improvements that would still raise the score, biggest gain first. */
export function getImprovementOptions(
  parameters: AssessmentParameters,
  context: ScoringContext = {},
): ImprovementOption[] {
  const baseline = calculatePreliminaryScore(parameters, context).totalScore;
  return IMPROVEMENTS.map(({ apply: _apply, ...meta }) => {
    const after = calculatePreliminaryScore(
      applyImprovements(parameters, [meta.id], context),
      context,
    ).totalScore;
    return { ...meta, scoreGain: Math.round((after - baseline) * 10) / 10 };
  })
    .filter((option) => option.scoreGain >= 0.5)
    .sort((a, b) => b.scoreGain - a.scoreGain);
}

/** "What if" result for a set of selected improvements. A PROJECTION, never an official score. */
export function projectImprovements(
  parameters: AssessmentParameters,
  ids: readonly string[],
  context: ScoringContext = {},
): { baseline: number; projected: number; gain: number } {
  const baseline = calculatePreliminaryScore(parameters, context).totalScore;
  const projected = calculatePreliminaryScore(
    applyImprovements(parameters, ids, context),
    context,
  ).totalScore;
  return { baseline, projected, gain: Math.round((projected - baseline) * 10) / 10 };
}

export type RecommendationDraft = Omit<Recommendation, 'id' | 'buildingId' | 'createdAt' | 'assessmentId'>;

const priorityFor = (gain: number): RecommendationPriority =>
  gain >= 4 ? 'HIGH' : gain >= 2 ? 'MEDIUM' : 'LOW';

/**
 * Rule-based recommendations: the highest-impact improvements, at most two per category so the
 * list covers different weak spots. Source is always RULE_BASED, never presented as AI.
 */
export function buildRecommendations(
  parameters: AssessmentParameters,
  context: ScoringContext = {},
  limit = 4,
): RecommendationDraft[] {
  const perCategory = new Map<CategoryKey, number>();
  const picked: RecommendationDraft[] = [];
  for (const option of getImprovementOptions(parameters, context)) {
    const used = perCategory.get(option.category) ?? 0;
    if (used >= 2) continue;
    perCategory.set(option.category, used + 1);
    picked.push({
      improvementId: option.id,
      icon: option.icon,
      category: option.category,
      title: option.title,
      description: option.description,
      priority: priorityFor(option.scoreGain),
      potentialImpact: { scoreGain: option.scoreGain, note: 'Estimated by the GREENScore prototype model' },
      source: 'RULE_BASED',
    });
    if (picked.length >= limit) break;
  }
  return picked;
}
