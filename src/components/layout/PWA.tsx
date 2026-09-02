'use client';

import { useEffect } from 'react';

export default function PWA() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV === 'development') return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // sin SW no afecta al uso normal
      });
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
