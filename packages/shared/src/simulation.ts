import type { ScoreBreakdown, ScoreHistoryPoint } from '@greenscore/types';
import { CATEGORY_KEYS } from '@greenscore/types';
import { SCORING_CONFIG } from './scoring/config';

/**
 * SIMULATED helpers for the hackathon demo. Anything produced here is fake data and is labelled
 * as simulated wherever it is shown.
 */

function hash01(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

const round1 = (value: number): number => Math.round(value * 10) / 10;
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const SIMULATED_ML_MODEL_VERSION = 'simulated-fallback';

/** A believable fake ML score: close to the preliminary score, off by -4..+5 points. */
export function simulateMlScore(preliminaryTotal: number, key: string): number {
  const offset = (hash01(`ml:${key}`) - 0.45) * 9;
  return round1(clamp(preliminaryTotal + offset, 0, 100));
}

/** A fake 5-point history (12 months back to today) that ends at `currentScore`. */
export function simulateScoreHistory(
  currentScore: number,
  key: string,
  now: Date = new Date(),
): ScoreHistoryPoint[] {
  const start = clamp(currentScore - (6 + hash01(`h:${key}`) * 12), 5, currentScore);
  const monthsBack = [12, 9, 6, 3, 0];
  return monthsBack.map((months, index) => {
    const progress = index / (monthsBack.length - 1);
    const wobble = index === 0 || index === monthsBack.length - 1 ? 0 : (hash01(`w${index}:${key}`) - 0.5) * 3;
    const date = new Date(now);
    date.setMonth(date.getMonth() - months);
    return {
      date: date.toISOString(),
      score: round1(clamp(start + (currentScore - start) * progress + wobble, 0, 100)),
      kind: 'simulated',
      label: 'Simulated history',
    };
  });
}

/**
 * Scale a breakdown so it sums to `targetTotal` (used when an admin adjusts the final score).
 * Each category stays within [0, its max points]; the displayed `totalScore` stays the number
 * the admin chose.
 */
export function scaleBreakdown(breakdown: ScoreBreakdown, targetTotal: number): ScoreBreakdown {
  const current = CATEGORY_KEYS.reduce((sum, key) => sum + breakdown[key], 0);
  const factor = current > 0 ? targetTotal / current : 0;
  const scaled = {} as ScoreBreakdown;
  for (const key of CATEGORY_KEYS) {
    const max = SCORING_CONFIG.categories[key].maxPoints;
    scaled[key] = round1(clamp(breakdown[key] * factor, 0, max));
  }
  return scaled;
}
