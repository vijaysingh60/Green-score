import type { MapBuilding } from '@greenscore/types';
import { Badge } from '@greenscore/ui';
import { MapExplorer } from './map/map-explorer';

export function MapSection({
  buildings,
  source,
}: {
  buildings: MapBuilding[];
  source: 'api' | 'demo-fallback';
}) {
  const demoCount = buildings.filter((b) => b.isDemo).length;

  return (
    <section id="map" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Hyderabad sustainability map</h2>
          <p className="mt-1 text-slate-600">
            Scores shown on the map are based on verified building assessments.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="green">{buildings.length} buildings on the map</Badge>
          {demoCount > 0 && (
            <Badge tone="amber" dashed>
              {demoCount} demo
            </Badge>
          )}
        </div>
      </div>

      {demoCount > 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-2.5 text-sm text-amber-900">
          <strong className="font-semibold">Demo data.</strong> Buildings with a dashed ring are sample buildings for the
          hackathon demo, not real verified assessments.
          {source === 'demo-fallback' && ' The API is unreachable, so the bundled demo dataset is shown.'}
        </p>
      )}

      <MapExplorer buildings={buildings} />
    </section>
  );
}
