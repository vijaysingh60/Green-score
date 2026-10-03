'use client';

import Link from 'next/link';
import type { AdminBuildingRow } from '@greenscore/types';
import { BUILDING_TYPE_LABELS } from '@greenscore/shared';
import { Badge, buttonStyles } from '@greenscore/ui';
import { StatusBadge } from '../status-badge';

const cell = (value: number | null) => (value === null ? <span className="text-slate-300">—</span> : value);

export function isPending(row: AdminBuildingRow): boolean {
  return row.building.status === 'SUBMITTED' || row.building.status === 'UNDER_REVIEW';
}

export function AdminBuildingsTable({ rows }: { rows: AdminBuildingRow[] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-slate-200 bg-white shadow-soft">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3 font-medium">Building</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 text-right font-medium">Preliminary</th>
            <th className="px-3 py-3 text-right font-medium">ML (advisory)</th>
            <th className="px-3 py-3 text-right font-medium">Final</th>
            <th className="px-3 py-3 text-right font-medium">Docs</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.building.id} className="transition-colors hover:bg-brand-50/40">
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{row.building.name}</span>
                  {row.building.isDemo && (
                    <Badge tone="amber" dashed>
                      Demo
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {BUILDING_TYPE_LABELS[row.building.type]} · {row.building.locality}
                </div>
              </td>
              <td className="px-3 py-3.5">
                <StatusBadge status={row.building.status} />
              </td>
              <td className="px-3 py-3.5 text-right tabular-nums text-ink">{cell(row.preliminaryTotal)}</td>
              <td className="px-3 py-3.5 text-right tabular-nums text-ink">{cell(row.mlTotal)}</td>
              <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-ink">{cell(row.finalTotal)}</td>
              <td className="px-3 py-3.5 text-right tabular-nums text-slate-600">{row.documentCount}</td>
              <td className="px-5 py-3.5 text-right">
                <Link
                  href={`/admin/buildings/${row.building.id}`}
                  className={buttonStyles({ size: 'sm', variant: isPending(row) ? 'primary' : 'secondary' })}
                >
                  {isPending(row) ? 'Review' : 'View'}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
