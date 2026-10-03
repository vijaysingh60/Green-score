import Link from 'next/link';
import type { BuildingProfile } from '@greenscore/types';
import { buttonStyles } from '@greenscore/ui';
import { CarbonCard } from './carbon-card';
import { DetailsCard, DocumentsCard, ProfileHeader, ScoreCardsRow } from './profile-parts';
import { MlVsHuman } from './ml-vs-human';
import { NeighbourhoodCard } from './neighbourhood-card';
import { RecommendationsCard } from './recommendations-card';
import { ScoreBreakdown } from './score-breakdown';
import { ScoreHistoryChart } from './score-history-chart';
import { WhatIfSimulator } from './what-if-simulator';

/** Public building profile. Shows every score with its honest label. */
export function BuildingProfileView({ profile, submitted }: { profile: BuildingProfile; submitted: boolean }) {
  const { building, score, parameters } = profile;
  const verifiedBreakdown = building.verifiedBreakdown;
  const breakdown = verifiedBreakdown ?? score?.preliminaryScore?.breakdown ?? null;
  const headline = building.finalVerifiedScore ?? score?.preliminaryScore?.totalScore ?? null;
  const rejectedReason = building.status === 'REJECTED' ? score?.finalVerifiedScore?.verificationReason : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <Link href="/#map" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        ← Back to the map
      </Link>

      {submitted && (
        <div role="status" className="rounded-card border border-brand-200 bg-brand-50 px-5 py-4 text-brand-900">
          <p className="font-semibold">Building submitted for verification 🎉</p>
          <p className="mt-1 text-sm">
            Here is your preliminary score, an advisory ML prediction and recommendations. An admin will review the
            evidence; the official Verified Green Score appears here, and your building joins the public map, once it is
            approved.
          </p>
          <Link href="/admin/buildings" className={buttonStyles({ size: 'sm', variant: 'secondary', className: 'mt-3' })}>
            Open admin to review (demo)
          </Link>
        </div>
      )}

      {rejectedReason !== undefined && rejectedReason !== null && (
        <div role="alert" className="rounded-card border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900">
          <p className="font-semibold">Rejected by admin</p>
          <p className="mt-1 text-sm">{rejectedReason}</p>
        </div>
      )}

      <ProfileHeader profile={profile} />
      <ScoreCardsRow profile={profile} />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        {breakdown && (
          <ScoreBreakdown
            breakdown={breakdown}
            title="Score breakdown"
            description={verifiedBreakdown ? 'Points in the verified score' : 'Points in the preliminary score'}
          />
        )}
        <div className="space-y-6">
          <CarbonCard carbon={profile.carbon} />
          {profile.neighbours && <NeighbourhoodCard stats={profile.neighbours} />}
          {profile.feedback && <MlVsHuman feedback={profile.feedback} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <RecommendationsCard recommendations={profile.recommendations} />
        <ScoreHistoryChart history={profile.history} />
      </div>

      {parameters && headline !== null && (
        <WhatIfSimulator
          parameters={parameters}
          builtUpArea={building.builtUpArea}
          occupants={building.occupants}
          currentScore={headline}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailsCard profile={profile} />
        <DocumentsCard profile={profile} />
      </div>
    </div>
  );
}
