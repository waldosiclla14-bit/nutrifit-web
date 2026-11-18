import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * Solo se bloquea lo que no aporta nada al índice y no necesita rastreo:
 * paneles internos y API. Las páginas transaccionales (/login, /favoritos,
 * /reset-password) NO se bloquean aquí: llevan `noindex` en su metadata y
 * Google necesita poder rastrearlas para leer esa directiva.
 *
 * Los filtros del catálogo tampoco se bloquean: /productos responde con
 * canonical a /productos y las búsquedas internas (?q=) llevan noindex.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/pos', '/api', '/erp'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
