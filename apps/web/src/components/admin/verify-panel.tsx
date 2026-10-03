'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { BuildingProfile } from '@greenscore/types';
import { Badge, Button, Card, CardHeader, Input, Modal, ScoreCard, Textarea, buttonStyles } from '@greenscore/ui';
import { api, ApiRequestError } from '@/lib/api';
import { MlVsHuman } from '../profile/ml-vs-human';
import { useAdmin } from './admin-gate';

type Decision = 'VERIFY' | 'REJECT';

/** The human decision: verify (optionally adjusting the score) or reject, then publish. */
export function VerifyPanel({
  profile,
  onDecided,
}: {
  profile: BuildingProfile;
  onDecided: () => void;
}) {
  const { passcode } = useAdmin();
  const { building, score } = profile;
  const prelim = score?.preliminaryScore?.totalScore ?? 0;
  const ml = score?.mlPredictedScore?.totalScore ?? null;

  const [finalScore, setFinalScore] = useState(String(prelim));
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState<Decision | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justPublished, setJustPublished] = useState(false);

  const final = Number(finalScore);
  const valid = finalScore.trim() !== '' && Number.isFinite(final) && final >= 0 && final <= 100;
  const adjustment = valid ? Math.round((final - prelim) * 10) / 10 : 0;

  const decide = async (decision: Decision) => {
    setBusy(true);
    setError(null);
    try {
      await api.admin.verify(passcode, building.id, {
        decision,
        finalScore: decision === 'VERIFY' ? final : undefined,
        reason: reason.trim() || undefined,
      });
      setConfirm(null);
      setJustPublished(decision === 'VERIFY');
      onDecided();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Could not save the decision.');
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  // --- Already verified: show the published result -------------------------------------
  if (building.status === 'VERIFIED') {
    return (
      <div className="space-y-4">
        {justPublished && (
          <div role="status" className="rounded-card border border-brand-200 bg-brand-50 px-5 py-4 text-brand-900">
            <p className="font-semibold">Published ✓</p>
            <p className="mt-1 text-sm">The final score is now live on the public map.</p>
          </div>
        )}
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Final verified score</p>
        <ScoreCard
          kind="verified"
          score={building.finalVerifiedScore}
          demo={building.isDemo}
          size="lg"
          footer="Status: ✓ VERIFIED"
        />
        {profile.feedback && <MlVsHuman feedback={profile.feedback} />}
        <div className="flex flex-wrap gap-2">
          <Link href="/#map" className={buttonStyles()}>
            See it on the map
          </Link>
          <Link href={`/buildings/${building.id}`} className={buttonStyles({ variant: 'secondary' })}>
            Public profile
          </Link>
        </div>
      </div>
    );
  }

  // --- Pending: the decision form ------------------------------------------------------
  return (
    <Card padding="lg">
      <CardHeader
        title="Human verification"
        description="Only an admin can publish the final score."
        action={building.status === 'REJECTED' ? <Badge tone="red">Previously rejected</Badge> : undefined}
      />

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl bg-amber-50 px-3 py-3">
          <p className="text-xs text-amber-800">Preliminary</p>
          <p className="text-2xl font-semibold tabular-nums text-ink">{prelim}</p>
        </div>
        <div className="rounded-xl bg-ocean-50 px-3 py-3 ring-1 ring-dashed ring-ocean-200">
          <p className="text-xs text-ocean-800">ML (advisory)</p>
          <p className="text-2xl font-semibold tabular-nums text-ink">{ml ?? '—'}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <Input
          label="Final score"
          unit="/ 100"
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step={0.5}
          value={finalScore}
          onChange={(e) => setFinalScore(e.target.value)}
          error={!valid && finalScore !== '' ? 'Enter a score between 0 and 100' : undefined}
          hint={
            valid
              ? adjustment === 0
                ? 'Same as the preliminary score'
                : `${adjustment > 0 ? '+' : ''}${adjustment} vs the preliminary score`
              : undefined
          }
        />
        <input
          aria-label="Adjust final score"
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={valid ? final : prelim}
          onChange={(e) => setFinalScore(e.target.value)}
          className="w-full accent-brand-600"
        />
        <Textarea
          label="Reviewer notes"
          placeholder="What did you check? Why adjust or reject?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          hint="Required when rejecting"
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">
          {error}
        </p>
      )}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Button size="lg" onClick={() => setConfirm('VERIFY')} disabled={!valid || busy}>
          ✓ Verify &amp; publish
        </Button>
        <Button size="lg" variant="secondary" onClick={() => setConfirm('REJECT')} disabled={busy || reason.trim().length < 3}>
          ✗ Reject
        </Button>
      </div>

      <Modal
        open={confirm === 'VERIFY'}
        onClose={() => setConfirm(null)}
        title="Publish the final score?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => decide('VERIFY')} loading={busy}>
              Publish {valid ? final : ''} / 100
            </Button>
          </>
        }
      >
        <p>
          <strong className="text-ink">{building.name}</strong> will be marked <strong>Verified</strong> with a final score of{' '}
          <strong className="tabular-nums text-ink">{final}</strong> and appear on the public map as a Verified Green Score.
          {adjustment !== 0 && ` You adjusted it by ${adjustment > 0 ? '+' : ''}${adjustment} points.`}
        </p>
      </Modal>
      <Modal
        open={confirm === 'REJECT'}
        onClose={() => setConfirm(null)}
        title="Reject this submission?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => decide('REJECT')} loading={busy}>
              Reject
            </Button>
          </>
        }
      >
        <p>
          The owner will see the status <strong>Rejected</strong> and your note: “{reason.trim()}”. No score will be published.
        </p>
      </Modal>
    </Card>
  );
}
