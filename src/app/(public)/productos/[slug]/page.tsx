import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PRODUCTS, PRODUCT_ALIASES } from '@/data/seed';
import ProductDetail from '@/components/product/ProductDetail';
import { getDiscount } from '@/lib/utils';
import { buildProductJsonLd } from '@/lib/seo/merchant-config';

export function generateStaticParams() {
  return [...PRODUCTS.map((p) => ({ slug: p.slug })), ...Object.keys(PRODUCT_ALIASES).map((slug) => ({ slug }))];
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
    twitter: {
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
  let product = PRODUCTS.find((p) => p.slug === slug);
  if (!product) {
    const target = PRODUCT_ALIASES[slug];
    if (target) redirect(`/productos/${target}`);
    notFound();
  }

  const related = PRODUCTS.filter(
    (p) => p.id !== product.id && p.category === product.category,
  ).slice(0, 4);

  const productJsonLd = buildProductJsonLd(product);

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
