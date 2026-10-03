import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export type BadgeTone = 'neutral' | 'green' | 'blue' | 'amber' | 'red';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  green: 'bg-brand-50 text-brand-800 ring-brand-200',
  blue: 'bg-ocean-50 text-ocean-800 ring-ocean-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-rose-50 text-rose-800 ring-rose-200',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Dashed border: used for simulated / demo content so it never looks official. */
  dashed?: boolean;
}

export function Badge({ tone = 'neutral', dashed = false, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        dashed ? 'border border-dashed border-current/50' : 'ring-1 ring-inset',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
