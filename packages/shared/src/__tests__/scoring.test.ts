import { describe, expect, it } from 'vitest';
import type { AssessmentParameters, FinalScore } from '@greenscore/types';
import { CATEGORY_KEYS } from '@greenscore/types';
import {
  IMPROVEMENTS,
  PARAMETER_ENTRIES,
  SCORING_CONFIG,
  TOTAL_POINTS,
  buildDemoDataset,
  buildRecommendations,
  calculatePreliminaryScore,
  calculateProjectedScore,
  estimateCarbon,
  getDemoMapBuildings,
  getImprovementOptions,
  getParameterDefinitions,
  getScoreBand,
  getScoreDisplay,
  getVerifiedTotal,
  isOfficiallyVerified,
  projectImprovements,
  scaleBreakdown,
  simulateMlScore,
  simulateScoreHistory,
} from '../index';

const context = { builtUpArea: 10000, occupants: 500 };

/** An assessment that earns every available point under the current config. */
function perfectAssessment(): AssessmentParameters {
  const params: Record<string, Record<string, unknown>> = {};
  const numeric: Record<string, number> = {
    electricityConsumption: 40 * context.builtUpArea, // 40 kWh/m2/yr, better than 'best'
    waterConsumption: (40 * context.occupants * 365) / 1000, // 40 L/person/day
    solarCapacity: 400,
    rainwaterHarvestingCapacity: 400,
    treeCount: 400,
  };
  for (const entry of PARAMETER_ENTRIES) {
    const section = (params[entry.category] ??= {});
    if (entry.kind === 'boolean') section[entry.key] = true;
    else if (entry.kind === 'percent') section[entry.key] = 100;
    else if (entry.kind === 'level') section[entry.key] = 'EXCELLENT';
    else section[entry.key] = numeric[entry.key];
  }
  return params as AssessmentParameters;
}

describe('scoring framework configuration', () => {
  it('uses the agreed 100-point split', () => {
    expect(TOTAL_POINTS).toBe(100);
    expect(
      Object.fromEntries(CATEGORY_KEYS.map((key) => [key, SCORING_CONFIG.categories[key].maxPoints])),
    ).toEqual({
      energy: 25,
      water: 20,
      waste: 15,
      greenCover: 10,
      materials: 10,
      indoorEnvironment: 5,
      mobility: 5,
      climateResilience: 10,
    });
  });

  it('makes parameter weights add up to each category maximum', () => {
    for (const key of CATEGORY_KEYS) {
      const { maxPoints, parameters } = SCORING_CONFIG.categories[key];
      const sum = Object.values(parameters).reduce((total, p) => total + p.weight, 0);
      expect(sum, key).toBe(maxPoints);
    }
  });

  it('scores exactly the parameters the registry defines, with rules only on numeric kinds', () => {
    for (const key of CATEGORY_KEYS) {
      const definitions = getParameterDefinitions(key);
      const scoring = SCORING_CONFIG.categories[key].parameters as Record<
        string,
        { rule?: unknown }
      >;
      expect(Object.keys(scoring).sort(), key).toEqual(Object.keys(definitions).sort());
      for (const [name, definition] of Object.entries(definitions)) {
        const hasRule = scoring[name]?.rule !== undefined;
        expect(hasRule, `${key}.${name}`).toBe(definition.kind === 'number');
      }
    }
  });
});

describe('calculatePreliminaryScore', () => {
  it('returns zero for an empty assessment', () => {
    const result = calculatePreliminaryScore({}, context);
    expect(result.totalScore).toBe(0);
    expect(Object.values(result.breakdown).every((v) => v === 0)).toBe(true);
    expect(result.unscoredParameters).toEqual([]);
  });

  it('returns 100 for a perfect assessment and never exceeds category maxima', () => {
    const result = calculatePreliminaryScore(perfectAssessment(), context);
    expect(result.totalScore).toBe(100);
    for (const key of CATEGORY_KEYS) {
      expect(result.breakdown[key]).toBe(SCORING_CONFIG.categories[key].maxPoints);
    }
  });

  it('has the documented result shape', () => {
    const result = calculatePreliminaryScore({ waste: { composting: true } }, context);
    expect(Object.keys(result.breakdown).sort()).toEqual([...CATEGORY_KEYS].sort());
    expect(result.breakdown.waste).toBe(2);
    expect(result.totalScore).toBe(2);
    expect(result.methodologyVersion).toBe(SCORING_CONFIG.methodologyVersion);
  });

  it('is deterministic and does not mutate its input', () => {
    const input = perfectAssessment();
    const snapshot = JSON.stringify(input);
    const a = calculatePreliminaryScore(input, context);
    const b = calculatePreliminaryScore(input, context);
    expect(a).toEqual(b);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('ignores junk values instead of throwing or producing NaN', () => {
    const junk = {
      energy: { electricityConsumption: Number.NaN, solarCapacity: -5, hvacEfficiency: 'MAGIC' },
      water: { waterConsumption: Infinity },
    } as unknown as AssessmentParameters;
    const result = calculatePreliminaryScore(junk, context);
    expect(Number.isFinite(result.totalScore)).toBe(true);
    expect(result.totalScore).toBe(0);
  });

  it('excludes size-normalised parameters from the denominator when context is missing', () => {
    const params: AssessmentParameters = {
      energy: { electricityConsumption: 100000, solarCapacity: 10, solarInstalled: true },
    };
    const withoutContext = calculatePreliminaryScore(params);
    // Only values that were provided but cannot be normalised are "unscored".
    // Blank values (e.g. water.waterConsumption) simply earn 0.
    expect(withoutContext.unscoredParameters).toEqual([
      'energy.electricityConsumption',
      'energy.solarCapacity',
    ]);
    // Remaining energy weight is 25 - 8 - 5 = 12; solarInstalled earns 3 of it -> 25 * 3/12.
    expect(withoutContext.breakdown.energy).toBe(6.3);
  });
});

describe('calculateProjectedScore', () => {
  it('shows the gain from a scenario without altering the baseline', () => {
    const baseline: AssessmentParameters = { energy: { solarInstalled: false } };
    const scenario = {
      name: 'Add solar',
      changes: { energy: { solarInstalled: true, solarCapacity: 300 } },
    };
    const before = calculatePreliminaryScore(baseline, context);
    const projected = calculateProjectedScore(baseline, scenario, context);

    expect(projected.baselineTotalScore).toBe(before.totalScore);
    expect(projected.totalScore).toBeGreaterThan(before.totalScore);
    expect(projected.scenario).toEqual(scenario);
    expect(baseline).toEqual({ energy: { solarInstalled: false } });
  });
});

describe('score bands', () => {
  it('maps totals to descriptive bands', () => {
    expect(getScoreBand(0).id).toBe('needs-improvement');
    expect(getScoreBand(39.9).id).toBe('needs-improvement');
    expect(getScoreBand(40).id).toBe('developing');
    expect(getScoreBand(79.9).id).toBe('good');
    expect(getScoreBand(100).id).toBe('leading');
  });
});

describe('verified-score rules', () => {
  const finalScore = (overrides: Partial<FinalScore>): FinalScore => ({
    verificationStatus: 'VERIFIED',
    totalScore: 72,
    breakdown: null,
    verifiedBy: 'admin',
    verifiedAt: '2026-01-01T00:00:00.000Z',
    verificationReason: null,
    verificationId: null,
    methodologyVersion: SCORING_CONFIG.methodologyVersion,
    ...overrides,
  });

  it('only exposes a total for an approved (VERIFIED) decision', () => {
    expect(getVerifiedTotal(finalScore({}))).toBe(72);
    expect(getVerifiedTotal(finalScore({ verificationStatus: 'REJECTED' }))).toBeNull();
    expect(getVerifiedTotal(finalScore({ verificationStatus: 'UNDER_REVIEW' }))).toBeNull();
    expect(getVerifiedTotal(finalScore({ totalScore: null }))).toBeNull();
    expect(getVerifiedTotal(null)).toBeNull();
  });

  it('never treats demo data as officially verified', () => {
    expect(isOfficiallyVerified({ status: 'VERIFIED', isDemo: false })).toBe(true);
    expect(isOfficiallyVerified({ status: 'VERIFIED', isDemo: true })).toBe(false);
    expect(isOfficiallyVerified({ status: 'SUBMITTED', isDemo: false })).toBe(false);
  });

  it('only labels a real, verified building "Verified Green Score"', () => {
    const real = getScoreDisplay({ status: 'VERIFIED', isDemo: false, finalVerifiedScore: 80 });
    const demo = getScoreDisplay({ status: 'VERIFIED', isDemo: true, finalVerifiedScore: 80 });
    const pending = getScoreDisplay({ status: 'UNDER_REVIEW', isDemo: false, finalVerifiedScore: null });
    expect(real.label).toBe('Verified Green Score');
    expect(demo.kind).toBe('demo');
    expect(demo.label).not.toBe('Verified Green Score');
    expect(pending.kind).toBe('unverified');
    expect(pending.score).toBeNull();
  });
});

describe('demo dataset', () => {
  const dataset = buildDemoDataset();

  it('is deterministic', () => {
    expect(buildDemoDataset()).toEqual(dataset);
  });

  it('produces a realistic spread of scores', () => {
    const totals = dataset.map((record) => record.preliminary.totalScore);
    expect(Math.min(...totals)).toBeLessThan(35);
    expect(Math.max(...totals)).toBeGreaterThan(75);
    expect(totals.every((t) => t >= 0 && t <= 100)).toBe(true);
  });

  it('keeps the sample final score separate from the preliminary score', () => {
    for (const record of dataset) {
      if (record.building.status === 'VERIFIED') {
        expect(record.sampleFinal).not.toBeNull();
      } else {
        expect(record.sampleFinal).toBeNull();
      }
    }
    const adjusted = dataset.filter(
      (r) => r.sampleFinal && r.sampleFinal.totalScore !== r.preliminary.totalScore,
    );
    expect(adjusted.length).toBeGreaterThan(0);
  });

  it('marks every map building as demo and lists only VERIFIED-status buildings', () => {
    const markers = getDemoMapBuildings();
    expect(markers.length).toBeGreaterThan(0);
    expect(markers.every((m) => m.isDemo && m.status === 'VERIFIED')).toBe(true);
    expect(markers.every((m) => m.latitude > 17 && m.latitude < 18)).toBe(true);
  });
});

describe('improvements, carbon and simulation helpers', () => {
  const params: AssessmentParameters = {
    energy: { electricityConsumption: 1_500_000, solarInstalled: false, energyEfficientLighting: 30 },
    water: { rainwaterHarvesting: false },
  };

  it('recommends only improvements that raise the score, spread over categories', () => {
    const options = getImprovementOptions(params, context);
    expect(options.length).toBeGreaterThan(5);
    expect(options.every((o) => o.scoreGain >= 0.5)).toBe(true);
    const recs = buildRecommendations(params, context);
    expect(recs).toHaveLength(4);
    expect(recs.every((r) => r.source === 'RULE_BASED')).toBe(true);
    for (const category of CATEGORY_KEYS) {
      expect(recs.filter((r) => r.category === category).length).toBeLessThanOrEqual(2);
    }
  });

  it('projects a higher score without mutating the baseline, and never above 100', () => {
    const snapshot = JSON.stringify(params);
    const result = projectImprovements(params, ['solar', 'rainwater', 'greywater', 'ev'], context);
    expect(result.projected).toBeGreaterThan(result.baseline);
    expect(result.gain).toBeCloseTo(result.projected - result.baseline, 1);
    const everything = projectImprovements(params, IMPROVEMENTS.map((i) => i.id), context);
    expect(everything.projected).toBeLessThanOrEqual(100);
    expect(JSON.stringify(params)).toBe(snapshot);
  });

  it('estimates carbon from electricity and returns null without it', () => {
    const carbon = estimateCarbon({ energy: { electricityConsumption: 100_000, solarCapacity: 50 } }, context);
    expect(carbon?.annualTonnesCO2e).toBe(82);
    expect(carbon?.solarAvoidedTonnesCO2e).toBeGreaterThan(0);
    expect(estimateCarbon({}, context)).toBeNull();
  });

  it('keeps simulated ML scores and history in range', () => {
    for (const total of [0, 40, 100]) {
      const ml = simulateMlScore(total, 'k');
      expect(ml).toBeGreaterThanOrEqual(0);
      expect(ml).toBeLessThanOrEqual(100);
    }
    const history = simulateScoreHistory(72, 'k', new Date('2026-10-01T00:00:00Z'));
    expect(history).toHaveLength(5);
    expect(history.at(-1)?.score).toBe(72);
    expect(history.every((p) => p.kind === 'simulated')).toBe(true);
  });

  it('scales a breakdown to an adjusted total within category limits', () => {
    const prelim = calculatePreliminaryScore(perfectAssessment(), context);
    const scaled = scaleBreakdown(prelim.breakdown, 60);
    const sum = CATEGORY_KEYS.reduce((s, k) => s + scaled[k], 0);
    expect(sum).toBeCloseTo(60, 0);
    for (const key of CATEGORY_KEYS) {
      expect(scaled[key]).toBeLessThanOrEqual(SCORING_CONFIG.categories[key].maxPoints);
    }
  });
});

import type { MapBuilding } from '@greenscore/types';
import { computeNeighbourStats } from '../index';

describe('neighbour score', () => {
  // ~111 m per 0.001 degree of latitude.
  const building = (id: string, dLat: number, score: number | null, isDemo = false): MapBuilding => ({
    id,
    name: `Building ${id}`,
    type: 'OFFICE',
    locality: 'Test',
    latitude: 17.46 + dLat,
    longitude: 78.33,
    status: score === null ? 'DRAFT' : 'VERIFIED',
    isDemo,
    finalVerifiedScore: score,
  });
  const all = [
    building('me', 0, 80),
    building('a', 0.001, 90), //  ~111 m
    building('b', 0.002, 70, true), //  ~222 m, sample score
    building('c', 0.003, 60), //  ~333 m
    building('unscored', 0.001, null), // no score: not a neighbour
    building('far', 0.02, 99), // ~2.2 km: outside 500 m
  ];

  it('averages only scored buildings inside the radius, excluding the building itself', () => {
    const stats = computeNeighbourStats(all[0]!, all);
    expect(stats.count).toBe(3);
    expect(stats.average).toBe(73.3); // (90 + 70 + 60) / 3
    expect(stats.delta).toBe(6.7); // 80 - 73.3
    expect(stats.rank).toBe(2); // only "a" (90) is higher
    expect(stats.includesDemo).toBe(true);
    expect(stats.top.map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('respects the radius', () => {
    expect(computeNeighbourStats(all[0]!, all, 0.15).count).toBe(1); // only "a"
    expect(computeNeighbourStats(all[0]!, all, 5).count).toBe(4); // now "far" too
  });

  it('handles a building with no score, and one with no neighbours', () => {
    const unscored = computeNeighbourStats(all[4]!, all);
    expect(unscored.average).not.toBeNull();
    expect(unscored.delta).toBeNull();
    expect(unscored.rank).toBeNull();

    const lonely = computeNeighbourStats(all[5]!, all);
    expect(lonely).toMatchObject({ count: 0, average: null, delta: null, rank: null, top: [] });
  });
});
