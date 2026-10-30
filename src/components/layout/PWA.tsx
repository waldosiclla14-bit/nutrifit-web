'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker.
 *
 * Importante: no se recarga la página cuando hay una versión nueva. Antes se
 * hacía `window.location.reload()` al activarse el worker, y como `sw.js` se
 * autoactivaba (`skipWaiting`), **cada visita cargaba el sitio dos veces**.
 * Ahora el worker nuevo queda en espera y toma el control en la siguiente
 * navegación completa, cuando la pestaña ya no depende del HTML anterior.
 */
export default function PWA() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV === 'development') return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none',
        });
        // Busca actualizaciones sin forzar la activación.
        reg.update().catch(() => {});
      } catch {
        // sin SW no afecta al uso normal
      }
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
