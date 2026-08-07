import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-px flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="font-display text-8xl uppercase tracking-wide text-accentDeep">404</p>
      <h1 className="mt-2 font-display text-2xl uppercase tracking-wide sm:text-3xl">
        Página no encontrada
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        La página que buscas no existe o fue movida. Vuelve al catálogo para seguir entrenando con
        confianza.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          Ir al inicio
        </Link>
        <Link href="/productos" className="btn-outline">
          Ver catálogo
        </Link>
      </div>
    </div>
  );
}
