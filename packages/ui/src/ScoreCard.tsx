import type { ReactNode } from 'react';
import type { ScoreKind } from '@greenscore/types';
import { DEMO_SCORE_LABEL, SCORE_KIND_LABELS } from '@greenscore/shared';
import { Badge, type BadgeTone } from './Badge';
import { Card } from './Card';
import { ScoreRing } from './ScoreRing';
import { ADVISORY_COLOR, PROJECTION_COLOR } from './score-colors';
import { cn } from './cn';

export interface ScoreCardProps {
  /** Which of the four separate scores this is. Decides the label, colour and badge. */
  kind: ScoreKind;
  score: number | null;
  max?: number;
  /** Sample data. A demo score is never labelled "Verified Green Score". */
  demo?: boolean;
  /** Extra line under the caption, e.g. "Status: pending human verification". */
  footer?: ReactNode;
  size?: 'md' | 'lg';
  className?: string;
}

interface KindStyle {
  badge: string;
  tone: BadgeTone;
  color?: string;
  dashed: boolean;
}

const KIND_STYLE: Record<ScoreKind, KindStyle> = {
  verified: { badge: '✓ Verified', tone: 'green', dashed: false },
  preliminary: { badge: 'Pending human verification', tone: 'amber', dashed: false },
  mlPredicted: { badge: 'Advisory, not final', tone: 'blue', color: ADVISORY_COLOR, dashed: true },
  projected: { badge: 'Projection', tone: 'blue', color: PROJECTION_COLOR, dashed: true },
};

/**
 * One score with its honest label. The four kinds are visually distinct on purpose, so an
 * unverified number can never be mistaken for the official one.
 */
export function ScoreCard({ kind, score, max = 100, demo = false, footer, size = 'md', className }: ScoreCardProps) {
  const style = KIND_STYLE[kind];
  const isDemoVerified = kind === 'verified' && demo;
  const labels = isDemoVerified ? DEMO_SCORE_LABEL : SCORE_KIND_LABELS[kind];
  const badgeText = isDemoVerified ? 'Demo data' : style.badge;
  const badgeTone: BadgeTone = isDemoVerified ? 'amber' : style.tone;

  return (
    <Card className={cn('flex items-center gap-4', className)} padding="md">
      <ScoreRing
        value={score}
        max={max}
        size={size === 'lg' ? 132 : 96}
        strokeWidth={size === 'lg' ? 11 : 9}
        color={style.color}
        dashed={style.dashed || isDemoVerified}
      />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{labels.label}</p>
        <div className="mt-1.5">
          <Badge tone={badgeTone} dashed={isDemoVerified || style.dashed}>
            {badgeText}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-slate-500">{labels.caption}</p>
        {footer && <div className="mt-1 text-sm font-medium text-slate-700">{footer}</div>}
      </div>
    </Card>
  );
}
