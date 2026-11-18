import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { BRAND, CATEGORIES, PRODUCTS } from '@/data/seed';
import ProductCard from '@/components/product/ProductCard';
import Reveal from '@/components/ui/Reveal';

/**
 * Landing por categoría. Existe para que cada categoría tenga una URL propia,
 * indexable y con contenido real: el catálogo con filtros (`/productos?cat=`)
 * canoniza a /productos, así que nunca podría posicionarse por sí mismo.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((cat) => ({ cat: cat.key }));
}

function findCategory(key: string) {
  return CATEGORIES.find((c) => c.key === key);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cat: string }>;
}): Promise<Metadata> {
  const { cat } = await params;
  const category = findCategory(cat);
  if (!category) return {};

  const items = PRODUCTS.filter((p) => p.category === category.key);
  const url = `${BRAND.url}/productos/categoria/${category.key}`;
  const title = `${category.label} originales`;
  const description = `${category.blurb}. ${items.length} productos disponibles con sello de garantía y entrega en Metro de Santiago o a domicilio.`;

  return {
    title,
    description,
    alternates: { canonical: `/productos/categoria/${category.key}` },
    openGraph: {
      type: 'website',
      title: `${title} | ${BRAND.name}`,
      description,
      url,
      siteName: BRAND.name,
      images: [{ url: `${BRAND.url}${category.image}`, alt: `${category.label} en NutriFit` }],
    },
    twitter: {
      title: `${title} | ${BRAND.name}`,
      description,
      images: [{ url: `${BRAND.url}${category.image}`, alt: `${category.label} en NutriFit` }],
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ cat: string }> }) {
  const { cat } = await params;
  const category = findCategory(cat);
  if (!category) notFound();

  const items = PRODUCTS.filter((p) => p.category === category.key);
  if (items.length === 0) notFound();

  const others = CATEGORIES.filter((c) => c.key !== category.key);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: BRAND.url },
          { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${BRAND.url}/productos` },
          {
            '@type': 'ListItem',
            position: 3,
            name: category.label,
            item: `${BRAND.url}/productos/categoria/${category.key}`,
          },
        ],
      },
      {
        '@type': 'CollectionPage',
        '@id': `${BRAND.url}/productos/categoria/${category.key}`,
        name: `${category.label} originales`,
        description: category.blurb,
        inLanguage: 'es-CL',
        isPartOf: { '@id': `${BRAND.url}/#website` },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: items.length,
          itemListElement: items.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: p.name,
            url: `${BRAND.url}/productos/${p.slug}`,
          })),
        },
      },
    ],
  };

  return (
    <div className="bg-sport-bg text-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="container-px py-10 sm:py-14">
        <nav
          aria-label="Migas de pan"
          className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-gray-500"
        >
          <Link href="/" className="transition-colors hover:text-sport-orangeText">
            Inicio
          </Link>
          <ChevronRight size={12} aria-hidden="true" />
          <Link href="/productos" className="transition-colors hover:text-sport-orangeText">
            Catálogo
          </Link>
          <ChevronRight size={12} aria-hidden="true" />
          <span className="font-semibold text-gray-900">{category.label}</span>
        </nav>

        <Reveal className="max-w-2xl">
          <h1 className="font-display text-4xl uppercase tracking-wide sm:text-5xl">
            {category.label}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-gray-500">{category.blurb}.</p>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            {items.length} producto{items.length === 1 ? '' : 's'} con sello de garantía
            NutriFit. Coordinas por WhatsApp y te lo llevamos a tu estación de Metro en
            Santiago o a tu domicilio.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-12 border-t border-sport-border pt-8">
          <h2 className="font-display text-xl uppercase tracking-wide text-gray-900">
            Otras categorías
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {others.map((c) => (
              <li key={c.key}>
                <Link
                  href={`/productos/categoria/${c.key}`}
                  className="inline-flex items-center gap-1 rounded-full border border-sport-border bg-sport-card px-4 py-2 text-[13px] font-bold text-gray-900 transition-colors hover:border-sport-green/40 hover:text-sport-greenText"
                >
                  {c.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/productos"
                className="inline-flex items-center gap-1 rounded-full bg-sport-green px-4 py-2 text-[13px] font-bold text-ink transition-colors hover:bg-sport-greenLight"
              >
                Ver catálogo completo
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
