import type { MapBuilding, NeighbourStats } from '@greenscore/types';
import { distanceKm } from './geo';

/** Default radius for "neighbours": buildings within half a kilometre. */
export const NEIGHBOUR_RADIUS_KM = 0.5;

const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Neighbour score: how a building compares with the scored buildings around it.
 *
 * Only buildings that have a score count as neighbours (a verified score, or a sample score on
 * demo data: `includesDemo` says when that is the case so the UI can label it). Pure function,
 * used by the map popup, the building profile and the API so all three agree.
 */
export function computeNeighbourStats(
  target: Pick<MapBuilding, 'id' | 'latitude' | 'longitude' | 'finalVerifiedScore'>,
  all: readonly MapBuilding[],
  radiusKm: number = NEIGHBOUR_RADIUS_KM,
): NeighbourStats {
  const near: NeighbourStats['top'] = [];
  for (const building of all) {
    if (building.id === target.id || building.finalVerifiedScore === null) continue;
    const km = distanceKm(target.latitude, target.longitude, building.latitude, building.longitude);
    if (km <= radiusKm) {
      near.push({
        id: building.id,
        name: building.name,
        score: building.finalVerifiedScore,
        km: Math.round(km * 100) / 100,
        isDemo: building.isDemo,
      });
    }
  }

  const count = near.length;
  const average = count > 0 ? round1(near.reduce((sum, n) => sum + n.score, 0) / count) : null;
  const own = target.finalVerifiedScore;

  return {
    radiusKm,
    count,
    average,
    delta: own !== null && average !== null ? round1(own - average) : null,
    rank: own !== null && count > 0 ? 1 + near.filter((n) => n.score > own).length : null,
    includesDemo: near.some((n) => n.isDemo),
    top: [...near].sort((a, b) => b.score - a.score || a.km - b.km).slice(0, 3),
  };
}
