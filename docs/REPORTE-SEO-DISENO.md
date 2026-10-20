# Encargo SEO + Diseño — Reporte de cierre

Fecha: 2026-10-20 · Dominio canónico: `https://nutrifitsuplementos.cl`

## Commits (orden cronológico)

| Commit | Prefijo | Alcance |
|---|---|---|
| `96664c5` | `seo(dominio)` | Dominio canónico, iconos NF, OG image, 301 host legacy |
| `d197e43` | `seo(politicas)` | Garantía 10 días y eliminación de envío gratis |
| `3be9a3e` | `seo(metadata)` | Títulos únicos, descripciones con precio, sitemap y FAQ JSON-LD |
| `8a3fbcb` | `design(sistema)` | Verde unificado `#72BF44`, foco AA y títulos extrabold |
| `cd37267` | `design(home)` | Hero con H1 de marca, CTA WhatsApp y botón flotante mobile |

## Parte A — SEO técnico

- **Dominio canónico**: `src/lib/site.ts` como fuente única (`SITE_URL`/`SITE_HOST`/`LEGACY_HOSTS`). `src/proxy.ts` fusiona auth + 301 de hosts legacy; se eliminó `src/middleware.ts`.
- **Metadata**: `metadataBase` en raíz, template único `%s | NutriFit`. Home title "Suplementos Deportivos en Santiago" (45 chars) + descripción con precio (154 chars). Producto: title con precio, descripción ≤155, OG image absoluta con alt.
- **OG image** rediseñada 1200×630 con margen de 60 px.
- **Iconos NF vectoriales**: `icon.png` 512, `apple-icon.png` 180, `favicon.ico` (16/32/48/64), `icon-192/512/512-maskable`. Generados con `scripts/gen-icons.mjs`.
- **robots.ts**: noindex para favoritos/admin/pos/login/filtros. **sitemap.ts**: quita `/favoritos`, agrega `/sobre-nosotros`, prioridades ajustadas.
- **JSON-LD**: `Store` + `WebSite` (home), `Organization` (layout), `FAQPage` (FAQ), `Product` (producto).
- **Garantía 10 días** (era 30): `src/lib/policies.ts` como fuente única; `merchant-config.ts` + test leen de ahí. Actualizado en legal, sobre-nosotros, home, CartDrawer, ProductDetail, recommender.
- **Envío gratis eliminado** de lógica y textos: `CartContext` (shipping), `types`, `store`, HeroSection (barra), TrustStrip, ProductDetail, banner `entrega-metro`, FAQ, chatbot, `whatsapp.ts`.

## Parte B — Diseño visual

- **Sistema de diseño** (`globals.css` + `tailwind.config.ts`): token `--brand-green: #72BF44` unificado; `sport.green` alineado; clases `.btn-primary/.btn-accent/.btn-outline/.input/.chip/.label/.section-title(-dark)` y `.focus-ring` con anillo AA (`--focus-ring: #3D6A20`); `::selection` y scrollbar en verde de marca; glow shadows actualizadas.
- **Hero**: H1 "Whey + Creatina originales" (span verde en "originales"), subtítulo con sello de garantía, doble CTA — *Agregar al carrito* (verde marca, precio desde constante) y *Comprar por WhatsApp* (outline) —, se retiraron badges apilados (24g, productos originales, metro duplicado) para reducir ruido; se mantiene la prueba social como pendiente.
- **Botón flotante WhatsApp**: `WhatsAppFloat` montado en el layout público, 56 px, anillo de foco, safe-area, visible en mobile (se eleva sobre la barra inferior fija) y desktop.

## Verificación

- `npx tsc --noEmit` → OK
- `npm run build` → compila OK
- `npx jest` → **78/78 tests** (9 suites)
- HTML renderizado comprobado: H1 nuevo presente, CTA WhatsApp presente, `wa.me/56923883826`, botón flotante, H1 antiguo ausente.
- Grep: sin "30 días"/"7 días" en política de devoluciones (las apariciones restantes son filtros admin, cupones, protocolo de creatina y comentarios). Sin `#5DD62C` fuera de un comentario CSS.

## Corrección de contraste (texto blanco invisible)

El tema es claro (`body` = fondo blanco, texto `#0F172A`), pero varias vistas públicas aún usaban colores de tema oscuro (`text-white/*`, `text-white`), quedando invisibles. Corregido a `text-sport-text` / `text-sport-textMuted` en:

- `src/app/(public)/blog/page.tsx` y `blog/[slug]/page.tsx` (cuerpo, categoría, meta).
- `src/components/blog/BlogCard.tsx` (categoría, extracto, meta).
- `src/app/(public)/favoritos/page.tsx` (estado vacío).
- `src/app/(public)/not-found.tsx` (texto del 404).
- `src/app/(public)/reset-password/page.tsx` (título, labels, inputs y placeholders sobre card blanca).
- `src/components/layout/SearchBox.tsx` (ícono y dropdown sobre blanco).
- `src/components/layout/CartDrawer.tsx` (~25 casos: items, subtotal, total, cupón, regalo, recompensa).

Se dejaron intactos los `text-white` que **sí** están sobre fondos de color (botones `bg-sport-green`/`bg-sport-orange`, badge WhatsApp `#25D366`, overlay negro de categorías y avatares). Verificado en el render real: sin `text-white/50` ni `text-white/80` en blog, blog post, favoritos y 404.

## Capturas "después" (`docs/capturas/`)

- `despues-home-390.png` (390×2600, full)
- `despues-home-390-fold.png` (390×844, above-the-fold)
- `despues-home-1280.png` (1280×800, above-the-fold)
- `despues-blog-390.png` y `despues-favoritos-390.png` (contraste corregido)

> Nota: Chrome headless falla al escribir capturas con viewports muy altos (≥1400 px) en este entorno; por eso el desktop se captura a la altura de pantalla estándar.

## Pendientes (no bloqueantes)

1. **Assets faltantes**: recorte limpio de producto, fotos de lotes reales, logo vectorial definitivo.
2. **Inspección visual**: las capturas se generaron pero no pudieron revisarse con el modelo (sin entrada de imagen); validar a ojo antes del deploy.

## Checklist post-deploy

- [ ] `https://nutrifit-web.vercel.app` (o dominio apex) responde y el 301 desde hosts legacy funciona (`nutrifit.cl` → apex).
- [ ] `/sitemap.xml` sin `/favoritos`, con `/sobre-nosotros`.
- [ ] `/robots.txt` con disallow de admin/pos/login/favoritos.
- [ ] OG image resuelve en `https://nutrifitsuplementos.cl/opengraph-image`.
- [ ] Google Rich Results Test: `Store`, `FAQPage`, `Product` sin errores.
- [ ] Search Console: reenviar sitemap y solicitar indexación de home + productos.
- [ ] Verificación de merchant (garantía 10 días, envío sin "gratis").
