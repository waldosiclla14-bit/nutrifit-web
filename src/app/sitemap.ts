import type { MetadataRoute } from 'next';
import { BRAND, PRODUCTS } from '@/data/seed';
import { BLOG_POSTS } from '@/data/blog';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = BRAND.url;
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/productos`, lastModified, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/blog`, lastModified, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/sobre-nosotros`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/legal`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const productRoutes: MetadataRoute.Sitemap = PRODUCTS.map((p) => ({
    url: `${base}/productos/${p.slug}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...blogRoutes];
}
