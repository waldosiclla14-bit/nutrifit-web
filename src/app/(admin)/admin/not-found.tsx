import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface p-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-4xl">🔍</p>
        <h1 className="font-display text-2xl uppercase tracking-wide">Página no encontrada</h1>
        <p className="text-sm text-muted">
          La página que buscas no existe en el administrador.
        </p>
        <Link href="/admin" className="btn-accent inline-block px-6 py-3 text-sm">
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
