import type { Metadata, Viewport } from 'next';
import { Anton, Inter } from 'next/font/google';
import PWA from '@/components/layout/PWA';
import { SonnerToaster } from '@/lib/feedback';
import './globals.css';

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-anton',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Nutrifit Store',
  description:
    'Tienda online de suplementos y nutrición deportiva Nutrifit. Compra proteínas, creatina y más.',
  applicationName: 'Nutrifit',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Nutrifit',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    siteName: 'Nutrifit Store',
    title: 'Nutrifit — Suplementos y Nutrición Deportiva',
    description:
      'Compra proteínas, creatina y suplementos con entrega en Metro de Santiago.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Nutrifit Store' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nutrifit — Suplementos y Nutrición Deportiva',
    description:
      'Compra proteínas, creatina y suplementos con entrega en Metro de Santiago.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0B0B',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${anton.variable} ${inter.variable}`}>
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
