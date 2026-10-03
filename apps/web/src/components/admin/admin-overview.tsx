'use client';

import Link from 'next/link';
import { Button, Card, EmptyState, LoadingState, buttonStyles } from '@greenscore/ui';
import { api } from '@/lib/api';
import { AdminBuildingsTable, isPending } from './admin-buildings-table';
import { useAdminQuery } from './use-admin-query';

function Stat({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent?: boolean }) {
  return (
    <Card padding="md">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-4xl font-semibold tracking-tight ${accent ? 'text-brand-700' : 'text-ink'}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

export function AdminOverview() {
  const buildings = useAdminQuery((passcode) => api.admin.buildings(passcode));
  const feedback = useAdminQuery((passcode) => api.admin.mlFeedback(passcode));

  if (buildings.loading && !buildings.data) return <LoadingState message="Loading submissions…" />;
  if (buildings.error || !buildings.data) {
    return (
      <EmptyState
        icon="📡"
        title="Couldn’t load submissions"
        description={buildings.error ?? 'Unknown error'}
        action={<Button onClick={buildings.reload}>Try again</Button>}
      />
    );
  }

  const rows = buildings.data;
  const pending = rows.filter(isPending);
  const verified = rows.filter((r) => r.building.status === 'VERIFIED');
  const rejected = rows.filter((r) => r.building.status === 'REJECTED');

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pending review" value={pending.length} hint="Awaiting a human decision" accent />
        <Stat label="Verified" value={verified.length} hint="Published on the public map" />
        <Stat label="Rejected" value={rejected.length} />
        <Stat
          label="ML vs human error"
          value={feedback.data?.mae != null ? `±${feedback.data.mae}` : '—'}
          hint={feedback.data ? `Mean absolute error over ${feedback.data.count} reviews` : undefined}
        />
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Pending submissions</h2>
            <p className="text-sm text-slate-500">Review the evidence, then verify, adjust or reject.</p>
          </div>
          <Link href="/admin/buildings" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
            All buildings
          </Link>
        </div>
        {pending.length === 0 ? (
          <EmptyState
            icon="✅"
            title="Nothing waiting for review"
            description="New submissions from the Add Your Building form show up here."
            action={
              <Link href="/buildings/new" className={buttonStyles()}>
                Add a building
              </Link>
            }
          />
        ) : (
          <AdminBuildingsTable rows={pending} />
        )}
      </section>
    </div>
  );
}
