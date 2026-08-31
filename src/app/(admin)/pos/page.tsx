'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSessionCookie, clearToken, getToken } from '@/lib/api';
import { ConfirmProvider } from '@/lib/feedback';
import { Pos } from '@/components/pos/Pos';

export default function PosPage() {
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace('/login?next=/pos');
      return;
    }
    setTokenState(t);
  }, [router]);

  if (!token) {
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
      <Pos
        token={token}
        onLogout={() => {
          clearToken();
          clearSessionCookie();
          router.replace('/login?next=/pos');
        }}
      />
    </ConfirmProvider>
  );
}
