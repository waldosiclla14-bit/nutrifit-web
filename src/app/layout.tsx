import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Inter } from 'next/font/google';
import PWA from '@/components/layout/PWA';
import { SonnerToaster } from '@/lib/feedback';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bebas',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'NutriFit Chile | Suplementos Originales con Entrega en Metro',
    template: '%s | NutriFit',
  },
  description:
    'Suplementos deportivos originales en Chile: whey protein, creatina y vitaminas. Compra por WhatsApp y recibe en tu estación de Metro de Santiago.',
  applicationName: 'NutriFit',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'NutriFit',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    url: SITE_URL,
    siteName: 'NutriFit Chile',
    title: 'NutriFit Chile | Suplementos Originales con Entrega en Metro',
    description:
      'Suplementos deportivos originales en Chile. Compra por WhatsApp y recibe en Metro de Santiago.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'NutriFit whey y creatina originales' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NutriFit Chile | Suplementos Originales con Entrega en Metro',
    description:
      'Suplementos deportivos originales en Chile. Compra por WhatsApp y recibe en Metro de Santiago.',
    images: ['/opengraph-image'],
  },
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${bebasNeue.variable} ${inter.variable}`}>
        <PWA />
        {children}
        <SonnerToaster
          position="top-center"
          closeButton
          toastOptions={{
            style: { fontFamily: 'var(--font-inter), sans-serif' },
          }}
        />
      </body>
    </html>
  );
}
