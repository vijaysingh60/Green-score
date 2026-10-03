'use client';

import type { ReactNode } from 'react';
import { cn } from './cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  label?: ReactNode;
  value: T | undefined;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/** Pick one of a few options (e.g. None / Basic / Good / Excellent). */
export function SegmentedControl<T extends string>({ label, value, options, onChange, className }: SegmentedControlProps<T>) {
  return (
    <div className={className}>
      {label && <p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>}
      <div role="radiogroup" className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-slate-100 p-1">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'h-9 rounded-lg px-2 text-sm font-medium transition-colors',
                selected ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500 hover:text-slate-800',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
