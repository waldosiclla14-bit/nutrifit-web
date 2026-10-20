import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/pos',
        '/login',
        '/favoritos',
        '/reset-password',
        // Filtros y búsquedas combinadas: solo se indexa la URL limpia.
        '/productos?',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
