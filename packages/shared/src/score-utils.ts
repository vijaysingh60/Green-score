import type { FinalScore, ScoreBreakdown, VerificationStatus } from '@greenscore/types';
import { CATEGORY_KEYS } from '@greenscore/types';
import { DEMO_SCORE_LABEL, SCORE_KIND_LABELS } from './labels';

/**
 * The ONE place that decides whether a number may be shown as a verified score.
 * UI and API code must go through these helpers instead of re-implementing the rule.
 */

/** A building is officially verified only when an admin approved it AND it is not demo data. */
export function isOfficiallyVerified(building: {
  status: VerificationStatus;
  isDemo: boolean;
}): boolean {
  return building.status === 'VERIFIED' && !building.isDemo;
}

/** The verified total, or null unless the admin decision is VERIFIED. */
export function getVerifiedTotal(finalScore: FinalScore | null | undefined): number | null {
  if (!finalScore) return null;
  if (finalScore.verificationStatus !== 'VERIFIED') return null;
  return typeof finalScore.totalScore === 'number' ? finalScore.totalScore : null;
}

export interface ScoreDisplay {
  kind: 'verified' | 'demo' | 'unverified';
  label: string;
  caption: string;
  score: number | null;
}

/** How to label the headline score for a building (map popup, profile header, cards). */
export function getScoreDisplay(building: {
  status: VerificationStatus;
  isDemo: boolean;
  finalVerifiedScore: number | null;
}): ScoreDisplay {
  const { finalVerifiedScore: score } = building;
  if (building.status === 'VERIFIED' && score !== null) {
    if (building.isDemo) return { kind: 'demo', score, ...DEMO_SCORE_LABEL };
    return { kind: 'verified', score, ...SCORE_KIND_LABELS.verified };
  }
  return {
    kind: 'unverified',
    score: null,
    label: 'Not yet verified',
    caption: 'No admin-verified score has been published for this building',
  };
}

export function emptyBreakdown(): ScoreBreakdown {
  return Object.fromEntries(CATEGORY_KEYS.map((key) => [key, 0])) as ScoreBreakdown;
}
