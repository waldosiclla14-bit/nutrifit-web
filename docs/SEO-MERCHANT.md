# SEO / Google Merchant — Ficha de producto (JSON-LD)

> Fase 3 del trabajo de SEO (prevención). Documenta las reglas de SKU, la
> configuración declarada en Merchant Center y las decisiones acordadas.
> Última revisión: 2026-10-19.

## 1. JSON-LD de producto

- Fuente única: `src/lib/seo/merchant-config.ts` → `buildProductJsonLd()`.
- Se inyecta en `src/app/(public)/productos/[slug]/page.tsx` (Next.js `<script
  type="application/ld+json">`).
- Campos declarados: `@type: Product`, `name`, `description`, `image`, `sku`,
  `brand`, y `offers` (`Offer` con `price`, `priceCurrency: CLP`,
  `availability`, `url`, `priceValidUntil` = fin de mes,
  `hasMerchantReturnPolicy` y `shippingDetails` — estos dos últimos van
  **dentro de `offers`**, como exige schema.org para ofertas).
- `sku` solo se incluye si el producto real tiene SKU (ya no se genera
  `seed-<slug>` sintético).

## 2. Reglas de SKU

- Formato: `NF-<CATEGORIA>-<PRODUCTO>-<TAMAÑO>` (ej. `NF-PROT-FE-WHEY-1KG`).
- Restricciones: 1–50 caracteres, solo mayúsculas, números y guiones; sin
  tildes ni espacios.
- Validación en `src/lib/sku.ts` (`normalizeSku`, `isValidSku`, `skuError`).
- Bloqueado en:
  - Admin (`src/components/admin/Productos.tsx`): crear, editar e importar CSV
    rechazan SKU inválido antes de enviar; el SKU se normaliza (mayúsculas,
    sin tildes).
  - Backend (`backend/src/products/products.service.ts` →
    `assertValidSku()`): create/update de producto y variantes; los SKU se
    validan antes de cualquier escritura.
- Duplicados: el constraint `@unique` de Prisma (`Product.sku`,
  `ProductVariant.sku`) + `uniqueSku()` con sufijo numérico. El backend
  responde 400 "El SKU ya esta en uso" (código P2002).
- Si el SKU no viene en el body, el backend autogenera `SKU-<SLUG>` único
  (compatibilidad con importaciones antiguas sin columna SKU).

## 3. SKUs del catálogo público

- La tienda pública usa el catálogo estático de `src/data/seed.ts` (33
  productos), no la base de datos del ERP.
- `PRODUCT_SKUS` en `seed.ts` asigna un SKU `NF-...` a cada producto; la
  página de producto lo consume vía `Product.sku`.

## 4. Decisiones acordadas (visibles en el JSON-LD)

| Campo | Valor declarado | Nota |
|---|---|---|
| Devoluciones | 30 días | La política publicada en `/legal`; no confundir con los 7 días del negocio. |
| Envío | Metro $1.000 · Blue Express $4.000 · Starken $4.000 | Se declaran las 3 zonas del negocio aunque el checkout hoy solo ofrece Metro. |
| `priceValidUntil` | Fin de mes (ISO 8601) | Se recalcula al generar el JSON-LD. |
| `availability` | Stock base del catálogo | Estado inicial visible; no refleja la variante seleccionada. |

### Diferencias conocidas (documentadas, no bugs)

1. JSON-LD declara envío plano de $1.000; el checkout da envío gratis sobre
   $30.000 (`DEFAULT_SETTINGS.freeShippingFrom`).
2. El checkout solo ofrece despacho a la Región Metropolitana; el JSON-LD
   declara las 3 zonas (Metro, Blue, Starken).
3. `aggregateRating` (si se usa) es estático: riesgo si Google lo considera
   reseñas no verificadas.
4. La tienda no lee la BD del ERP: los 2 productos con SKU del ERP
   (`FE-WHEY-001`, `FE-CREAT-001`) no aparecen en la tienda pública.

## 5. Validación automatizada

- `src/lib/seo/merchant-config.test.ts` (20 tests): SKU del catálogo, campos
  mínimos del JSON-LD, casos borde (sin SKU, SKU de 50 chars, sin stock,
  precio 0, variantes), y contratos de envío contra `DEFAULT_SETTINGS`.
- `src/lib/sku.test.ts` (5 tests): normalización y validación de SKU.
- Ambos corren en CI con el resto de la suite (`npx jest`).

## 6. Verificación end-to-end (Fase 4, 2026-10-19)

Se validó el HTML estático real generado por `npm run build` (39 archivos en
`.next/server/app/productos/`):

- **33/33 páginas de producto** tienen JSON-LD `Product` completo: `sku`
  (`NF-...`), `brand`, `offers` con `availability`, `priceValidUntil`,
  `hasMerchantReturnPolicy` (30 días) y `shippingDetails` (3 zonas).
- Las 6 páginas restantes son **alias** de slugs antiguos
  (`PRODUCT_ALIASES` en `seed.ts`); redirigen con `redirect()` al slug
  canónico. No llevan JSON-LD propio: el buscador sigue la redirección.
- Suites: frontend 78/78, backend 125/125, `tsc` (frontend y backend) 0
  errores, ESLint 0 errores, `npm run build` exitoso.

## 7. Verificación manual (Google)

1. Elegir 3 productos de la tienda pública.
2. Abrir https://search.google.com/test/rich-results → "Prueba de resultados
   enriquecidos".
3. Pegar la URL del producto o el HTML del JSON-LD.
4. Esperar el resultado: el objeto debe reconocerse como **Producto** sin
   errores de campos requeridos (`sku`, `offers`, `availability`,
   `shippingDetails`, `hasMerchantReturnPolicy`).
