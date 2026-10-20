import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mis favoritos',
  description: 'Tus productos guardados en NutriFit.',
  alternates: { canonical: '/favoritos' },
  robots: { index: false, follow: false },
};

export default function FavoritesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
