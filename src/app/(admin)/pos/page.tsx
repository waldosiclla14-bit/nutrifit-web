'use client';

import { Suspense, lazy, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchSession, logoutServer } from '@/lib/api';
import { ConfirmProvider } from '@/lib/feedback';

const Pos = lazy(() => import('@/components/pos/Pos').then((m) => ({ default: m.Pos })));

export default function PosPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // La sesión vive en cookie HttpOnly: se valida contra el servidor.
    fetchSession().then((s) => {
      if (cancelled) return;
      if (!s) {
        // Navegación dura: router.replace suave puede atascarse en iOS/PWA
        window.location.href = '/login?next=/pos';
        return;
      }
      setAuthed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!authed) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface">
        <div className="space-y-4 p-6 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-ink border-t-transparent" />
          <p className="text-sm text-muted">Cargando POS…</p>
        </div>
      </div>
    );
  }
  return (
    <ConfirmProvider>
      <Suspense
        fallback={
          <div className="flex h-dvh items-center justify-center bg-surface">
            <div className="space-y-4 p-6 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-ink border-t-transparent" />
              <p className="text-sm text-muted">Cargando POS…</p>
            </div>
          </div>
        }
      >
        <Pos
          token=""
          onLogout={() => {
            logoutServer().finally(() => router.replace('/login?next=/pos'));
          }}
        />
      </Suspense>
    </ConfirmProvider>
  );
}
