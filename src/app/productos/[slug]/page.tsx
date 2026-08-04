import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PRODUCTS } from '@/data/seed';
import ProductDetail from '@/components/product/ProductDetail';
import { getDiscount } from '@/lib/utils';

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = PRODUCTS.find((p) => p.slug === slug);
  if (!product) return {};
  const discount = getDiscount(product);
  return {
    title: product.name,
    description: product.desc,
    openGraph: {
      title: `${product.name} · NUTRIFIT`,
      description: product.desc,
      images: [{ url: product.image }],
    },
    alternates: { canonical: `/productos/${product.slug}` },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = PRODUCTS.find((p) => p.slug === slug);
  if (!product) notFound();

  const related = PRODUCTS.filter(
    (p) => p.id !== product.id && p.category === product.category,
  ).slice(0, 4);

  return <ProductDetail product={product} related={related} />;
}
