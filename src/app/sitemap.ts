import type { MetadataRoute } from 'next';
import { BRAND, CATEGORIES, PRODUCTS } from '@/data/seed';
import { BLOG_POSTS } from '@/data/blog';

/**
 * Sitemap estático generado en build.
 *
 * Reglas aplicadas:
 * - Solo URLs públicas indexables (nada de admin, pos, login, favoritos,
 *   reset-password ni filtros del catálogo).
 * - `lastModified` solo cuando existe una fecha real: los artículos del blog
 *   usan su `date` de publicación. Los productos y páginas fijas no tienen
 *   fecha de modificación en los datos, así que se omite en vez de inventar
 *   una (Google ignora un lastmod que cambia en cada build).
 * - Cada producto declara su imagen para el sitemap de imágenes.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = BRAND.url;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/productos`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/marcas`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/blog`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/sobre-nosotros`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/legal`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${base}/productos/categoria/${cat.key}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = PRODUCTS.map((p) => ({
    url: `${base}/productos/${p.slug}`,
    changeFrequency: 'weekly',
    priority: 0.8,
    images: [`${base}${p.image}`],
  }));

  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...blogRoutes];
}
