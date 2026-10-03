import type { BuildingProfile } from '@greenscore/types';
import { BUILDING_TYPE_LABELS, getScoreDisplay } from '@greenscore/shared';
import { Badge, Card, CardHeader, ScoreCard } from '@greenscore/ui';
import { StatusBadge } from '../status-badge';

export function ProfileHeader({ profile }: { profile: BuildingProfile }) {
  const { building } = profile;
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={building.status} />
          {building.isDemo && (
            <Badge tone="amber" dashed>
              Demo data
            </Badge>
          )}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{building.name}</h1>
        <p className="mt-1.5 text-slate-600">
          {BUILDING_TYPE_LABELS[building.type]} · {building.locality}, {building.city} {building.pincode}
        </p>
      </div>
    </div>
  );
}

/** The separate scores side by side. The verified slot is only filled once an admin approved it. */
export function ScoreCardsRow({ profile }: { profile: BuildingProfile }) {
  const { building, score } = profile;
  const display = getScoreDisplay(building);
  const prelim = score?.preliminaryScore?.totalScore ?? null;
  const ml = score?.mlPredictedScore?.totalScore ?? null;
  const verified = display.kind !== 'unverified';

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {verified ? (
        <ScoreCard kind="verified" score={display.score} demo={display.kind === 'demo'} size="lg" />
      ) : (
        <ScoreCard
          kind="preliminary"
          score={prelim}
          size="lg"
          footer={
            building.status === 'REJECTED' ? 'Status: REJECTED' : 'Status: PENDING HUMAN VERIFICATION'
          }
        />
      )}
      <ScoreCard kind="mlPredicted" score={ml} size="lg" footer={score?.mlPredictedScore?.modelVersion} />
      {verified ? (
        <ScoreCard kind="preliminary" score={prelim} size="lg" footer="Calculated before review" />
      ) : (
        <Card
          padding="md"
          className="flex flex-col justify-center border-dashed bg-white/60 text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verified Green Score</p>
          <p className="mt-2 text-sm text-slate-500">
            {building.status === 'REJECTED'
              ? 'This submission was rejected by an admin.'
              : 'Published only after a person has reviewed the evidence.'}
          </p>
        </Card>
      )}
    </div>
  );
}

export function DetailsCard({ profile }: { profile: BuildingProfile }) {
  const { building } = profile;
  const rows: Array<[string, string]> = [
    ['Address', building.address],
    ['Locality', `${building.locality}, ${building.city} ${building.pincode}`],
    ['Type', BUILDING_TYPE_LABELS[building.type]],
    ['Built', String(building.yearConstructed)],
    ['Floors', String(building.numberOfFloors)],
    ['Built-up area', `${building.builtUpArea.toLocaleString('en-IN')} m²`],
    ['Occupants', building.occupants.toLocaleString('en-IN')],
  ];
  return (
    <Card padding="lg">
      <CardHeader title="Building details" />
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-0.5 font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

const DOC_TONE = { PENDING: 'amber', VERIFIED: 'green', REJECTED: 'red', MORE_EVIDENCE_REQUIRED: 'blue' } as const;

export function DocumentsCard({ profile }: { profile: BuildingProfile }) {
  return (
    <Card padding="lg">
      <CardHeader
        title="Evidence documents"
        description="Demo documents: names only, nothing is uploaded"
        action={
          <Badge tone="amber" dashed>
            Mock
          </Badge>
        }
      />
      {profile.documents.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No documents attached.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {profile.documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="flex min-w-0 items-center gap-2.5">
                <span aria-hidden>📄</span>
                <span className="truncate text-slate-700">{doc.fileName}</span>
              </span>
              <Badge tone={DOC_TONE[doc.verificationStatus]}>{doc.verificationStatus.replaceAll('_', ' ').toLowerCase()}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
