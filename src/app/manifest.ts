import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NutriFit Chile | Suplementos Originales',
    short_name: 'NutriFit',
    description:
      'Suplementos deportivos originales en Chile: whey, creatina y vitaminas. Compra por WhatsApp y recibe en Metro.',
    start_url: '/',
    id: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFFFFF',
    theme_color: '#FFFFFF',
    lang: 'es',
    categories: ['shopping', 'food'],
    shortcuts: [
      {
        name: 'Vender (POS)',
        short_name: 'Vender',
        url: '/pos',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Órdenes',
        short_name: 'Órdenes',
        url: '/admin',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
