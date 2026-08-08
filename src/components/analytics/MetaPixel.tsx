'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

function initPixel() {
  if (typeof window === 'undefined' || window.fbq || !PIXEL_ID) return;
  // Carga manual del script de Meta Pixel
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
  const q = (window as unknown as { fbq: (...a: unknown[]) => void }).fbq;
  if (typeof q === 'function') return;
  const fbq = ((...args: unknown[]) => {
    if (typeof window.fbq === 'function') window.fbq(...args);
  }) as unknown as (...a: unknown[]) => void;
  window.fbq = fbq;
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
