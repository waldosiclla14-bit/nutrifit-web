import { NextResponse } from 'next/server';

const ICONS = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' as const },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' as const },
];

export async function GET() {
  return NextResponse.json({
    name: 'NutriFit POS',
    short_name: 'NF POS',
    description: 'Punto de venta NutriFit.',
    start_url: '/pos',
    id: '/pos',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B0B0B',
    theme_color: '#0B0B0B',
    lang: 'es',
    dir: 'ltr',
    icons: ICONS,
  });
}
