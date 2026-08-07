import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PRODUCTS, BRAND } from '@/data/seed';
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

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: `${BRAND.url}${product.image}`,
    description: product.desc,
    sku: `seed-${product.slug}`,
    brand: { '@type': 'Brand', name: product.brand },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviews,
    },
    offers: {
      '@type': 'Offer',
      url: `${BRAND.url}/productos/${product.slug}`,
      priceCurrency: 'CLP',
      price: product.price,
      availability:
        product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <ProductDetail product={product} related={related} />
    </>
  );
}
