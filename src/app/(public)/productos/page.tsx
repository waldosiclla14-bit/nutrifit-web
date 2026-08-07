import type { Metadata } from 'next';
import Catalog from '@/components/product/Catalog';

export const metadata: Metadata = {
  title: 'Catálogo de Suplementos',
  description:
    'Explora el catálogo de suplementos deportivos NutriFit: whey protein, creatina, vitaminas y bienestar. Filtra por marca, precio y objetivo.',
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string }>;
}) {
  const params = await searchParams;
  return <Catalog initialCat={params.cat} initialQ={params.q} />;
}
