import type { ScoreBand } from '@greenscore/shared';
import { getScoreBand } from '@greenscore/shared';

/**
 * Colours for the descriptive score bands. Hex values (not Tailwind classes) so they work in
 * SVG, canvas and Leaflet markers. Every use also shows the number or label, so colour is
 * never the only signal.
 */
export const SCORE_BAND_COLORS: Record<ScoreBand['id'], { solid: string; soft: string; text: string }> = {
  leading: { solid: '#15803d', soft: '#dcfce7', text: '#14532d' },
  good: { solid: '#4fb87c', soft: '#e3f6ea', text: '#1b6540' },
  developing: { solid: '#d99a1e', soft: '#fdf1d3', text: '#7a5208' },
  'needs-improvement': { solid: '#d9644a', soft: '#fde8e2', text: '#8a2f1c' },
};

export const PROJECTION_COLOR = '#2582ea';
export const ADVISORY_COLOR = '#3b9ef5';

export function scoreColors(totalScore: number) {
  return SCORE_BAND_COLORS[getScoreBand(totalScore).id];
}
