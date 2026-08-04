import type { MetadataRoute } from 'next';
import { BRAND, PRODUCTS } from '@/data/seed';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = BRAND.url;
  const staticRoutes = ['', '/productos', '/favoritos', '/legal'].map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.7,
  }));

  const productRoutes = PRODUCTS.map((p) => ({
    url: `${base}/productos/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
