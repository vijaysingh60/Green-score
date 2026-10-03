import type { VerificationStatus } from '@greenscore/types';
import { VERIFICATION_STATUS_LABELS } from '@greenscore/shared';
import { Badge, type BadgeTone } from '@greenscore/ui';

const TONES: Record<VerificationStatus, BadgeTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'amber',
  UNDER_REVIEW: 'blue',
  VERIFIED: 'green',
  REJECTED: 'red',
};

/** Verification status of a building. SUBMITTED reads as "Pending human verification". */
export function StatusBadge({ status }: { status: VerificationStatus }) {
  const text =
    status === 'VERIFIED' ? '✓ Verified' : status === 'SUBMITTED' ? 'Pending human verification' : VERIFICATION_STATUS_LABELS[status];
  return <Badge tone={TONES[status]}>{text}</Badge>;
}
