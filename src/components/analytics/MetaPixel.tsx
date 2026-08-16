'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: unknown;
  }
}

type FbqFn = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  push?: FbqFn;
  loaded?: boolean;
  version?: string;
  queue?: unknown[][];
};

function initPixel() {
  if (typeof window === 'undefined' || window.fbq || !PIXEL_ID) return;
  const w = window as unknown as { fbq?: FbqFn; _fbq?: unknown };
  if (w.fbq) return;
  const n = (function (...args: unknown[]) {
    if (n.callMethod) n.callMethod.apply(n, args);
    else n.queue!.push(Array.from(args));
  }) as FbqFn;
  w.fbq = n;
  if (!w._fbq) w._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  // Snippet oficial de Meta: encola eventos hasta que cargue fbevents.js
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  try {
    const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
    if (typeof gtag === 'function') gtag('event', name, params);
    if (typeof window.fbq === 'function') window.fbq('track', name, params);
  } catch {
    // ignore
  }
}

export default function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (!PIXEL_ID) return;
    initPixel();
    if (typeof window.fbq === 'function') {
      window.fbq('init', PIXEL_ID);
      window.fbq('track', 'PageView');
    }
  }, []);

  useEffect(() => {
    if (!PIXEL_ID || !pathname) return;
    try {
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'PageView');
      }
      const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
      if (typeof gtag === 'function') {
        gtag('event', 'page_view', {
          page_path: pathname + (window.location.search || ''),
        });
      }
    } catch {
      // ignore
    }
  }, [pathname]);

  return null;
}
