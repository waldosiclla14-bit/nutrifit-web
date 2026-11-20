import { NextResponse } from 'next/server';

const ICONS = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' as const },
  { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' as const },
];

/**
 * PWA exclusiva del repartidor. `start_url` y `scope` apuntan a /reparto para
 * que se abra sola en su pantalla de inicio, sin pasar por el panel admin.
 */
export async function GET() {
  return NextResponse.json({
    name: 'NutriFit Reparto',
    short_name: 'NF Reparto',
    description: 'Ruta, entregas y rendición del repartidor de NutriFit.',
    start_url: '/reparto',
    id: '/reparto',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F7F7F5',
    theme_color: '#F7F7F5',
    lang: 'es',
    dir: 'ltr',
    icons: ICONS,
  });
}
