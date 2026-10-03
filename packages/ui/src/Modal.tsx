'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from './cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Buttons shown in the footer. */
  actions?: ReactNode;
  className?: string;
}

/** Accessible modal built on the native <dialog> (focus trap + Escape handled by the browser). */
export function Modal({ open, onClose, title, children, actions, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose(); // click on the backdrop
      }}
      className={cn(
        'm-auto w-[min(32rem,calc(100vw-2rem))] rounded-card border border-slate-200 bg-white p-0 shadow-lift',
        'backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]',
        className,
      )}
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <div className="mt-3 text-sm text-slate-600">{children}</div>
      </div>
      {actions && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-3">{actions}</div>}
    </dialog>
  );
}
