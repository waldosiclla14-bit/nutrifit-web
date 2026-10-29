# Auditoría Fase 0 — NutriFit

**Fecha:** 29 de octubre de 2026
**Alcance:** reconocimiento técnico y línea base. **Sin cambios de código de producto.**
**Sitio auditado:** `https://nutrifitsuplementos.cl` (producción, Vercel) + código en `origin/main` = `904c58e` (28-oct-2026 00:40 -03).
**Rama de trabajo:** auditoría sobre `origin/main` (`904c58e`); los entregables de esta fase viven en la rama `docs/fase-0-audit`.
**Estado de partida:** 112 tests en 12 suites, en verde (`npx jest`, 40,4 s).

---

## 0. Método y limitaciones

| Qué | Cómo se midió |
|---|---|
| Stack y código | Lectura directa del repo, `package-lock.json`, `git`. |
| Imágenes | `Get-ChildItem` sobre `public/img` + script de referencias cruzadas sobre 514 archivos del repo. |
| Rendimiento (línea base) | Lighthouse 12 CLI con **emulación móvil** (`--form-factor=mobile`, throttling simulado), Chrome 156.0.8078.73. 3 páginas. |
| Métricas de campo simuladas | Playwright 1.49.1 + Chrome 156, viewport **390×844**, `deviceScaleFactor: 3`, `isMobile`, UA iPhone, **sin throttling** (`PerformanceObserver` con `buffered: true`). |
| Desbordamiento horizontal | `documentElement.scrollWidth` vs `innerWidth` a 390 px. |
| Capturas | 390×844 con emulación móvil real → `docs/capturas/fase-0/`. |

**Limitaciones registradas:**
- **PageSpeed Insights no disponible:** la API respondió `Quota exceeded for quota metric 'Queries'` (cuota diaria agotada). La línea base se hizo con Lighthouse local, que es equivalente en metodología pero no reproducible por terceros sin el mismo entorno.
- **INP no medido.** INP requiere interacción real de usuarios. Como proxy se usa **TBT** (Total Blocking Time) de Lighthouse.
- **Sin acceso** a paneles de Vercel, Render, Cloudflare ni Search Console: no se pudo verificar indexación, logs de edge ni configuraciones de despliegue.
- **El carrito no tiene URL propia** (es un drawer). Lighthouse no puede abrirlo, así que se midió con Playwright tras agregar un producto. Se reporta como medición auxiliar, no comparable con las otras tres.
- Reloj del entorno ~114 s adelantado; las fechas de consulta se tomaron del `date` del servidor.

> **Nota sobre capturas:** las primeras capturas hechas con `chrome --headless --screenshot` (sin emulación móvil) **recortaban** el layout y hacían parecer que había desbordamiento horizontal. Con emulación móvil real el desbordamiento es **0 px** en las tres páginas. Las capturas válidas son las de `docs/capturas/fase-0/*-390.png` y `carrito-390.png`.

---

## 1. Stack y estructura

| Aspecto | Valor verificado |
|---|---|
| Framework | **Next.js 16.4.0** (App Router, `package.json` declara `^16.3.0`) |
| React | 19.2.8 |
| Lenguaje | TypeScript 5.9.3 |
| Estilos | **Tailwind CSS 3.4.19** + `tailwind.config.ts` + `globals.css` con variables |
| Animación | framer-motion 12.43.0 |
| Iconos | lucide-react 0.525.0 |
| Estado | React Context (`CartContext`) + `localStorage` (`lib/store.ts`) |
| Backend | NestJS + Prisma en `backend/`, mismo repo; API en `api.nutrifitsuplementos.cl` |
| Gestor de paquetes | **npm** (`package-lock.json` presente; sin yarn/pnpm) |
| Node | v24.18.1 |
| Tests | Jest + Testing Library (`npx jest`) |
| PWA | Service worker propio (`public/sw.js`, cache `nutrifit-v5`) |

**Rutas públicas:** `/` · `/productos` · `/productos/[slug]` · `/marcas` · `/blog` · `/blog/[slug]` · `/sobre-nosotros` · `/legal` · `/favoritos` · `/reset-password`.
**Rutas privadas:** `/admin`, `/pos`, `/login`.
**API interna:** `/api/keep-alive`, `/api/notificaciones/evento`, `robots.txt`, `sitemap.xml`, `manifest.webmanifest`.

### 1.1 Dónde vive cada cosa

| Pieza | Archivo |
|---|---|
| Catálogo (33 productos) | `src/data/seed.ts` → `PRODUCT_RAW` |
| Packs/sets (5) | `src/data/seed.ts` → `BUNDLES` (línea 1046) |
| Combos (3) | `src/data/seed.ts` → `COMBOS` |
| Categorías (7) | `src/data/seed.ts` → `CATEGORIES` |
| Testimonios home (10) | `src/components/home/UGCProof.tsx` |
| Reseñas de producto (backend) | `src/lib/reviews.ts` + `ProductReviews.tsx` |
| Carrito y checkout | `src/context/CartContext.tsx` + `src/components/layout/CartDrawer.tsx` |
| Mensaje de WhatsApp | `src/lib/whatsapp.ts` |
| Configuración de negocio | `src/lib/store.ts` (`DEFAULT_SETTINGS`) — **no hay `siteConfig`** |
| Layout raíz / metadata | `src/app/layout.tsx` |
| Footer | `src/components/layout/Footer.tsx` |
| FAQ | `src/components/home/FAQ.tsx` |
| SEO | `src/app/sitemap.ts`, `robots.ts`, `lib/seo/merchant-config.ts`, JSON-LD en `page.tsx` |
| Envío (Blue Express) | `src/lib/blue-express.ts`, `src/lib/policies.ts` |

**No existe** un archivo único de configuración de negocio. Hoy los valores están repartidos: `DEFAULT_SETTINGS` (localStorage), `policies.ts` (`SHIPPING_METRO_FEE = 1000`), constantes locales en componentes (`PACK_PRICE = 27500` en `HeroSection.tsx` y `StickyBottomBar.tsx`) y copy directo en JSX.

---

## 2. Modelo de datos

### 2.1 `Product` (`src/types/index.ts`)

| Campo | Tipo | Estado / nota |
|---|---|---|
| `id`, `slug`, `name`, `brand`, `category`, `categoryLabel` | string/number | OK |
| `price` | number | Precio actual |
| `oldPrice` | number? | **Precio "antes" sin marca de verificación** (32 de 33 productos lo tienen) |
| `desc`, `benefits[]` | string | Copy con afirmaciones de salud (ver F-28) |
| `stock` | number | Stock del seed, **no viene de la base de datos en la ficha pública** |
| `publicStock`, `publicPublished` | number?/boolean? | Usados por admin/POS |
| `rating`, `reviews` | number | Estáticos en el seed |
| `image` | string | Ruta en `public/img` |
| `modoUso`, `nutrientes[]`, `ingredientes[]` | — | Ficha técnica |
| `goal[]`, `tags[]` | string[] | Filtros |
| `bestseller`, `newArrival` | boolean? | Badges |
| `weightKg`, `packageDims` | number?/objeto? | Talla de envío Blue Express |
| `variants[]` | `{ name, image, stock, sku?, rating?, reviews? }` | Sabores (whey: 5) |

**Campos que el plan exige y no existen:** `compareAtVerified`, `reviewStatus`, `verified` (en reseñas de producto), `stockVerified`.

### 2.2 `Bundle` (packs)

```ts
{ id, title, subtitle?, items: { productId, quantity }[], pricing: 'sum' | 'fixed',
  fixedPrice?, image?, tag? }
```

| Pack | Componentes | Imagen declarada | Problema |
|---|---|---|---|
| Pack Proteína + Creatina ($27.500) | 4 + 31 | `producto1.webp` | Solo muestra la whey |
| Pack Proteína + Creatina + Shaker ($32.000) | 4 + 31 + 35 | `producto1.webp` | Solo muestra la whey; falta shaker |
| Set Masa + Fuerza ($29.000) | 4 + 7 | `producto4.webp` | Solo muestra un pote de whey |
| Set Pump Total ($27.000) | 8 + 12 | `producto8.webp` | **`producto8.webp` es una creatina FullEnergic** |
| Set Bienestar ($29.000) | 9 + 10 | `producto9.webp` | **`producto9.webp` es el óxido nítrico Rain** (producto 8) |

### 2.3 Otras entidades

- `Order` (`types/index.ts`): incluye `deliveryMethod`, `metroLine`, `metroStation`, `address`, `comuna`, `blueSize`… **el tipo soporta domicilio, pero el checkout nunca lo usa**.
- `Settings`: `whatsapp`, `shipping`, `giftProductId`, `giftThreshold`, `giftLabel`, `rewardThreshold`, `rewardPercent`. Persistido en `localStorage` por navegador (no es configuración de servidor).
- `UserReview` (reseñas de producto): nombre, rating, texto, fecha; `verified` se envía desde el formulario.

---

## 3. Inventario de imágenes

**Total: 42 archivos, 13,98 MB.** 7 PNG, 8 JPG, 27 WEBP.

| Archivo | Peso | Uso |
|---|---|---|
| `fnl-omega-3-premium.png` | 1.952 KB | Producto 9 |
| `FullEnergic 100% Vegan Protein Cookies & Cream 1kg.png` | 1.861 KB | Producto 6 |
| `creatina full energic 300g.png` | 1.733 KB | Producto 7 |
| `Whey Protein FNL 947g Chocolate Suizo.png` | 1.732 KB | Producto 37 |
| `rain-testofull-ultra.png` | 1.691 KB | Producto 30 |
| `proteina whey full energic + creatina eco naturales 300g.png` | 1.655 KB | Banner del pack |
| `ostrovit-whey.jpg` | 1.596 KB | Producto 36 |
| `producto34.jpg` … `producto37.jpg` | 151–206 KB | Productos 31–34 |
| `producto1/4/6/8/9.webp` | 10–70 KB | Hero, categorías y packs |
| `producto7.webp` | — | **Sin referencias: huérfana** |

Notas:
- **7 archivos ≥ 1,5 MB.** Con `next/image` se sirven redimensionados (la ficha pidió `w=750` → 15 KB), pero **las `og:image` apuntan al PNG original**: `generateMetadata` arma `${SITE_URL}${product.image}` y el JSON-LD usa la misma ruta. Un `og:image` de 1,9 MB rompe las previsualizaciones en WhatsApp/redes.
- **Nombres con espacios y mayúsculas** (`creatina full energic 300g.png`): se codifican como `%20` en cada URL y ensucian el cache/CDN.
- **Fondos y encuadres heterogéneos:** los `.webp` son fotos de estudio con fondo blanco/gris; los PNG/JPG nuevos tienen otro fondo y otra relación de aspecto. La lista definitiva para el dueño se genera en Fase 3.7.
- **`sizes` incorrecto en tarjetas:** `ProductCard.tsx:53` declara `(max-width: 640px) 100vw`, pero en móvil la grilla es de 2 columnas (~50vw) → se descarga una imagen al doble del tamaño necesario.

---

## 4. Línea base de rendimiento (móvil)

### 4.1 Lighthouse (throttling simulado, Moto G Power)

| Página | Perf | FCP | **LCP** | CLS | TBT | Peso total | Nodos DOM |
|---|---|---|---|---|---|---|---|
| `/` | **sin puntaje** | 1,3 s | **NO_LCP** | 0 | — | 521 KiB | 2.724 |
| `/productos` | **0,71** | 1,2 s | **4,4 s** | 0 | **550 ms** | 676 KiB | 1.487 |
| `/productos/fullenergic-100-whey-protein-1kg` | **0,73** | 1,2 s | **5,8 s** | 0 | 280 ms | 426 KiB | 774 |

- La home **no produce LCP**: Lighthouse lanza `LanternError: NO_LCP` y deja la categoría `performance` sin puntaje.
- El "redirect" de 3.830 ms que reporta la ficha es un **falso positivo**: la traza muestra **0 respuestas 3xx** y **2 documentos 200**. La causa real es la doble carga de F-01.

### 4.2 Medición directa (390×844, sin throttling, `PerformanceObserver`)

| Página | LCP | Elemento LCP | FCP | CLS | TTFB | Recursos | Peso | Imágenes |
|---|---|---|---|---|---|---|---|---|
| `/` | **0 (no se emite)** | — | 944 ms | 0 | 233 ms | 30 | 396 KB | 1 |
| `/productos` | 1.060 ms | `IMG` tarjeta de producto | 860 ms | 0 | 266 ms | 44 | 681 KB | 10 |
| ficha whey | 556 ms | `IMG` del producto | 556 ms | 0 | 246 ms | 32 | 409 KB | 1 |
| carrito (tras agregar) | — | — | — | 0 | — | — | **1.230 KB** | — |

### 4.3 Peso de la home

- HTML de la home: **620.518 bytes sin comprimir** (~45 KB gzip). Es el documento más pesado del sitio: incluye todo el catálogo serializado en el payload de React Server Components.
- **Altura de la home a 390 px: 14.815 px.** Catálogo: 8.282 px. Ficha: 6.652 px.
- **CLS 0** en las tres páginas: no hay problema de desplazamiento.
- **TBT 550 ms en catálogo**: es el peor punto de bloqueo del sitio.

### 4.4 Desbordamiento horizontal

0 px en `/`, `/productos` y ficha a 390×844 (`scrollWidth === innerWidth`). Los únicos elementos más anchos que el viewport son los del carrusel de confianza, que están dentro de un contenedor con `overflow: hidden` (comportamiento intencional).

---

## 5. Hallazgos

Clasificación: **CONFIRMADO** = reproducido con evidencia ejecutada · **PROBABLE** = evidencia fuerte pero falta la prueba directa · **NO VERIFICADO** = requiere al dueño o acceso externo.

### P0 — Rompen la experiencia o la confianza

| ID | Hallazgo | Estado | Evidencia |
|---|---|---|---|
| **F-01** | **El service worker recarga la página en cada visita.** | **CONFIRMADO** | Con `serviceWorkers: 'block'` → **1** documento. Con SW permitido → **2** documentos (9 ms y 1.278 ms), y `navigation.type` del segundo es **`reload`**. Ocurre también en visitas repetidas. Causa en código: `public/sw.js` llama `skipWaiting()` en `install` y `clients.claim()` en `activate`; `PWA.tsx` escucha `updatefound` y hace `window.location.reload()` al activarse. Efecto: cada visita carga el sitio dos veces; el LCP de Lighthouse (4,4 s / 5,8 s) está inflado por esa segunda carga. |
| **F-02** | **La home no emite LCP.** | **CONFIRMADO** (efecto) / **PROBABLE** (causa) | `LCP = 0` con `PerformanceObserver` instalado antes de la carga (Playwright, 2 corridas) y `NO_LCP` en Lighthouse. Causa probable: el hero y varias secciones entran con `initial={{ opacity: 0 }}` (Framer Motion) y la animación corre en el compositor, por lo que el navegador nunca registra un candidato LCP visible. Se confirma en Fase 3 quitando el fade del hero y volviendo a medir. |
| **F-03** | **Packs con imágenes de productos que no contienen.** | **CONFIRMADO** | `Set Bienestar` (omega 3 + berberina) usa `producto9.webp`, que es el **óxido nítrico Rain**. `Set Pump Total` (óxido nítrico + L-citrulina) usa `producto8.webp`, que es una **creatina FullEnergic**. `Set Masa + Fuerza` y los dos packs con shaker muestran solo la whey. Verificado abriendo las imágenes y cruzando `items` con `image` en `seed.ts`. |
| **F-04** | **"773 reseñas" del hero es un dato falso.** | **CONFIRMADO** | `HeroSection.tsx:40` suma `reviews` de los productos **4 (617)** y **7 (156)**, pero el pack que vende está compuesto por **4 + 31** (Eco Naturales, 12 reseñas). Además la nota 4,9 es el promedio de dos productos distintos, no del pack. |
| **F-05** | **Estrellas y nota con 0 reseñas.** | **CONFIRMADO** | `OstroVit 100% Whey 700g` (id 36) y `Whey Protein FNL 947g` (id 37) tienen `reviews: 0` y muestran "4.9 (0)" en la tarjeta (`ProductCard.tsx:102-104`). |
| **F-06** | **El checkout no permite envío a domicilio, pero el sitio lo promete.** | **CONFIRMADO** | `CartDrawer.tsx` solo renderiza `Línea` y `Estación`; `checkout()` exige ambas y **nunca** asigna `deliveryMethod`; `saveCustomerProfile` fija `'metro'`. Mientras: `layout.tsx`, `manifest.ts`, `FAQ.tsx`, `Footer.tsx`, `MetroCoverage.tsx`, `/sobre-nosotros` y `legal` prometen domicilio por Blue Express. Existe maquinaria de domicilio (`blue-express.ts`, `Order.address`) sin usar en la web. |
| **F-07** | **Mojibake en el footer.** | **CONFIRMADO** | El tagline del footer sale como `Nutrici` + 2× `U+FFFD` + `n` + `U+FFFD ? U+FFFD` + `Energ` + 2× `U+FFFD` + `a`… en el HTML de producción. Localizado con precisión: **1 sola línea** de 515 archivos de código escaneados, `src/data/seed.ts:7` (`BRAND.tagline`), con puntos de código U+FFFD reales. `package.json` está sano (el mojibake que se ve en consola es de la consola, no del archivo). `<meta charSet="utf-8">` y `lang="es"` correctos. |

### P1 — Errores de contenido y conversión

| ID | Hallazgo | Estado | Evidencia |
|---|---|---|---|
| **F-08** | **Promesas de entrega contradictorias.** | **CONFIRMADO** | Hero: "Disponible para entrega en Metro o domicilio **hoy**" (`HeroSection.tsx:184`). TrustStrip: "Entrega **24–48 hrs**". FAQ: "normalmente dentro de las **24 a 48 horas**". `/sobre-nosotros`: "en su estación de Metro **el mismo día**". |
| **F-09** | **Tres definiciones de garantía incompatibles.** | **CONFIRMADO** | `Guarantee.tsx`: "te devolvemos tu dinero. **Sin preguntas**, sin drama. **Solo productos sin abrir**" (se contradice en la misma frase). `TrustBadges.tsx`: "**Cambios garantizados** · Hasta 10 días". `TrustStrip.tsx`: "Garantía 10 días · Productos sin abrir". |
| **F-10** | **Badge "Pago seguro" sin pasarela de pago.** | **CONFIRMADO** | `HeroSection.tsx:232` muestra "Pago seguro" con candado. No existe integración de pago: todo es WhatsApp + efectivo/transferencia contra entrega. |
| **F-11** | **Escasez basada en stock no verificado.** | **CONFIRMADO** | `StockUrgency` usa `product.stock` del seed. La ficha de `FullEnergic Creatina 300g` (stock 3) muestra literalmente "¡Solo quedan 3 unidades!" en el HTML de producción. No hay confirmación de que ese stock sea real ni sincronizado con la base de datos. |
| **F-12** | **Precios "antes" en 32 de 33 productos, sin verificación.** | **CONFIRMADO** | `ProductCard.tsx` muestra `oldPrice` tachado y calcula el `-%` siempre que exista. Descuentos de 4 % a 18 %. No hay campo que marque el precio como verificado; no se puede afirmar que sean precios practicados. |
| **F-13** | **"En oferta" no es una selección.** | **CONFIRMADO** | `FeaturedCarousel.tsx` usa `PRODUCTS.filter(p => getDiscount(p))` → **32 productos**, ordenados por % de descuento. La sección promete "por tiempo limitado". |
| **F-14** | **Venta cruzada contraproducente.** | **CONFIRMADO** | Con una whey en el carrito, "Completa tu pedido" ofrece **otra proteína** (`FullEnergic 100% Vegan Protein Cookies & Cream`, $18.000). Capturado en la prueba del carrito. |
| **F-15** | **Testimonios "Verificada" inventariados y con productos inexistentes.** | **CONFIRMADO** | `UGCProof.tsx` tiene **10 testimonios hardcodeados**, todos con `verified: true` y chip "Verificada". Dos mencionan productos que **no están en el catálogo**: "pre-entreno FullEnergic" y "glutamina con electrolíticos". Otros declaran efectos ("me ayudó con la digestión", "se nota en la calidad"). |
| **F-16** | **Hasta 4 badges apilados sobre la foto del producto.** | **CONFIRMADO** | `ProductCard.tsx`: `-%`, "Más vendido", "5 sabores" y `StockUrgency` conviven en la esquina superior izquierda (visible en `docs/capturas/fase-0/catalogo-390.png`). |
| **F-17** | **Validación del checkout invisible y sin semántica.** | **CONFIRMADO** | Al enviar con campos vacíos, el error aparece como un `<p>` genérico arriba del botón ("Completa tu nombre y teléfono"), sin `aria-live`, sin marcar el campo y sin scroll/foco. Los campos usan solo `placeholder`: sin `<label>`, sin `autocomplete`, sin `inputmode="tel"`. |
| **F-18** | **`og:image` apunta a PNG de hasta 1,9 MB.** | **CONFIRMADO** | `productos/[slug]/page.tsx` y `buildProductJsonLd` usan `product.image` sin optimizar. |
| **F-19** | **Barra inferior fija vende el pack del hero en toda la home.** | **CONFIRMADO** | `StickyBottomBar.tsx`: se muestra con `window.scrollY > 400`, sin condición de sección. |
| **F-20** | **`/legal` no menciona derecho a retracto.** | **CONFIRMADO** | La página existe (66 KB, 200) y tiene las 4 anclas del footer, pero no contiene la palabra "retracto" ni plazos de garantía formales. |
| **F-26** | **El bloque de confianza del carrito queda tapado por la barra de total.** | **CONFIRMADO** | En `carrito-390.png` los 4 íconos (Metro o domicilio / Cambios garantizados / Originales / WhatsApp) se cortan a la mitad detrás de la barra fija inferior con el total y el botón. El contenido que queda debajo no se puede leer sin desplazar. |
| **F-27** | **El botón flotante de WhatsApp tapa el nombre del producto.** | **CONFIRMADO** | En `catalogo-390.png` la burbuja verde cubre el título de la segunda tarjeta. Es permanente y no se oculta al hacer scroll. |
| **F-28** | **Descripciones y sets con afirmaciones terapéuticas.** | **CONFIRMADO** | `seed.ts`: la berberina "ayuda a regular la glucosa, mejora la sensibilidad a la insulina, favorece un perfil lipídico saludable"; el set Bienestar promete "corazón, colesterol y metabolismo"; el quemador y el TestoFull usan lenguaje de resultado. Son claims de efecto fisiológico en un producto vendido sin receta. Requiere revisión legal/sanitaria antes de mantenerlos (Fase 1.4). |

### P2 — Técnico y mantenibilidad

| ID | Hallazgo | Estado | Evidencia |
|---|---|---|---|
| **F-21** | HTML de home de 620 KB y DOM de 2.724 nodos. | CONFIRMADO | Ver §4.3. |
| **F-22** | `sizes` de tarjetas pide el doble de ancho en móvil. | CONFIRMADO | `ProductCard.tsx:53` = `100vw` con grilla de 2 columnas. |
| **F-23** | Imagen huérfana y nombres con espacios/mayúsculas. | CONFIRMADO | `producto7.webp` sin referencias; 7 archivos con espacios en el nombre. |
| **F-24** | Valores de negocio hardcodeados en componentes. | CONFIRMADO | `PACK_PRICE = 27500` / `PACK_OLD = 30000` en `HeroSection.tsx` y `StickyBottomBar.tsx`; `SHIPPING_METRO_FEE = 1000` en `policies.ts`; `60000`/`5` en `store.ts`. |
| **F-25** | Accesibilidad: 0,95 en la home. | CONFIRMADO | Lighthouse: contraste insuficiente y jerarquía de encabezados no secuencial. El resto de páginas no se auditó con axe en esta fase. |
| **F-29** | **`npm run lint` falla hoy.** | CONFIRMADO | `eslint .` recorre también `backend/` y `backend/dist/`: 19 errores + 3 warnings, todos preexistentes y ajenos a esta fase (`@next/next/no-assign-module-variable` en specs del backend que asignan `module`). La regla 7 del plan ("lint debe pasar antes de cada commit") **no se puede cumplir** hasta acotar el `lint` al frontend o agregar un `.eslintignore`/config propia para `backend/` y `dist/`. |
| **F-30** | **`npm run build` falla en el primer intento.** | CONFIRMADO | Next 16.4.0 detiene la compilación para mostrar una recomendación de actualización por aviso de seguridad (`This command stopped to show the upgrade recommendation`, exit 1). Al **reintentar** el mismo comando compila completo (exit 0). Ya existe la rama `security/next-16.4.3` (PR #4) sin fusionar. Afecta la regla 7 del plan: el build hay que correrlo dos veces o actualizar Next. |

---

## 6. Decisiones pendientes del dueño

Ninguna se implementó. Todas quedan detrás de flag/config con el valor actual como default (§6 de `docs/MEJORAS.md`).

| # | Decisión | Default acordado | Dato que falta |
|---|---|---|---|
| 1 | Qué precios "antes" son reales | No mostrar tachado ni % | Lista de productos con precio anterior efectivamente practicado |
| 2 | Qué testimonios/claims se mantienen | Ocultar los detectados | Revisión legal/sanitaria; origen de cada testimonio |
| 3 | Tarifa Metro $1.000: cobrar, absorber o gratis desde monto | Se mantiene $1.000, visible desde el hero | Costo real por entrega |
| 4 | Umbral y % del descuento por monto | $60.000 / 5 % | Ticket promedio real |
| 5 | Texto único de garantía | "10 días, productos sin abrir y con sello intacto" | Política real de cambios/devoluciones |
| 6 | Aplicar el precio de pack automáticamente | No aplicar; solo mostrar ahorro | Margen del pack |
| 7 | Pasarela de pago | Scaffold apagado | Proveedor elegido y credenciales |
| 8 | Cómo se verifica una reseña | Chip "Verificada" oculto | Criterio de verificación |

**Decisiones adicionales que la auditoría agrega (no estaban en el plan):**

| # | Decisión | Por qué |
|---|---|---|
| 9 | **¿Se sigue ofreciendo domicilio?** | El sitio lo promete en al menos 7 lugares y el checkout no lo permite. Hay que reactivar el selector (con dirección/comuna y tarifa Blue Express) o quitar todas las menciones. |
| 10 | **¿El stock del seed es real?** | La escasez ("solo quedan 3") se muestra con datos estáticos. Si no hay stock real, hay que apagar F-11 antes de publicar. |
| 11 | **¿Los 10 testimonios de la home son de clientes reales?** | Hoy están hardcodeados con `verified: true` y dos mencionan productos que no se venden. |
| 12 | **¿Se mantiene la recarga del service worker?** | Es un bug (F-01), no una decisión, pero apagarlo cambia el comportamiento de actualización de la PWA. |

---

## 7. Lo que no se pudo verificar

| Tema | Motivo | Cómo cerrarlo |
|---|---|---|
| Indexación en Google | Sin Search Console ni resultados de búsqueda del dominio | Enviar `sitemap.xml` (42 URLs, responde 200) y revisar cobertura |
| LCP "real" de usuarios | Sin CrUX ni Analytics | Activar Web Vitals en GA4 |
| INP | Requiere interacción real | Medir con `web-vitals` en producción |
| Stock, precios "antes", reseñas, políticas | Datos del negocio | Confirmación del dueño |
| Tarifas Blue Express | Sin cuenta ni API | Documentación/cuenta del proveedor |
| Estado de despliegue (Vercel/Render) | Sin acceso | Panel del dueño |

---

## 8. Orden sugerido para la Fase 1

El plan original abre con imágenes de packs (1.1). La auditoría sugiere **adelantar dos arreglos** porque contaminan cualquier medición posterior:

1. **F-01 (doble carga del SW)** — hoy cualquier medición de rendimiento está inflada y el usuario ve un parpadeo en cada visita. Es un cambio pequeño y aislado.
2. **F-07 (encoding)** — una línea, riesgo cero.

Después, el orden del plan (1.1 → 1.7) funciona: packs, reseñas, claims, escasez/precios, promesas y `siteConfig` al final como cierre.

**Dependencias técnicas a tener en cuenta:**
- 1.2 y 1.3 tocan `HeroSection`, `ProductCard`, `BestSellerCard`, `RatingSummary` y `ProductReviews`: conviene un helper único de "reseñas válidas" antes de tocar componentes.
- 1.5 y 1.7 dependen de `siteConfig`: crearlo primero (aunque sea con los valores actuales) evita dos pasadas por los mismos archivos.
- 1.4 (`scan-claims.ts`) debe correr **antes** de reescribir copy, para no perder la lista de lo detectado.

---

## 9. Archivos creados en esta fase

| Archivo | Contenido |
|---|---|
| `docs/MEJORAS.md` | Plan completo entregado por el dueño |
| `docs/AUDIT.md` | Este informe |
| `docs/capturas/fase-0/home-390.png` | Home a 390×844 |
| `docs/capturas/fase-0/catalogo-390.png` | Catálogo a 390×844 |
| `docs/capturas/fase-0/ficha-390.png` | Ficha de producto a 390×844 |
| `docs/capturas/fase-0/carrito-390.png` | Carrito abierto con 1 producto a 390×844 |

**No se modificó ningún archivo de producto, configuración ni contenido.**
