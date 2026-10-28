import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PRODUCTS, PRODUCT_ALIASES, BRAND } from '@/data/seed';
import ProductDetail from '@/components/product/ProductDetail';
import { buildProductJsonLd } from '@/lib/seo/merchant-config';
import { SITE_URL } from '@/lib/site';

export function generateStaticParams() {
  return [...PRODUCTS.map((p) => ({ slug: p.slug })), ...Object.keys(PRODUCT_ALIASES).map((slug) => ({ slug }))];
}

function productDescription(product: (typeof PRODUCTS)[number]): string {
  const price = `$${product.price.toLocaleString('es-CL')}`;
  const base = `${product.name} original en Chile. ${product.desc}`;
  const tail = ` Compra por WhatsApp y recibe en Metro o a domicilio. Desde ${price}.`;
  const full = base + tail;
  return full.length <= 155 ? full : `${full.slice(0, 154).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = PRODUCTS.find((p) => p.slug === slug);
  if (!product) return {};
  const title = `${product.name} · $${product.price.toLocaleString('es-CL')}`;
  const description = productDescription(product);
  const image = `${SITE_URL}${product.image}`;
  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${BRAND.name}`,
      description,
      url: `${SITE_URL}/productos/${product.slug}`,
      images: [{ url: image, alt: product.name }],
    },
    twitter: {
      title: `${title} | ${BRAND.name}`,
      description,
      images: [{ url: image, alt: product.name }],
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
