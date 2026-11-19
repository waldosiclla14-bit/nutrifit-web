# Auditoría SEO técnico — NutriFit Suplementos

**Dominio canónico:** https://nutrifitsuplementos.cl
**Fecha:** 18 de noviembre de 2026
**Alcance:** indexación de páginas comerciales (home, catálogo, categorías, productos, blog)
**Estado:** cambios aplicados en el repositorio y verificados contra un build de producción local (`next start` en `localhost:3101`). **Producción todavía sirve el build anterior**: nada de esto está desplegado.

---

## A. Diagnóstico inicial

Se auditó el repositorio real y el sitio en producción (`https://nutrifitsuplementos.cl`, `robots.txt`, `sitemap.xml` y varias páginas). El proyecto **no usa Supabase**: el catálogo público sale de `src/data/seed.ts` (33 productos, 8 categorías, 3 artículos) y el backend NestJS/Prisma solo atiende admin y POS. Eso cambia el enfoque: no hay contenido dinámico que consultar, pero sí datos que se estaban describiendo mal.

### Problemas encontrados

| # | Prioridad | Problema | Evidencia | Causa |
|---|---|---|---|---|
| 1 | **P1** | `www.nutrifitsuplementos.cl` responde **200** con el sitio completo, no redirige | `GET https://www..../productos/...` → 200, canonical al apex | `src/proxy.ts` solo contemplaba el host de Vercel (`LEGACY_HOSTS`), nunca el prefijo `www.` |
| 2 | **P1** | Los slugs históricos responden **307 (temporal)** | `GET /productos/ostrovit-100-whey-protein-700g-chocolate` → 307 | Se usaba `redirect()` de `next/navigation`, que emite 307 |
| 3 | **P1** | `robots.txt` bloqueaba páginas que **sí** llevan `noindex` | `Disallow: /login`, `/favoritos`, `/reset-password` | Google no puede leer el `noindex` de una URL bloqueada: queda para siempre en "Bloqueada por robots.txt" |
| 4 | **P1** | `robots.txt` bloqueaba los filtros del catálogo | `Disallow: /productos?` | Impedía que Google viera el canonical a `/productos`; convertía duplicados legítimos en "bloqueadas" |
| 5 | **P1** | `sitemap.xml` declaraba `lastModified` falso | Las 42 URLs con el mismo `<lastmod>` = hora del build | `const lastModified = new Date()` aplicado a todo |
| 6 | **P2** | Las categorías no tenían URL indexable | Home y header enlazaban a `/productos?cat=...`, que canoniza a `/productos` | No existía landing por categoría |
| 7 | **P2** | Búsquedas internas indexables | `GET /productos?q=whey` → `robots: index, follow` | `generateMetadata` no distinguía `?q=` |
| 8 | **P2** | `/reset-password` heredaba `index, follow` del layout público | No tenía `metadata` propia | Página `'use client'` sin layout de metadata |
| 9 | **P2** | Sin `BreadcrumbList` en producto ni blog | Producto tenía migas visibles, pero sin JSON-LD | Ausencia de structured data |
| 10 | **P2** | Blog sin Open Graph de artículo | `generateMetadata` solo definía `title`/`description`/`canonical` | Faltaba `openGraph.type = 'article'` e imagen |
| 11 | **P2** | `Store` (LocalBusiness) sin dirección física | JSON-LD del home | El negocio es tienda online, no local con vitrina |
| 12 | **P3** | `<html lang="es">` en vez de `es-CL` | `src/app/layout.tsx` | — |
| 13 | **P3** | Títulos de producto de hasta 76 caracteres | 2 de 33 productos se cortaban en SERP | `Nombre · $precio` sin recorte — **corregido**: ahora pasan por `seoTitle(…, 65)` |
| 14 | **P3** | `sitemap.xml` sin imágenes | 0 entradas `<image:loc>` | No se declaraban |

### Lo que **no** era un error

Estos estados de Search Console son esperados y no se tocaron:

- **"Página alternativa con etiqueta canónica adecuada"**: `/productos?marca=Rain`, `?goal=...` y el propio `www` mientras existió. Los filtros siguen canonizando a `/productos` (o a la landing de categoría cuando el filtro es una categoría válida). Es el comportamiento correcto.
- **404 reales**: `/productos/<slug-inexistente>` ya devolvía 404. Se mantiene.
- **`/legal/` con barra final → 308**: normalización de Vercel. No se fuerza.

---

## B. Cambios realizados

### Archivos creados

| Archivo | Para qué |
|---|---|
| `src/app/(public)/productos/categoria/[cat]/page.tsx` | Landing indexable por categoría: H1, intro propia, grilla de productos, enlaces cruzados, canonical propio, `CollectionPage` + `BreadcrumbList`. `dynamicParams = false`, así un slug inválido devuelve 404 y no se generan páginas basura. |
| `src/app/(public)/reset-password/layout.tsx` | `noindex, nofollow` para el formulario interno (la página es `'use client'` y no puede exportar `metadata`). |
| `src/lib/seo/indexacion.test.ts` | 18 pruebas que fijan los invariantes de sitemap, robots, categorías, slugs e imágenes, para que una regresión futura no meta URLs privadas al índice. |

### Archivos modificados

| Archivo | Cambio | Motivo |
|---|---|---|
| `src/proxy.ts` | 301 a apex desde `www.<dominio>` y desde el host de Vercel, conservando path y query; `X-Robots-Tag: noindex` cuando `VERCEL_ENV === 'preview'` | Una sola versión canónica del dominio; previews no compiten con producción |
| `src/app/robots.ts` | `Disallow` reducido a `/admin`, `/pos`, `/api`, `/erp` | Dejar rastrear lo que lleva `noindex`; no bloquear filtros que declaran canonical |
| `src/app/sitemap.ts` | `lastModified` solo en artículos (fecha real de publicación); +8 categorías; +33 imágenes; 50 URLs | No inventar fechas; exponer categorías e imágenes |
| `src/app/(public)/productos/[slug]/page.tsx` | `permanentRedirect()` (308); `BreadcrumbList` de 4 niveles; título recortado con `seoTitle(…, 65)` como `absolute` | Consolidar señales de los slugs viejos; structured data coherente con las migas visibles; títulos dentro del ancho de SERP |
| `src/app/(public)/productos/page.tsx` | `generateMetadata` con `searchParams`: `?q=` → `noindex, follow`; `?cat=<válida>` → canonical a `/productos/categoria/<cat>`; otros filtros → `/productos` | Eliminar duplicados por filtros y sacar del índice las búsquedas internas |
| `src/app/(public)/page.tsx` | Título con intención comercial; `Store` → `OnlineStore` | Mejor CTR y coherencia con "tienda online sin local físico" |
| `src/app/(public)/blog/[slug]/page.tsx` | OG `article` (fecha, autor, imagen 1200×630), Twitter card, `BreadcrumbList` | Compartibilidad y migas |
| `src/app/(public)/favoritos/layout.tsx` | Se quitó el `canonical` (queda solo `noindex`) | Un canonical en una página `noindex` es contradictorio |
| `src/app/layout.tsx` | `lang="es-CL"` | Señal de idioma/mercado |
| `src/components/home/Categories.tsx` | Enlaces a `/productos/categoria/<key>` | Internal linking hacia las URLs indexables |
| `src/components/layout/Header.tsx` | Ídem en menú desktop y móvil (2 enlaces) | Ídem |
| `src/components/product/ProductDetail.tsx` | Cuarto nivel de migas: `Catálogo › Categoría › Producto`, con `aria-current` | Coincide con el `BreadcrumbList` |

**No se tocó** carrito, checkout, autenticación, precios, stock, el layout visual ni variables de entorno.

---

## C. Resultados de las pruebas

Todas ejecutadas contra `next start` (build de producción) en `http://localhost:3101`, puerto ya liberado. La sección F repite las comprobaciones críticas contra producción.

### Build y tipos

| Prueba | Resultado |
|---|---|
| `npm run build` | ✅ Compila (`✓ Compiled successfully in 12.2s`) y prerenderiza **72/72 páginas** (64 antes; +8 categorías) |
| TypeScript (build) | ✅ `Finished TypeScript in 20.8s` |
| `npx tsc --noEmit` | ✅ exit 0 |
| `npm run lint` | ✅ 0 errores, 3 warnings preexistentes (`DocumentViewer.tsx` usa `<img>`; `Pos.tsx` con `exhaustive-deps`). Ninguno introducido por esta auditoría |
| `npx jest` | ✅ 16 suites, **146/146 pruebas**. Incluye la suite nueva `src/lib/seo/indexacion.test.ts` (18 pruebas) |
| Advertencia del build | ✅ Ya no aparece: se desplegó con Next 16.4.6 (PR #27) y el build termina limpio |

### Robots

```
User-Agent: *
Allow: /
Disallow: /admin
Disallow: /pos
Disallow: /api
Disallow: /erp

Sitemap: https://nutrifitsuplementos.cl/sitemap.xml
```

✅ No bloquea imágenes, CSS ni JS. ✅ No bloquea páginas con `noindex`.

### Sitemap

| Métrica | Resultado |
|---|---|
| Status / tipo | 200, `application/xml`, XML válido |
| URLs | **50** (6 fijas + 8 categorías + 33 productos + 3 artículos) |
| URLs privadas (`admin`, `pos`, `login`, `favoritos`, `reset-password`, con `?`) | **0** |
| Duplicados | **0** |
| `lastmod` | Solo 3 valores, correspondientes a las fechas reales de los artículos (2026-06-28, 2026-07-12, 2026-07-20) |
| Imágenes declaradas | 33 |

### Canonical (verificado en el HTML servido)

| URL | Canonical | Estado |
|---|---|---|
| `/` | `https://nutrifitsuplementos.cl` | ✅ |
| `/productos` | `https://nutrifitsuplementos.cl/productos` | ✅ |
| `/productos?cat=proteinas` | `.../productos/categoria/proteinas` | ✅ |
| `/productos?cat=noexiste` | `.../productos` | ✅ |
| `/productos?marca=Rain` | `.../productos` | ✅ |
| `/productos/categoria/creatinas` | `.../productos/categoria/creatinas` | ✅ |
| `/productos/fullenergic-creatina-300g` | `.../productos/fullenergic-creatina-300g` | ✅ |
| `/blog/creatina-guia-completa` | `.../blog/creatina-guia-completa` | ✅ |
| `/marcas`, `/legal` | Canonical propio | ✅ |

Ninguna página usa la canonical del home. Ninguna apunta a Vercel ni a localhost.

### Redirecciones

| Caso | Resultado |
|---|---|
| `Host: www.nutrifitsuplementos.cl` | ✅ **301** → `https://nutrifitsuplementos.cl/productos/fullenergic-creatina-300g` (path y query intactos) |
| `Host: nutrifit-web-nu.vercel.app` | ✅ **301** → apex |
| `/productos/ostrovit-100-whey-protein-700g-chocolate` | ✅ **308** → `/productos/ostrovit-100-whey-protein-700g-chocolate-dream` |
| `/productos/fullenergic-100-whey-protein-vainilla-1kg` | ✅ **308** → `/productos/fullenergic-100-whey-protein-1kg` |

Sin cadenas de redirección (un solo salto en cada caso).

### noindex

| URL | Resultado |
|---|---|
| `/login` | ✅ `meta: noindex, nofollow` + `X-Robots-Tag` |
| `/favoritos` | ✅ `meta: noindex, nofollow` |
| `/reset-password` | ✅ `meta: noindex, nofollow` (antes heredaba `index, follow`) |
| `/productos?q=whey` | ✅ `meta: noindex, follow`, canonical a `/productos` |
| Producto y categoría | ✅ `index, follow` (no heredan `noindex`) |

### HTTP y 404

| Caso | Resultado |
|---|---|
| Home, `/productos`, categorías, productos, blog, `/marcas`, `/legal` | ✅ 200 |
| `/productos/no-existe-xyz-123` | ✅ 404 |
| `/productos/categoria/no-existe` | ✅ 404 |
| `/ruta-inventada-123` | ✅ 404 |

Ningún 404 se redirige al home.

### Datos estructurados (parseados desde el HTML servido)

| Página | Tipos | Errores de parseo |
|---|---|---|
| `/` | Organization, WebSite, OnlineStore, FAQPage | 0 |
| `/productos/categoria/proteinas` | Organization, BreadcrumbList, CollectionPage | 0 |
| `/productos/fullenergic-creatina-300g` | Organization, Product, BreadcrumbList | 0 |
| `/blog/creatina-guia-completa` | Organization, BlogPosting, BreadcrumbList | 0 |

`Product` mantiene `price`, `priceCurrency: CLP`, `availability`, `sku`, `brand`, `image` y `offers` con envío y devoluciones, todos derivados de los mismos objetos que renderiza la página.

### Títulos

| Producto | `<title>` | Largo |
|---|---|---|
| FullEnergic 100% Whey Protein 1kg | `FullEnergic 100% Whey Protein 1kg · $16.000 \| NutriFit` | 54 |
| FullEnergic 100% Vegan Protein Cookies & Cream 1kg | recortado con `…` antes de ` \| NutriFit` | 66 |
| Rain Óxido Nítrico Ultra Booster 1200 mg | recortado con `…` antes de ` \| NutriFit` | 65 |
| Categoría | `Proteínas originales \| NutriFit` | 30 |

Ningún título lleva el sufijo dos veces ni supera los 66 caracteres.

### Pruebas automatizadas

`src/lib/seo/indexacion.test.ts` (18 pruebas, integradas en `npm run test`):

- Sitemap: dominio canónico, solo HTTPS, sin duplicados, sin rutas privadas, sin query strings.
- Sitemap: incluye los 33 productos, las 8 categorías y los 3 artículos.
- Sitemap: `lastModified` solo existe en artículos y coincide con su fecha real; en el resto es `undefined`.
- Sitemap: cada producto declara su imagen.
- Robots: permite `/`, bloquea exactamente `/admin`, `/pos`, `/api`, `/erp`.
- Robots: **no** bloquea `/login`, `/favoritos`, `/reset-password` ni recursos.
- Catálogo: ninguna categoría queda vacía, slugs únicos, alias apuntan a productos reales y no pisan slugs vigentes.
- Imágenes: las 33 rutas declaradas existen en `public/`.

### Enlaces internos y renderizado

| Prueba | Resultado |
|---|---|
| Enlaces internos únicos recolectados desde 6 páginas | 55 |
| Enlaces rotos | **0** |
| Enlaces a categorías desde el home | 8 |
| `<h1>` por página | 1 (verificado en categoría y producto) |
| Contenido principal en HTML sin JS | ✅ nombre, descripción, ingredientes, modo de uso y precio aparecen en el HTML |
| `lang` | `es-CL` |

---

## D. Pendientes

Requieren acceso a Search Console, a producción o a información que no existe en el repo:

1. ~~**Desplegar.**~~ Hecho: `main` en `af1cd95`, deploy de producción en Vercel en estado `success` y verificado en vivo (ver sección F).
2. **Dominio en Vercel.** Conviene además configurar `www.nutrifitsuplementos.cl` como *redirect* a `nutrifitsuplementos.cl` en el panel de Vercel. Es redundante con el 301 del proxy (ya verificado en producción), pero elimina un salto de TLS y deja la intención explícita.
3. **Search Console.** Reenviar el sitemap, usar "Inspección de URL" en las 8 categorías y en los productos de mayor margen, y pedir indexación. Revisar el informe de páginas después de 3–7 días.
4. **Contenido de producto.** 33 fichas tienen descripción, ingredientes, modo de uso y nutrientes. No inventé ninguno. Si falta información de fabricante en algún SKU, hay que pedirla: no se puede suplir con texto genérico.
5. **Reseñas.** El `AggregateRating` sale de `rating`/`reviews` del seed. Debe corresponder a reseñas reales y visibles en la página; si son datos de demostración, hay que quitarlas del JSON-LD antes de que Google Merchant las revise.
6. **Validación de rich results.** No ejecuté el validador de Google (requiere URL pública). Después del deploy: Rich Results Test sobre un producto, una categoría y un artículo.
7. ~~**`SecurityFatalError`.** Mergear el PR #27 (`next 16.4.6`).~~ Hecho: PR #27 mergeado (`ad97982`), cada build desde entonces corre con Next 16.4.6 y ya no emite el error.

---

## F. Verificación post-deploy (producción)

Ejecutada contra `https://nutrifitsuplementos.cl` después del deploy de `af1cd95` (estado `success` en Vercel). No es una simulación: son respuestas reales del sitio.

### Redirecciones (siguiendo la cadena completa)

| Punto de partida | Cadena | Resultado |
|---|---|---|
| `https://www.nutrifitsuplementos.cl/productos?cat=proteinas` | `301` → apex, `200` | ✅ 1 salto, query intacta |
| `http://nutrifitsuplementos.cl/productos` | `308` (HTTPS de Vercel) → `200` | ✅ 1 salto |
| `https://nutrifit-web-nu.vercel.app/productos` | `301` → apex, `200` | ✅ 1 salto |
| `/productos/ostrovit-100-whey-protein-700g-chocolate` | `308` → `…-chocolate-dream`, `200` | ✅ 1 salto |

Sin bucles, sin cadenas, ningún estado intermedio distinto de `3xx`/`200`.

### Metadatos servidos

| URL | Status | Canonical | `meta robots` |
|---|---|---|---|
| `/` | 200 | `https://nutrifitsuplementos.cl` | `index, follow` |
| `/productos/categoria/proteinas` | 200 | sí misma | `index, follow` |
| `/productos/fullenergic-100-whey-protein-1kg` | 200 | sí misma | `index, follow` |
| `/productos?cat=proteinas` | 200 | `/productos/categoria/proteinas` | `index, follow` |
| `/productos?q=whey` | 200 | `/productos` | `noindex, follow` |
| `/login` | 200 | — | `noindex, nofollow` |
| `/reset-password` | 200 | — | `noindex, nofollow` |
| `/favoritos` | 200 | — | `noindex, nofollow` |
| `/blog/que-proteina-elegir` | 200 | sí misma | `index, follow` |

`<html lang="es-CL">` en todas las páginas revisadas.

### Sitemap y robots servidos

- `sitemap.xml`: 200, **50 `<loc>`**, **33 `<image:loc>`**, **3 `<lastmod>`** (solo artículos), **8** URLs de categoría, **0** con query string, **0** de rutas privadas.
- **Las 50 URLs del sitemap responden 200** y **las 33 imágenes responden 200** (comprobado una por una).
- `robots.txt`: 200, `Allow: /`, `Disallow` exactamente `/admin`, `/pos`, `/api`, `/erp`, `Sitemap:` al apex.

### 404 y datos estructurados

| Caso | Resultado |
|---|---|
| `/productos/no-existe-xyz-123` | ✅ 404 |
| `/productos/categoria/no-existe-xyz` | ✅ 404 |
| Producto | ✅ `Product` + `BreadcrumbList` |
| Blog | ✅ `og:type=article`, `article:published_time=2026-07-12`, `BreadcrumbList` |

### Nota sobre el host de Vercel

Al pedir el apex con `Host: nutrifit-web-nu.vercel.app` (spoof de cabecera, sin DNS) Vercel responde **421 Misdirected Request**: lo corta el borde antes de llegar a la app. No es un problema de la aplicación; el dominio legado real, consultado por DNS, redirige con 301 al apex (tabla de arriba).

---

## E. Recomendaciones post-deploy

1. **Verificar el 301 de `www`** con `curl -I https://www.nutrifitsuplementos.cl/productos` → debe ser `301` con `Location` al apex.
2. **Sitemap**: Search Console → Sitemaps → reenviar `sitemap.xml`. Debe pasar de 42 a 50 URLs detectadas.
3. **Indexación priorizada**: inspeccionar primero `/productos/categoria/proteinas`, `/productos/categoria/creatinas` y 5 productos top. Pedir indexación una vez por URL; no insistir a diario.
4. **"Rastreada: actualmente sin indexar"**: es el estado que más tarda. Con canonical propio, contenido único, migas y enlaces internos ya está todo lo técnico. Lo que falta es autoridad y tiempo: enlaces externos reales (Instagram, directorios de suplementos chilenos, prensa) y que el sitemap no tenga URLs que cambien de `lastmod` en cada deploy (ya corregido).
5. **Monitorear** en Search Console: "Páginas alternativas con etiqueta canónica" debe seguir existiendo (es sano); "Bloqueada por robots.txt" debe bajar a cero para `/login`, `/favoritos` y `/reset-password`.
6. **No** añadir `noindex` a productos, categorías, `/productos`, `/marcas` ni `/blog`.
7. **Revisar** en 30 días el informe de "Datos estructurados" para descartar errores de `Merchant listings` (envíos, devoluciones, disponibilidad).

---

### Resumen en una línea

El sitio ya era rastreable y tenía contenido real en HTML; los bloqueos eran de señalización: un host duplicado con 200, redirecciones temporales en vez de permanentes, `robots.txt` tapando `noindex`, un sitemap con fechas inventadas y categorías sin URL propia. Todo eso está corregido, desplegado en `af1cd95` y verificado en producción: 301 desde `www`, 308 en slugs antiguos, 50 URLs de sitemap que responden 200, `noindex` donde corresponde y 404 reales. Lo que queda es trabajo de Search Console.
