import Link from 'next/link';
import type { MapBuilding } from '@greenscore/types';
import { BUILDING_TYPE_LABELS, getScoreDisplay } from '@greenscore/shared';
import { Badge, Card, SCORE_BAND_COLORS, scoreColors } from '@greenscore/ui';
import { HyderabadMap } from './map/map-loader';

const LEGEND = [
  { id: 'leading', label: '80+ Leading' },
  { id: 'good', label: '60–79 Good' },
  { id: 'developing', label: '40–59 Developing' },
  { id: 'needs-improvement', label: 'Below 40' },
] as const;

export function MapSection({
  buildings,
  source,
}: {
  buildings: MapBuilding[];
  source: 'api' | 'demo-fallback';
}) {
  const ranked = buildings
    .filter((b) => b.finalVerifiedScore !== null)
    .sort((a, b) => (b.finalVerifiedScore ?? 0) - (a.finalVerifiedScore ?? 0));
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

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="relative h-[520px] overflow-hidden rounded-card border border-slate-200 bg-white shadow-soft lg:h-[620px]">
          <HyderabadMap buildings={buildings} />
          <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-xl bg-white/95 px-3 py-2 text-xs shadow-soft ring-1 ring-slate-200">
            <ul className="space-y-1">
              {LEGEND.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-slate-700">
                  <span className="size-3 rounded-full" style={{ backgroundColor: SCORE_BAND_COLORS[item.id].solid }} />
                  {item.label}
                </li>
              ))}
              <li className="flex items-center gap-2 border-t border-slate-100 pt-1 text-slate-500">
                <span className="size-3 rounded-full border-2 border-dashed border-slate-400" />
                Dashed ring = demo data
              </li>
            </ul>
          </div>
        </div>

        <Card padding="none" className="flex max-h-[620px] flex-col overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-base font-semibold text-ink">Greenest buildings</h3>
            <p className="text-sm text-slate-500">Highest final scores on the map</p>
          </div>
          <ol className="flex-1 divide-y divide-slate-100 overflow-y-auto">
            {ranked.slice(0, 8).map((building, index) => {
              const display = getScoreDisplay(building);
              const colors = scoreColors(display.score ?? 0);
              return (
                <li key={building.id}>
                  <Link
                    href={`/buildings/${building.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-brand-50/60"
                  >
                    <span className="w-5 text-sm font-medium text-slate-400 tabular-nums">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{building.name}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {BUILDING_TYPE_LABELS[building.type]} · {building.locality}
                      </span>
                    </span>
                    <span
                      className="rounded-lg px-2 py-1 text-sm font-semibold tabular-nums"
                      style={{ backgroundColor: colors.soft, color: colors.text }}
                    >
                      {display.score}
                    </span>
                  </Link>
                </li>
              );
            })}
            {ranked.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-slate-500">No verified buildings yet.</li>
            )}
          </ol>
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500">
            Want to be on the map? Submit your building and an admin will verify it.
          </div>
        </Card>
      </div>
    </section>
  );
}
