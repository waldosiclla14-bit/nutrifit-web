import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'NutriFit Reparto',
  robots: { index: false, follow: false },
  manifest: '/reparto.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'NF Reparto',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#F7F7F5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RepartoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
