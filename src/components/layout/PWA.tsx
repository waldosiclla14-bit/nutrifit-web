'use client';

import { useEffect } from 'react';

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

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              window.location.reload();
            }
          });
        });

        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        reg.update();
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
