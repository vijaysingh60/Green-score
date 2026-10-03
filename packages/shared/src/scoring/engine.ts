import type {
  AssessmentParameters,
  ProjectedScenario,
  ProjectedScore,
  ScoreBreakdown,
  ScoreResult,
} from '@greenscore/types';
import { CATEGORY_KEYS } from '@greenscore/types';
import { getParameterDefinitions } from '../parameters';
import type { NumericRule, ScoreBand, ScoringConfig } from './config';
import { SCORING_CONFIG } from './config';

/**
 * Centralised scoring engine: pure, deterministic, framework-free.
 * No React, no Express, no database, no clock. Safe to call from the web (previews),
 * the API (authoritative) and tests.
 *
 * The result is the PRELIMINARY score. It never touches the ML or verified score slots.
 */

/** Facts about the building that numeric parameters are normalised against. */
export interface ScoringContext {
  /** Built-up area in square metres. */
  builtUpArea?: number;
  occupants?: number;
}

export interface ScoreCalculation extends ScoreResult {
  methodologyVersion: string;
  /** "category.parameter" entries that could not be scored because context was missing. */
  unscoredParameters: string[];
}

const round1 = (value: number): number => Math.round(value * 10) / 10;
const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Returns a 0..1 fraction, or `null` when the context needed to score the rule is missing. */
function scoreNumeric(rule: NumericRule, value: unknown, context: ScoringContext): number | null {
  if (!isFiniteNumber(value) || value <= 0) return 0;

  if (rule.type === 'targetPerThousandSqm') {
    const area = context.builtUpArea;
    if (!isFiniteNumber(area) || area <= 0) return null;
    return clamp01(value / (area / 1000) / rule.target);
  }

  let intensity: number;
  if (rule.metric === 'kwhPerSqmYear') {
    const area = context.builtUpArea;
    if (!isFiniteNumber(area) || area <= 0) return null;
    intensity = value / area;
  } else {
    const occupants = context.occupants;
    if (!isFiniteNumber(occupants) || occupants <= 0) return null;
    intensity = (value * 1000) / 365 / occupants;
  }
  return clamp01((rule.worst - intensity) / (rule.worst - rule.best));
}

function scoreParameter(
  kind: string,
  value: unknown,
  rule: NumericRule | undefined,
  context: ScoringContext,
  config: ScoringConfig,
): number | null {
  if (value === undefined || value === null) return 0; // not provided: no credit
  switch (kind) {
    case 'boolean':
      return value === true ? 1 : 0;
    case 'percent':
      return isFiniteNumber(value) ? clamp01(value / 100) : 0;
    case 'level':
      return typeof value === 'string' && value in config.levelFractions
        ? (config.levelFractions[value as keyof ScoringConfig['levelFractions']] ?? 0)
        : 0;
    case 'number':
      return rule ? scoreNumeric(rule, value, context) : null;
    default:
      return null;
  }
}

/**
 * Calculate the preliminary (rule-based) score for an assessment's parameters.
 *
 * @param parameters `assessment.parameters`
 * @param context building facts used to normalise consumption / capacity parameters
 * @param config scoring configuration; defaults to the live `SCORING_CONFIG`
 */
export function calculatePreliminaryScore(
  parameters: AssessmentParameters,
  context: ScoringContext = {},
  config: ScoringConfig = SCORING_CONFIG,
): ScoreCalculation {
  const breakdown = {} as ScoreBreakdown;
  const unscoredParameters: string[] = [];
  let total = 0;

  for (const category of CATEGORY_KEYS) {
    const categoryConfig = config.categories[category];
    const definitions = getParameterDefinitions(category);
    const values = (parameters[category] ?? {}) as Record<string, unknown>;
    const scoring = categoryConfig.parameters as Record<
      string,
      { weight: number; rule?: NumericRule }
    >;

    let earned = 0;
    let possible = 0;
    for (const [key, definition] of Object.entries(definitions)) {
      const entry = scoring[key];
      if (!entry) continue;
      const fraction = scoreParameter(definition.kind, values[key], entry.rule, context, config);
      if (fraction === null) {
        unscoredParameters.push(`${category}.${key}`);
        continue;
      }
      earned += entry.weight * fraction;
      possible += entry.weight;
    }

    const points = possible > 0 ? (categoryConfig.maxPoints * earned) / possible : 0;
    breakdown[category] = round1(points);
    total += breakdown[category];
  }

  return {
    totalScore: round1(total),
    breakdown,
    methodologyVersion: config.methodologyVersion,
    unscoredParameters,
  };
}

/** Overlay scenario `changes` on a baseline, category by category. Inputs are not mutated. */
export function mergeParameters(
  baseline: AssessmentParameters,
  changes: AssessmentParameters,
): AssessmentParameters {
  const merged: Record<string, unknown> = {};
  for (const category of CATEGORY_KEYS) {
    const base = baseline[category];
    const change = changes[category];
    if (base || change) merged[category] = { ...base, ...change };
  }
  return merged as AssessmentParameters;
}

/**
 * "What if" scoring: the same engine applied to baseline + scenario changes.
 * The result is a PROJECTION. It is never stored as, or compared as, a verified score.
 */
export function calculateProjectedScore(
  baseline: AssessmentParameters,
  scenario: ProjectedScenario,
  context: ScoringContext = {},
  config: ScoringConfig = SCORING_CONFIG,
): Omit<ProjectedScore, 'calculatedAt'> {
  const before = calculatePreliminaryScore(baseline, context, config);
  const after = calculatePreliminaryScore(mergeParameters(baseline, scenario.changes), context, config);
  return {
    totalScore: after.totalScore,
    breakdown: after.breakdown,
    methodologyVersion: after.methodologyVersion,
    scenario,
    baselineTotalScore: before.totalScore,
  };
}

/** Descriptive band for a 0-100 total (not a certification tier). */
export function getScoreBand(totalScore: number, config: ScoringConfig = SCORING_CONFIG): ScoreBand {
  let current = config.bands[0] as ScoreBand;
  for (const band of config.bands) {
    if (totalScore >= band.min) current = band;
  }
  return current;
}
