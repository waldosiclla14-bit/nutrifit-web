import type { Metadata, Viewport } from 'next';
import { Anton, Inter } from 'next/font/google';
import PWA from '@/components/layout/PWA';
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
      </body>
    </html>
  );
}
