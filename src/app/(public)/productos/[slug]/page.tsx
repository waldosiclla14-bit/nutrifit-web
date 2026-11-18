import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { PRODUCTS, PRODUCT_ALIASES, BRAND } from '@/data/seed';
import ProductDetail from '@/components/product/ProductDetail';
import { buildProductJsonLd } from '@/lib/seo/merchant-config';
import { SITE_URL, seoTitle } from '@/lib/site';

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
  // seoTitle recorta a un largo visible en SERP y agrega " | NutriFit", así que
  // el título va como `absolute` para que el template no lo sufije dos veces.
  const title = seoTitle(`${product.name} · $${product.price.toLocaleString('es-CL')}`, 65);
  const description = productDescription(product);
  const image = `${SITE_URL}${product.image}`;
  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/productos/${product.slug}`,
      images: [{ url: image, alt: product.name }],
    },
    twitter: {
      title,
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
  const product = PRODUCTS.find((p) => p.slug === slug);
  if (!product) {
    // Los slugs históricos (sabor dentro de la URL, nombres anteriores) se
    // resuelven con 308 permanente para consolidar señales en la URL nueva.
    const target = PRODUCT_ALIASES[slug];
    if (target) permanentRedirect(`/productos/${target}`);
    notFound();
  }

  const related = PRODUCTS.filter(
    (p) => p.id !== product.id && p.category === product.category,
  ).slice(0, 4);

  const productJsonLd = buildProductJsonLd(product);

  // Migas de pan idénticas a las visibles en ProductDetail (Inicio › Catálogo ›
  // Categoría › Producto): el JSON-LD no debe describir una ruta distinta.
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: BRAND.url },
      { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${SITE_URL}/productos` },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.categoryLabel,
        item: `${SITE_URL}/productos/categoria/${product.category}`,
      },
      { '@type': 'ListItem', position: 4, name: product.name },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProductDetail product={product} related={related} />
    </>
  );
}
