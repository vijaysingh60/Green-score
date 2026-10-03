'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge, Button, cn } from '@greenscore/ui';
import { useAdmin } from './admin-gate';

const NAV = [
  { href: '/admin', label: 'Overview', icon: '📊', exact: true },
  { href: '/admin/buildings', label: 'Buildings', icon: '🏢', exact: false },
  { href: '/admin/models', label: 'ML & feedback', icon: '🤖', exact: false },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAdmin();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-ink">Admin</h1>
          <Badge tone="amber" dashed>
            Demo passcode gate
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          Sign out
        </Button>
      </div>

      <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Admin">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                '-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                active ? 'border-brand-600 text-brand-800' : 'border-transparent text-slate-500 hover:text-ink',
              )}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  );
}
