import type { Metadata } from 'next';
import Catalog from '@/components/product/Catalog';
import { CATEGORIES } from '@/data/seed';

type CatalogSearchParams = {
  cat?: string;
  q?: string;
  marca?: string;
  goal?: string;
};

/**
 * Canonical del catálogo:
 * - `?q=` es búsqueda interna: noindex (Google no debe indexar resultados).
 * - `?cat=` con categoría válida canoniza a la landing de esa categoría.
 * - Cualquier otro filtro (?marca=, ?goal=) canoniza al catálogo limpio.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const isSearch = !!params.q?.trim();
  const category = params.cat
    ? CATEGORIES.find((c) => c.key === params.cat)
    : undefined;

  const canonical = category ? `/productos/categoria/${category.key}` : '/productos';

  return {
    title: category ? `${category.label} originales` : 'Catálogo de Suplementos',
    description: category
      ? `${category.blurb}. Compra originales con sello de garantía y entrega en Metro de Santiago o a domicilio.`
      : 'Explora el catálogo de suplementos deportivos NutriFit: whey protein, creatina, vitaminas y bienestar. Filtra por marca, precio y objetivo.',
    alternates: { canonical },
    ...(isSearch ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const params = await searchParams;
  return (
    <Catalog
      initialCat={params.cat}
      initialQ={params.q}
      initialMarca={params.marca}
      initialGoal={params.goal}
    />
  );
}
