import type { Metadata } from 'next';

/**
 * Formulario interno de recuperación de clave: nunca debe indexarse.
 * No se bloquea desde robots.txt para que Google pueda leer este noindex.
 */
export const metadata: Metadata = {
  title: 'Recuperar acceso',
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
