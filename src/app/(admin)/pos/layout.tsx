import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NUTRIFIT POS',
  robots: { index: false, follow: false },
  manifest: '/pos.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'NF POS',
    statusBarStyle: 'black-translucent',
  },
};

export default function PosLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
