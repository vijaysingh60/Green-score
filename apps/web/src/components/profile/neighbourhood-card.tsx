import Link from 'next/link';
import type { NeighbourStats } from '@greenscore/types';
import { Badge, Card, CardHeader, cn, scoreColors } from '@greenscore/ui';

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/** How this building compares with the scored buildings around it. */
export function NeighbourhoodCard({ stats }: { stats: NeighbourStats }) {
  const metres = Math.round(stats.radiusKm * 1000);
  const hasNeighbours = stats.count > 0 && stats.average !== null;

  return (
    <Card padding="lg">
      <CardHeader
        title="Neighbour score"
        description={`Scored buildings within ${metres} m`}
        action={
          stats.includesDemo ? (
            <Badge tone="amber" dashed>
              Includes sample scores
            </Badge>
          ) : undefined
        }
      />
      {!hasNeighbours ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No scored buildings within {metres} m yet, so there is nothing to compare with.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-5xl font-semibold tracking-tight text-ink">
              {stats.average}
              <span className="ml-2 text-base font-medium text-slate-500">neighbour average</span>
            </p>
            {stats.delta !== null && (
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-sm font-semibold tabular-nums',
                  stats.delta >= 0 ? 'bg-brand-50 text-brand-800' : 'bg-amber-50 text-amber-800',
                )}
              >
                {stats.delta >= 0 ? `+${stats.delta} above neighbours` : `${stats.delta} below neighbours`}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {stats.rank !== null ? (
              <>
                Ranks <strong className="text-ink">{ordinal(stats.rank)}</strong> of {stats.count + 1} buildings nearby.
              </>
            ) : (
              <>Compared with {stats.count} scored building{stats.count > 1 ? 's' : ''} nearby.</>
            )}
          </p>

          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Best nearby</p>
          <ul className="mt-1 divide-y divide-slate-100">
            {stats.top.map((neighbour) => {
              const colors = scoreColors(neighbour.score);
              return (
                <li key={neighbour.id}>
                  <Link
                    href={`/buildings/${neighbour.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-brand-700"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{neighbour.name}</span>
                      <span className="block text-xs text-slate-500">{Math.round(neighbour.km * 1000)} m away</span>
                    </span>
                    <span
                      className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold tabular-nums"
                      style={{ backgroundColor: colors.soft, color: colors.text }}
                    >
                      {neighbour.score}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}
