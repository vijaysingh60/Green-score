import type { ReactNode } from 'react';
import { AdminGate } from '@/components/admin/admin-gate';
import { AdminShell } from '@/components/admin/admin-shell';

export const metadata = { title: 'Admin' };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGate>
      <AdminShell>{children}</AdminShell>
    </AdminGate>
  );
}
