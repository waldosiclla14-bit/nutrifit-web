'use client';

import { useEffect } from 'react';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

function initGA() {
  if (typeof window === 'undefined' || !GA_ID) return;
  if ((window as unknown as { gtag?: unknown }).gtag) return;
  window.dataLayer = window.dataLayer || [];
  const gtag = (...args: unknown[]) => {
    window.dataLayer!.push(args);
  };
  (window as unknown as { gtag: (...a: unknown[]) => void }).gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);
}

export default function GA4() {
  useEffect(() => {
    if (!GA_ID) return;
    initGA();
  }, []);

  return null;
}
