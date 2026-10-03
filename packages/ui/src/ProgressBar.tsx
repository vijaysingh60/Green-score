import type { ReactNode } from 'react';
import { cn } from './cn';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: ReactNode;
  /** Show "value / max" on the right. */
  showValue?: boolean;
  /** CSS colour for the filled part. Defaults to the brand green. */
  color?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  color = '#2c9e61',
  size = 'md',
  className,
}: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
          <span className="font-medium text-slate-700">{label}</span>
          {showValue && (
            <span className="tabular-nums text-slate-500">
              <span className="font-semibold text-ink">{Math.round(value * 10) / 10}</span> / {max}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(value * 10) / 10}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn('w-full overflow-hidden rounded-full bg-slate-100', size === 'sm' ? 'h-1.5' : 'h-2.5')}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
