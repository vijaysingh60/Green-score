'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { buttonStyles, cn } from '@greenscore/ui';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#1f7f4d" />
      <path
        d="M9 21.5c0-6.2 4.4-10.7 13.5-11.5-.4 8.6-4.6 13.1-10.6 13.1-1 0-2-.1-2.9-.4"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 24c2.2-4.5 5.2-7.6 9-9.6" fill="none" stroke="#b3e6c6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const LINKS = [
  { href: '/#map', label: 'Map' },
  { href: '/admin', label: 'Admin' },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-[1100] border-b border-slate-200/70 bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="GREENScore Hyderabad home">
          <LogoMark className="size-8" />
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight text-ink">
              GREEN<span className="text-brand-600">Score</span>
            </span>
            <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Hyderabad</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {LINKS.map((link) => {
            const active = link.href !== '/#map' && pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-ink',
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/buildings/new" className={buttonStyles({ size: 'sm' })}>
            Add Your Building
          </Link>
        </nav>
      </div>
    </header>
  );
}
