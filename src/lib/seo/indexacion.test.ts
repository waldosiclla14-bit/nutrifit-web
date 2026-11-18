import fs from 'node:fs';
import path from 'node:path';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { BLOG_POSTS } from '@/data/blog';
import { CATEGORIES, PRODUCTS, PRODUCT_ALIASES } from '@/data/seed';
import { SITE_URL } from '@/lib/site';

/**
 * Invariantes de indexación. Si alguna de estas pruebas falla, el sitemap o
 * robots.txt están publicando algo que Google no debería ver (o al revés).
 */

describe('sitemap', () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it('usa siempre el dominio canónico y solo HTTPS', () => {
    for (const url of urls) {
      expect(url.startsWith(`${SITE_URL}/`) || url === SITE_URL).toBe(true);
      expect(url.startsWith('https://')).toBe(true);
    }
  });

  it('no publica URLs repetidas', () => {
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('no expone rutas privadas ni transaccionales', () => {
    const prohibidas = ['/admin', '/pos', '/login', '/favoritos', '/reset-password', '/api'];
    for (const url of urls) {
      for (const ruta of prohibidas) {
        expect(url).not.toContain(ruta);
      }
    }
  });

  it('no incluye query strings ni filtros', () => {
    for (const url of urls) {
      expect(url).not.toContain('?');
    }
  });

  it('incluye todos los productos activos', () => {
    for (const producto of PRODUCTS) {
      expect(urls).toContain(`${SITE_URL}/productos/${producto.slug}`);
    }
  });

  it('incluye todas las categorías con productos', () => {
    for (const categoria of CATEGORIES) {
      expect(urls).toContain(`${SITE_URL}/productos/categoria/${categoria.key}`);
    }
  });

  it('incluye los artículos del blog', () => {
    for (const post of BLOG_POSTS) {
      expect(urls).toContain(`${SITE_URL}/blog/${post.slug}`);
    }
  });

  it('no inventa lastModified: solo los artículos tienen fecha real', () => {
    for (const entry of entries) {
      const esArticulo = BLOG_POSTS.some((p) => entry.url === `${SITE_URL}/blog/${p.slug}`);
      if (esArticulo) {
        const post = BLOG_POSTS.find((p) => entry.url === `${SITE_URL}/blog/${p.slug}`)!;
        expect(entry.lastModified).toEqual(new Date(post.date));
      } else {
        expect(entry.lastModified).toBeUndefined();
      }
    }
  });

  it('declara la imagen de cada producto', () => {
    const producto = PRODUCTS[0];
    const entry = entries.find((e) => e.url === `${SITE_URL}/productos/${producto.slug}`);
    expect(entry?.images).toEqual([`${SITE_URL}${producto.image}`]);
  });
});

describe('robots', () => {
  const result = robots() as {
    rules: { userAgent: string; allow: string; disallow: string[] };
    sitemap: string;
  };

  it('permite el rastreo general', () => {
    expect(result.rules.userAgent).toBe('*');
    expect(result.rules.allow).toBe('/');
  });

  it('bloquea solo paneles internos y API', () => {
    expect(result.rules.disallow).toEqual(['/admin', '/pos', '/api', '/erp']);
  });

  it('no bloquea páginas que necesitan ser rastreadas para leer su noindex', () => {
    for (const ruta of ['/login', '/favoritos', '/reset-password']) {
      expect(result.rules.disallow).not.toContain(ruta);
    }
  });

  it('no bloquea recursos ni filtros del catálogo', () => {
    const bloqueadas = result.rules.disallow.join(' ');
    expect(bloqueadas).not.toContain('_next');
    expect(bloqueadas).not.toContain('/img');
    expect(bloqueadas).not.toContain('productos?');
  });

  it('apunta al sitemap canónico', () => {
    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});

describe('catálogo e indexación', () => {
  it('cada categoría tiene al menos un producto (evita landings vacías)', () => {
    for (const categoria of CATEGORIES) {
      const items = PRODUCTS.filter((p) => p.category === categoria.key);
      expect(items.length).toBeGreaterThan(0);
    }
  });

  it('todos los slugs de producto son únicos', () => {
    const slugs = PRODUCTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('los slugs antiguos no chocan con slugs actuales y apuntan a un producto real', () => {
    const slugActuales = new Set(PRODUCTS.map((p) => p.slug));
    for (const [alias, destino] of Object.entries(PRODUCT_ALIASES)) {
      expect(slugActuales.has(alias)).toBe(false);
      expect(slugActuales.has(destino)).toBe(true);
    }
  });

  it('cada producto tiene la imagen declarada en disco', () => {
    for (const producto of PRODUCTS) {
      const ruta = path.join(process.cwd(), 'public', producto.image);
      expect(fs.existsSync(ruta)).toBe(true);
    }
  });
});
