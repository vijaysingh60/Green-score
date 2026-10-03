'use client';

import { createContext, useCallback, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button, Card, Input, LoadingState } from '@greenscore/ui';
import { api, ApiRequestError } from '@/lib/api';

/**
 * MVP admin gate: a shared demo passcode kept in sessionStorage and sent as a header.
 * This is NOT real authentication; it only keeps the verify action behind a prompt.
 */

const STORAGE_KEY = 'greenscore-admin-passcode';
const HINT = process.env.NEXT_PUBLIC_ADMIN_HINT;

interface AdminContextValue {
  passcode: string;
  logout: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdmin must be used inside <AdminGate>');
  return value;
}

const readStored = (): string | null => {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export function AdminGate({ children }: { children: ReactNode }) {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Restore a previous session, if the stored passcode is still accepted.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = readStored();
      if (stored) {
        try {
          await api.admin.ping(stored);
          if (!cancelled) setPasscode(stored);
        } catch {
          /* stale passcode: fall through to the login form */
        }
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(() => {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setPasscode(null);
    setInput('');
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.admin.ping(input);
      try {
        window.sessionStorage.setItem(STORAGE_KEY, input);
      } catch {
        /* storage unavailable: the session just won't persist */
      }
      setPasscode(input);
    } catch (e) {
      setError(
        e instanceof ApiRequestError && e.status === 403
          ? 'That passcode is not correct.'
          : e instanceof Error
            ? e.message
            : 'Could not sign in.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (checking) return <LoadingState message="Checking admin session…" className="min-h-[60vh]" />;

  if (!passcode) {
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
        <Card padding="lg" className="w-full">
          <div className="grid size-12 place-items-center rounded-xl bg-brand-50 text-2xl" aria-hidden>
            🔐
          </div>
          <h1 className="mt-4 text-xl font-semibold text-ink">GREENScore admin</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review submissions and publish verified scores. Enter the admin passcode to continue.
          </p>
          <form onSubmit={login} className="mt-5 space-y-4">
            <Input
              label="Admin passcode"
              type="password"
              autoComplete="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              error={error}
              hint={HINT}
              autoFocus
            />
            <Button type="submit" className="w-full" loading={busy} disabled={input.length === 0}>
              Enter admin
            </Button>
          </form>
          <p className="mt-4 text-xs text-slate-400">Hackathon demo gate, not production authentication.</p>
        </Card>
      </div>
    );
  }

  return <AdminContext.Provider value={{ passcode, logout }}>{children}</AdminContext.Provider>;
}
