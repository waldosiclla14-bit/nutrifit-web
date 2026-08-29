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

  if (!token) return null;
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
