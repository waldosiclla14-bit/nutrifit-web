import type { MetadataRoute } from 'next';
import { BRAND } from '@/data/seed';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/pos', '/login'],
    },
    sitemap: `${BRAND.url}/sitemap.xml`,
  };
}
