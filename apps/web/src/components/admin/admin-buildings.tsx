'use client';

import { useState } from 'react';
import { Button, EmptyState, LoadingState, cn } from '@greenscore/ui';
import { api } from '@/lib/api';
import { AdminBuildingsTable, isPending } from './admin-buildings-table';
import { useAdminQuery } from './use-admin-query';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'verified', label: 'Verified' },
  { id: 'rejected', label: 'Rejected' },
] as const;

export function AdminBuildings() {
  const { data, error, loading, reload } = useAdminQuery((passcode) => api.admin.buildings(passcode));
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');

  if (loading && !data) return <LoadingState message="Loading buildings…" />;
  if (error || !data) {
    return (
      <EmptyState icon="📡" title="Couldn’t load buildings" description={error ?? 'Unknown error'} action={<Button onClick={reload}>Try again</Button>} />
    );
  }

  const rows = data.filter((row) => {
    if (filter === 'pending') return isPending(row);
    if (filter === 'verified') return row.building.status === 'VERIFIED';
    if (filter === 'rejected') return row.building.status === 'REJECTED';
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter buildings">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              filter === f.id ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-sm text-slate-500">{rows.length} building(s)</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No buildings match this filter" />
      ) : (
        <AdminBuildingsTable rows={rows} />
      )}
    </div>
  );
}
