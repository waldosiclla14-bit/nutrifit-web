'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface p-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-4xl">⚠️</p>
        <h1 className="font-display text-2xl uppercase tracking-wide">Algo salió mal</h1>
        <p className="text-sm text-muted">
          Ocurrió un error inesperado. Por favor intenta de nuevo.
        </p>
        {error.digest && (
          <p className="rounded-xl border border-line bg-paper px-3 py-2 font-mono text-xs text-muted">
            Error ID: {error.digest}
          </p>
        )}
        <button onClick={reset} className="btn-accent px-6 py-3 text-sm">
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
