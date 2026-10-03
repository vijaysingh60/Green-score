import type { ReactNode } from 'react';
import { cn } from './cn';
import { scoreColors } from './score-colors';

export interface ScoreRingProps {
  value: number | null;
  max?: number;
  size?: number;
  strokeWidth?: number;
  /** CSS colour override. Defaults to the colour of the score's band. */
  color?: string;
  /** Adds a thin dashed inner ring: the visual cue for advisory / projected scores. */
  dashed?: boolean;
  /** Replaces the default centred number. */
  children?: ReactNode;
  className?: string;
  /** Hide the "/ 100" caption under the number. */
  hideMax?: boolean;
}

export function ScoreRing({
  value,
  max = 100,
  size = 120,
  strokeWidth = 10,
  color,
  dashed = false,
  children,
  className,
  hideMax = false,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = value === null || max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  const stroke = color ?? (value === null ? '#cbd5e1' : scoreColors((value / max) * 100).solid);
  const shown = value === null ? '–' : Math.round(value * 10) / 10;
  const center = size / 2;

  return (
    <div
      role="img"
      aria-label={value === null ? 'No score' : `Score ${shown} out of ${max}`}
      className={cn('relative inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#e8eeea" strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        {dashed && (
          <circle
            cx={center}
            cy={center}
            r={Math.max(radius - strokeWidth / 2 - 5, 1)}
            fill="none"
            stroke={stroke}
            strokeWidth={1.5}
            strokeDasharray="3 4"
            opacity={0.7}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children ?? (
          <div className="leading-none">
            <div className="font-semibold tabular-nums text-ink" style={{ fontSize: size * 0.28 }}>
              {shown}
            </div>
            {!hideMax && (
              <div className="mt-1 text-slate-400" style={{ fontSize: Math.max(10, size * 0.1) }}>
                / {max}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
