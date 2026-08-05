import type { Metadata, Viewport } from 'next';
import { BRAND } from '@/data/seed';
import { CartProvider } from '@/context/CartContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/layout/CartDrawer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import RecentSalesToast from '@/components/ui/RecentSalesToast';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: {
    default: 'NUTRIFIT | Suplementos Deportivos Premium — Santiago de Chile',
    template: '%s · NUTRIFIT',
  },
  description:
    'Tienda online de suplementos deportivos en Chile. Whey protein, creatina, vitaminas y bienestar. Productos originales, compra por WhatsApp y entrega en estaciones de metro.',
  keywords: [
    'suplementos deportivos chile',
    'whey protein',
    'creatina',
    'vitaminas',
    'proteína',
    'nutrición deportiva',
    'NUTRIFIT',
    'suplementos Santiago',
  ],
  authors: [{ name: 'NutriFit' }],
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    url: BRAND.url,
    siteName: BRAND.name,
    title: 'NUTRIFIT | Suplementos Deportivos Premium',
    description:
      'Potencia tu rendimiento con suplementos deportivos y vitaminas de alta calidad en Chile.',
    images: [{ url: '/img/logo.png', width: 512, height: 512, alt: 'NUTRIFIT' }],
  },
  twitter: {
    card: 'summary',
    title: 'NUTRIFIT | Suplementos Deportivos Premium',
    description:
      'Potencia tu rendimiento con suplementos deportivos y vitaminas de alta calidad en Chile.',
    images: ['/img/logo.png'],
  },
  robots: { index: true, follow: true },
  icons: { icon: '/img/logo.png' },
};

export const viewport: Viewport = {
  themeColor: '#0B0B0B',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
        precedence="default"
      />
      <body>
        <FavoritesProvider>
          <CartProvider>
            <Header />
            <main>{children}</main>
            <Footer />
            <CartDrawer />
            <WhatsAppFloat />
            <RecentSalesToast />
          </CartProvider>
        </FavoritesProvider>
      </body>
    </html>
  );
}
