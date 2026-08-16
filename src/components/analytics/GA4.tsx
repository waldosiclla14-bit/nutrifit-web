'use client';

import { useEffect } from 'react';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function initGA() {
  if (typeof window === 'undefined' || !GA_ID) return;
  if (window.gtag) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  const gtag = (...args: unknown[]) => {
    window.dataLayer!.push(args);
  };
  window.gtag = gtag;
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
