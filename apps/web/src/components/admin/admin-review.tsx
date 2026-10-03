'use client';

import Link from 'next/link';
import { Button, EmptyState, LoadingState } from '@greenscore/ui';
import { api } from '@/lib/api';
import { DetailsCard, DocumentsCard, ProfileHeader, ScoreCardsRow } from '../profile/profile-parts';
import { ScoreBreakdown } from '../profile/score-breakdown';
import { ParametersCard } from './parameters-card';
import { useAdminQuery } from './use-admin-query';
import { VerifyPanel } from './verify-panel';

export function AdminReview({ id }: { id: string }) {
  const { data: profile, error, loading, reload } = useAdminQuery((passcode) => api.admin.building(passcode, id));

  if (loading && !profile) return <LoadingState message="Loading submission…" />;
  if (error || !profile) {
    return (
      <EmptyState
        icon="🔎"
        title="Couldn’t load this submission"
        description={error ?? 'Unknown error'}
        action={<Button onClick={reload}>Try again</Button>}
      />
    );
  }

  const breakdown = profile.building.verifiedBreakdown ?? profile.score?.preliminaryScore?.breakdown ?? null;

  return (
    <div className="space-y-6">
      <Link href="/admin/buildings" className="inline-flex text-sm font-medium text-slate-500 hover:text-brand-700">
        ← All buildings
      </Link>
      <ProfileHeader profile={profile} />
      <ScoreCardsRow profile={profile} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {breakdown && (
            <ScoreBreakdown
              breakdown={breakdown}
              title="Score breakdown"
              description={profile.building.verifiedBreakdown ? 'Points in the verified score' : 'Points in the preliminary score'}
            />
          )}
          <ParametersCard parameters={profile.parameters} />
          <DocumentsCard profile={profile} />
          <DetailsCard profile={profile} />
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          {/* No `key` on status: remounting would discard the "Published" confirmation state. */}
          <VerifyPanel profile={profile} onDecided={reload} />
        </div>
      </div>
    </div>
  );
}
