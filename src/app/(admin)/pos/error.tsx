'use client';

import { useEffect } from 'react';

export default function PosError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[PosError]', error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface p-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-4xl">⚠️</p>
        <h1 className="font-display text-2xl uppercase tracking-wide">Error en el POS</h1>
        <p className="text-sm text-muted">
          El punto de venta encontró un error. Por favor recarga la página.
        </p>
        {error.digest && (
          <p className="rounded-xl border border-line bg-paper px-3 py-2 font-mono text-xs text-muted">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex justify-center gap-3">
          <button onClick={reset} className="btn-accent px-6 py-3 text-sm">
            Reintentar
          </button>
          <a href="/admin" className="btn-outline px-6 py-3 text-sm">
            Volver al panel
          </a>
        </div>
      </div>
    </div>
  );
}
