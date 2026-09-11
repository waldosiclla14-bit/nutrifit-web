import { NextResponse } from 'next/server';

const ICONS = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' as const },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' as const },
];

export async function GET() {
  return NextResponse.json({
    name: 'NutriFit Admin',
    short_name: 'NF Admin',
    description: 'Administración privada de NutriFit: ventas, stock, pedidos y entregas.',
    start_url: '/admin',
    id: '/admin',
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
