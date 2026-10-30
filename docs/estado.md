# Estado del proyecto NutriFit

## Sesión: Fase 1 — P0 errores y confianza (`fix/fase-1`)

### Objetivo
Ejecutar la Fase 1 de `docs/MEJORAS.md` (1.1 a 1.7) sin cambiar precios, stock ni
políticas reales, dejando cada valor de negocio en un solo archivo y cada decisión
del dueño detrás de un flag reversible.

### Decisiones tomadas
- **Una sola fuente de verdad** (`src/lib/site-config.ts`): tarifa de entrega en Metro,
  umbral de envío gratis, umbral y % del premio por monto, umbral de stock bajo,
  garantía, plazo de entrega, medios de pago, horario y flags de visualización.
  `DEFAULT_SETTINGS` de `src/lib/store.ts` ahora se deriva de ahí.
- **Precio "antes" sin verificar no se muestra** (`siteConfig.offers.requireVerifiedCompareAt`
  = `true` y `compareAtVerified` por defecto `false`). Consecuencia: hoy no hay tachado
  ni `-N%` en productos; los packs sí muestran su ahorro porque se calcula sumando los
  precios actuales de sus componentes, no un precio inventado.
- **Conteo de reseñas**: `summarizeRatings` / `summarizeBundleRatings` ponderan por
  cantidad de reseñas y devuelven `null` si no hay ninguna ⇒ sin estrellas ni nota.
  El hero del pack muestra **629** (617 whey + 12 creatina Eco Naturales), no 773.
- **Chip "Verificada" eliminado** de `UGCProof.tsx`: los 10 testimonios son fijos y no
  existe verificación de compra registrada. Los testimonios siguen visibles hasta que el
  dueño decida qué se mantiene (1.4).
- **Plazo de entrega unificado** en `siteConfig.delivery.promise`:
  «Entrega coordinada por WhatsApp, normalmente en 24 a 48 horas.» Se quitó "hoy" del
  hero porque no hay registro que lo respalde. **[DECISIÓN DEL DUEÑO]** si la entrega
  real es el mismo día, se cambia solo ese texto.
- **Escasez**: `siteConfig.stock.showCounts = false` ⇒ no se muestra "Solo quedan N" ni
  "Stock disponible: N uds." aunque el umbral esté configurado.
- **1.4 se entrega solo como reporte**. No se ocultó ni reescribió copy: cada hallazgo
  necesita decisión del dueño sobre qué se mantiene, qué se reescribe y con qué respaldo.
- **Imágenes**: se renombraron 4 archivos con espacios/`%`/`+` a slugs y se actualizaron
  las rutas del seed; el optimizador de Next devolvía 500/404 con esos nombres.
- **Fuera de alcance respetado**: no se tocó el envío a domicilio (sigue pendiente de
  decisión), ni `backend/render.yaml`, ni `keep-alive.yml`. No se ejecutó
  `next upgrade --agent=security` (vive en `security/next-16.4.3`, PR #4).

### Archivos creados/modificados
- **Nuevos**: `src/lib/site-config.ts`, `src/lib/ratings.ts` (+`.test.ts`),
  `src/lib/bundles.ts` (+`.test.ts`), `src/components/ui/BundleImages.tsx`,
  `scripts/scan-claims.ts`, `docs/claims-review.md`, `docs/capturas/fase-1/*.png`.
- **Datos y tipos**: `src/data/seed.ts` (packs sin imagen propia, rutas renombradas),
  `src/types/index.ts` (`compareAtVerified`), `src/lib/store.ts` (defaults desde config).
- **Cálculo**: `src/lib/utils.ts` (`getDiscount` con gating, `verifiedOldPrice`,
  `lineDiscount`) y `src/lib/utils.test.ts`.
- **Componentes**: `ProductCard`, `BestSellerCard`, `ProductDetail`, `ProductReviews`,
  `RatingSummary`, `StockUrgency`, `FeaturedCarousel`, `CartDrawer`, `HeroSection`,
  `Packs`, `BundleOffers`, `StickyBottomBar`, `TrustStrip`, `TrustBadges`, `Guarantee`,
  `Benefits`, `FAQ`, `UGCProof`.
- **Páginas y copy**: `sobre-nosotros`, `legal`, `opengraph-image`, `lib/ai/recommender.ts`.
- **Imágenes**: `public/img/fullenergic-vegan-protein-cookies-cream-1kg.png`,
  `creatina-full-energic-300g.png`, `whey-protein-fnl-947g-chocolate-suizo.png`,
  `proteina-whey-full-energic-creatina-eco-naturales-300g.png`.
- **Plan**: `docs/MEJORAS.md` marca 1.1–1.3 y 1.5–1.7 como hechas; 1.4 como reporte.

### Verificación ejecutada
- `npx jest`: **14 suites / 121 tests OK** (incluye 9 tests nuevos de ratings, bundles y
  gating de precios).
- `npm run lint`: exit 0 (0 errores, 3 warnings preexistentes de `<img>` y hooks en admin).
- `npm run build`: exit 0 **al segundo intento**; el primero falla por el aviso de
  seguridad de Next 16.4.0 → sigue abierto como **F-30**.
- `npx next start -p 3100` + Playwright (390×844): `/`, `/productos`,
  `/productos/fullenergic-100-whey-protein-1kg`, `/sobre-nosotros` y `/legal` responden
  **200**; 0 errores de página. Comprobado en el DOM: catálogo **sin** tachados ni
  "En oferta" vacía, sin "Solo quedan", sin "Verificada"; el pack del hero muestra
  4.9 / 629 reseñas / `$27.500` / `-8%`.
- `/_next/image` de las 4 imágenes renombradas: **200** (antes 500/404 con `URIError`).
- `npm run scan:claims`: **45 hallazgos** (30 alta, 14 media, 1 baja) en
  `docs/claims-review.md`.

### Capturas
`docs/capturas/fase-1/home-390.png`, `catalogo-390.png`, `ficha-390.png`,
`carrito-390.png`, `packs-390.png` (comparar con `docs/capturas/fase-0/`).

### Pendiente / requiere validación humana
- **1.4 claims**: decidir qué testimonios y textos se mantienen, cuáles se reescriben y
  cuáles se quitan. Hay 30 hallazgos de severidad alta (enfermedad, cura, hormonas,
  "resultados garantizados"). Mientras no haya decisión, el contenido sigue publicado.
- **Precios "antes"**: confirmar cuáles son reales para marcar `compareAtVerified: true`;
  hasta entonces el sitio no muestra descuentos en productos.
- **Stock real**: decidir si se publica el conteo (`siteConfig.stock.showCounts`).
- **Entrega**: confirmar plazo real (24–48 h vs mismo día) y si el domicilio se habilita.
- **F-06 domicilio** sigue sin tocar: el checkout solo permite Metro.
- **F-30** (build falla al primer intento por el aviso de Next) sigue abierto.
- INP no medido (TBT como proxy); PSI sin cuota; indexación sin Search Console.

### Siguiente paso
Revisión del dueño sobre 1.4 y los precios "antes". Con su OK se fusiona el PR de
`fix/fase-1` y se abre la Fase 2 (checkout y conversión).

---

## Sesión: adaptación de referencia chilesuplementos.cl

### Objetivo
Analizar el sitio de referencia `https://www.chilesuplementos.cl/` e implementar ideas
adaptables a NutriFit (elegidas por el estudiante): navegación por objetivo, barra superior
informativa, carruseles "Recién llegados"/"Ofertas" y página de marcas.

### Decisiones tomadas
- **No inventar métricas**: "Recién llegados" se basa en curaduría editorial explícita
  (campo `newArrival`), no en fechas ni cifras inexistentes. `Product` no tiene `createdAt`.
- **No copiar envío gratis** de la referencia: NutriFit mantiene su política vigente
  (envío gratis eliminado por decisión previa). La barra superior destaca entrega en Metro,
  horario y WhatsApp.
- **Marcas reales desde el seed**: se corrigió una lista hardcodeada desactualizada
  (4 marcas en `Catalog.tsx` vs 7 reales). Ahora se deriva `PRODUCT_BRANDS` de `PRODUCTS`.
- **Filtros por URL**: el catálogo ahora sincroniza `?cat=`, `?q=`, `?marca=` y `?goal=`
  con `useSearchParams`, permitiendo enlaces profundos desde el menú y `/marcas`.

### Archivos creados/modificados
- `src/types/index.ts`: campo `newArrival?` en `Product`.
- `src/data/seed.ts`: `PRODUCT_BRANDS` derivado; `newArrival: true` en 6 productos curados.
- `src/components/product/Catalog.tsx`: lee parámetros de URL; marcas desde seed.
- `src/app/(public)/productos/page.tsx`: acepta `marca` y `goal`.
- `src/components/layout/Header.tsx`: dropdowns "Categorías" y "Por objetivo" (desktop) +
  chips en menú móvil; enlace "Marcas".
- `src/components/layout/TopBar.tsx` (nuevo): barra informativa superior.
- `src/app/(public)/layout.tsx`: monta `TopBar`.
- `src/app/(public)/marcas/page.tsx` (nuevo): página de marcas con conteo de productos.
- `src/app/sitemap.ts`: incluye `/marcas`.
- `src/components/home/HomeCarousel.tsx` (nuevo): carrusel reutilizable.
- `src/components/home/FeaturedCarousel.tsx`: renderiza Top ventas + Ofertas + Recién llegados.

### Verificación ejecutada
- `npx tsc --noEmit`: sin errores.
- `npm run build`: OK; `/marcas` estática; `/productos` dinámica (usa `useSearchParams`).
- `npx eslint <archivos>`: sin errores.
- `npx jest`: **78/78** tests (9 suites).
- Verificación en local: `?marca=Rain` excluye productos FNL; "Por objetivo" renderiza;
  TopBar con WhatsApp presente; `/marcas` lista todas las marcas.

### Capturas
`docs/capturas/ref-marcas-390.png`, `ref-marcas-1280.png`, `ref-home-ofertas-1280.png`,
`ref-productos-marca-390.png`.

### Pendiente / requiere validación humana
- Revisar visualmente los carruseles "Ofertas" y "Recién llegados" en producción.
- Confirmar la lista de productos marcados como `newArrival` (curaduría editorial).
- Considerar limpiar cifras no verificables de `/sobre-nosotros` (+500, 140+) en una
  sesión aparte; no formaba parte de esta adaptación.

### Siguiente paso
Deploy y verificación en producción (sitemap, robots, Rich Results, Search Console).

---

## Sesión: optimización de conversión (flujo de compra)

### Objetivo
Mejorar atractivo y facilidad de compra, basado en auditoría del flujo (carrito, checkout
WhatsApp, ficha, packs).

### Decisiones tomadas
- **Eliminar escasez/prueba social fabricada** (regla "no inventar"): `LiveViewers`
  (número aleatorio de personas viendo), `RecentSalesToast` (ventas con nombres/comunas
  inventados) y `TopStockBanner` (stock hardcodeado = 12). Archivos eliminados.
- **Persistir datos del cliente** (nombre, teléfono, línea y estación) en localStorage,
  clave `nutrifit:customer:v1`, para autocompletar compras recurrentes.
- **Cupón NUTRIFIT5 auto-aplicable**: el modal de primera compra ahora guarda el código
  pendiente (`nutrifit:pending-coupon:v1`) y abre el carrito; se aplica solo si hay
  teléfono. Ya no obliga a pedirlo por WhatsApp.
- **CTAs "Comprar por WhatsApp"** de ficha y hero ahora agregan al carrito y abren el
  drawer para capturar datos antes de generar el pedido (el vendedor ya no pregunta todo).
- **Medios de pago declarados** (confirmados por el dueño): **efectivo y transferencia**
  (pago contra entrega), visibles en carrito, ficha y mensaje de WhatsApp.
- **Sección "Sets y packs"** en la home con ahorro visible; arregla el ancla rota `/#sets`
  que referenciaba el banner.
- **Código muerto**: `COMBOS` y `TESTIMONIALS`/`REVIEWS` del seed se mantienen sin usar,
  por decisión del dueño (se conservan para reutilizar).

### Archivos creados/modificados
- Eliminados: `src/components/product/LiveViewers.tsx`, `src/components/ui/RecentSalesToast.tsx`,
  `src/components/home/TopStockBanner.tsx`.
- `src/lib/store.ts`: perfil de cliente + cupón pendiente.
- `src/types/index.ts`: tipo `CustomerProfile`.
- `src/components/layout/CartDrawer.tsx`: precarga de datos, cupón pendiente, línea de pagos.
- `src/components/home/FirstOrderOffer.tsx`: cupón al carrito (sin WhatsApp).
- `src/components/product/ProductDetail.tsx` / `src/components/home/HeroSection.tsx`: CTAs
  por carrito; texto de pagos.
- `src/components/home/Packs.tsx` (nuevo) + `src/app/(public)/page.tsx`.
- `src/lib/whatsapp.ts`: mensaje indica "Efectivo o transferencia (contra entrega)".

### Verificación ejecutada
- `npx tsc --noEmit`, `npm run build`, `npx eslint`: sin errores.
- `npx jest`: **78/78** (9 suites).
- Local: `#sets` presente, `TopStockBanner` ausente, sección de packs renderiza.

### Capturas
`docs/capturas/conv-packs-390.png`, `conv-home-1280.png`, `conv-producto-1280.png`.

### Pendiente / requiere validación humana
- Revisar en producción el flujo completo: agregar → carrito → datos → WhatsApp.
- Probar persistencia del perfil borrando `nutrifit:customer:v1`.
- Considerar limpiar cifras no verificables de `/sobre-nosotros` (+500, 140+) en otra sesión.

### Siguiente paso
Deploy de los commits de conversión y verificación en producción.

---

## Sesión: envío a domicilio con Blue Express

### Objetivo
Agregar una segunda opción de entrega en el carrito: **envío a domicilio con Blue
Express**, además del retiro en Metro ya existente.

### Decisiones tomadas
- **Solo domicilio** (sin retiro en Punto Blue Express) y **cobro al cliente** de la tarifa.
- **Alcance inicial**: Santiago (Región Metropolitana), tallas **S** ($4.200) y **M**
  ($4.800). Comuna de texto libre: si el cliente está en región, la tarifa se confirma
  por WhatsApp.
- **Tarifas**: tabla oficial de Blue Express (entrega a domicilio, misma región), consultada
  el 2026-10-20 en `blue.cl/emprendedores/plataforma-emprendedores`. Registradas en
  `src/lib/policies.ts` con su fuente y fecha.
- **NutriFit NO tiene contrato comercial con Blue Express** (confirmado por el dueño el
  2026-10-21). Las cifras aplicadas son la **tarifa de lista** publicada por Blue Express.
  Blue Express permite registrarse como cliente empresarial sin costo de apertura y sin
  mínimos de envíos ("solo pagas por lo que envías"), por lo que esas tarifas son las que
  se pagan sin acuerdo previo. Queda anotado en `policies.ts` para que nadie asuma un
  precio negociado.
- **Tallas sin peso real por producto**: ver la sección siguiente ("talla calculada por el
  local"), que corrigió este punto tras verificar las reglas oficiales de Blue Express.
- **Sin integración con la API de Blue Express** en esta fase: se cotiza y se confirma por
  WhatsApp.
- **El pedido llega al backend como `deliveryType: 'ENVIO_DOMICILIO'`** (mismo enum que el
  POS: `METRO` / `RETIRO_TIENDA` / `ENVIO_DOMICILIO`).
- **La dirección viaja en `Order.deliveryDetails`**: el modelo Prisma `Order` no tiene
  columnas de dirección (esas están en el modelo `Delivery`, que solo se crea para Metro),
  así que se usó el campo de texto libre existente, sin migración.
- **El admin muestra "Domicilio"** con la dirección; antes mostraba "Retiro tienda" para
  cualquier tipo distinto de Metro.
- **JSON-LD alineado**: `SHIPPING_BLUE_FEE` pasó de $4.000 a $4.200 (talla S) para que
  Google declare la misma tarifa que el checkout.

### Archivos creados/modificados
- `src/lib/policies.ts`: tarifas `BLUE_DOMICILIO_SANTIAGO` (S/M) con fuente y fecha;
  `SHIPPING_BLUE_FEE` alineado a $4.200.
- `src/types/index.ts`: `DeliveryMethod`, `BlueSize`; `Order` y `CustomerProfile` con
  `deliveryMethod`, `address`, `comuna`, `region`, `blueSize`.
- `src/context/CartContext.tsx`: estado `deliveryMethod`/`blueSize`; `shipping` deja de ser
  fijo y depende del método (Metro = `settings.shipping`; domicilio = tarifa Blue por talla).
- `src/components/layout/CartDrawer.tsx`: selector de método de entrega, campos de
  domicilio, selector de talla, precio de envío dinámico, validación condicional.
- `src/lib/whatsapp.ts`: el mensaje distingue entrega en Metro y domicilio (dirección,
  comuna, tamaño del paquete).
- `src/lib/api.ts`: `deliveryType` según método; dirección en `deliveryDetails`.
- `src/types/admin.ts`, `src/components/admin/Ordenes.tsx`: mostrar domicilio y dirección.
- `src/lib/blue-express.test.ts` (nuevo), `src/context/CartContext.test.tsx`: tests.

### Verificación ejecutada
- `npx tsc --noEmit`, `npm run build`, `npx eslint`: sin errores.
- `npx jest`: **90/90** (10 suites; 12 tests nuevos).
- En local (Chrome vía CDP, `scripts/capture-cart.mjs`): con un producto de $27.500,
  el total da **$28.500** en Metro ($1.000) y **$31.700** en domicilio talla S ($4.200).
  El radio "Envío a domicilio" queda con `aria-checked="true"`.

### Capturas
`docs/capturas/blue-carrito-390.png`, `blue-carrito-1280.png`, `blue-carrito-metro-1280.png`.

### Pendiente / requiere validación humana
- **Medir el peso real de cada producto** para asignar la talla automáticamente y dejar de
  pedirla al cliente.
- **Abrir la cuenta de Blue Express (paso operativo bloqueante)**: hasta registrarse en
  `app.bluex.cl` como cliente empresarial no se pueden generar etiquetas ni despachar. Es
  gratis, sin mínimos y sin costo de apertura. Mientras tanto, la opción de domicilio del
  carrito existe en el sitio pero no se puede cumplir.
- **Flujo manual por pedido**: sin integración con la API, hay que generar la etiqueta en
  `app.bluex.cl`, imprimirla y dejar el paquete en un Punto Blue Express. Blue Express
  permite "envío por pagar", en que el cliente paga el despacho al courier en la entrega
  (coincide con el pago en efectivo de NutriFit).
- **Cobertura a regiones**: hoy la tarifa de referencia es Santiago. Si se amplía, revisar
  la tabla oficial completa y `SHIPPING_ZONES` del JSON-LD. Ojo: Blue Express públicamente
  suspendió los envíos desde Puntos en Arica, Parinacota y Tarapacá, aunque las entregas
  en esas regiones siguen operativas.
- **Integración real con Blue Express** (generación de etiqueta y seguimiento) queda para
  una fase aparte; hoy se coordina por WhatsApp.
- Los pedidos a domicilio **no aparecen en el tablero de Entregas** (ese tablero usa el
  modelo `Delivery`, que solo se crea para Metro). Se ven en Órdenes.

### Siguiente paso
Push a producción y revisión del flujo de domicilio en el admin.

---

## Sesión: coherencia de textos con el nuevo envío a domicilio

### Objetivo
La nueva modalidad de envío dejó **falsos** varios textos del sitio. Se corrigieron
todos para que no se prometa (ni se niegue) algo que el negocio ya no cumple.

### Decisiones tomadas
- **El FAQ decía "Por el momento no hacemos despacho a domicilio"** → era falso. Ahora
  describe las dos modalidades y sus alcances (Metro en todo Santiago; domicilio en
  Santiago por Blue Express).
- **Los títulos SEO se dejaron intactos** ("...con Entrega en Metro"): no son falsos y
  cambiarlos habría alterado el posicionamiento ya ganado. Sí se actualizaron las
  **descripciones** (metadatos, Open Graph, Twitter, manifest, ficha de producto).
- Las políticas de entrega legales ahora mencionan las dos modalidades y que **el costo
  se informa en el carrito** (antes decía que se informaba por WhatsApp).
- No se tocó la línea de tiempo de "Sobre nosotros" (el hito de 2024 sobre Metro es
  histórico) ni los textos internos del POS y del admin.

### Archivos modificados
`src/components/home/FAQ.tsx`, `TopBar.tsx`, `HeroSection.tsx`, `Benefits.tsx`,
`MetroCoverage.tsx`; `src/components/layout/TopBar.tsx`, `Footer.tsx`, `CartDrawer.tsx`;
`src/components/product/ProductDetail.tsx`; `src/components/ui/TrustBadges.tsx`;
`src/lib/ai/recommender.ts`; `src/app/layout.tsx`, `manifest.ts`,
`src/app/(public)/layout.tsx`, `page.tsx`, `legal/page.tsx`, `sobre-nosotros/page.tsx`,
`productos/[slug]/page.tsx`.

### Verificación ejecutada
- `npx tsc --noEmit`, `npm run build`, `npx jest` (**90/90**), `npx eslint`: sin errores.
- En local: la home ya no contiene "no hacemos despacho a domicilio"; sí menciona entrega
  a domicilio en la barra superior, el hero y las políticas legales.

### Capturas
`docs/capturas/blue-home-390.png`, `blue-home-1280.png`.

### Pendiente / requiere validación humana
- Revisar en producción que ninguna otra descripción (redes, Google Business, flyers)
  siga diciendo "solo Metro" o "no hacemos domicilio".

---

## Sesión: auditoría de la feature de envío a domicilio

### Objetivo
Auditar el código de la modalidad de envío a domicilio **antes** de subirlo a
producción, y corregir los errores encontrados. La auditoría se hizo en dos
pasadas: una sobre el diff de la feature (web) y otra sobre el flujo completo
de pedidos en el admin y el backend.

### Bugs corregidos (web)
| # | Bug | Impacto |
|---|---|---|
| 1 | `getCustomerProfile()` reconstruía el perfil solo con 4 campos y **descartaba** método, dirección, comuna y talla | La precarga del perfil era **código muerto**: el cliente reescribía su dirección en cada compra y el método de entrega volvía siempre a Metro |
| 2 | El upsell post-compra cobraba **siempre la tarifa de Metro** | Un pedido a domicilio de $4.200 generaba un mensaje con "*Entrega:* $1.000" y un total mal calculado |
| 3 | El upsell decía "lo incluimos sin costo de envío" | Prometía algo que no era cierto (ahora: "lo despachamos con el mismo envío") |
| 4 | `EditOrderModal` degradaba cualquier tipo distinto de Metro a `'STORE'` | **`STORE` no existe en el enum de Prisma** → el backend respondía 400 en **cada** guardado de un pedido no-Metro. Afectaba también a `RETIRO_TIENDA` (bug previo) |
| 5 | `save()` del admin sin `try/catch` | El error se perdía como *unhandled rejection*: el vendedor creería que guardó y el modal no se cerraba |
| 6 | El admin nunca enviaba `deliveryDetails` | La dirección no era editable y quedaba a un paso de borrarse |
| 7 | El admin anulaba `deliveryDay`/`deliveryTime` si el tipo no era Metro | Pérdida latente de la fecha de entrega |
| 8 | `region` fija en "Región Metropolitana" con comuna de texto libre | **Dato falso** guardado y mostrado al cliente (mensaje de WhatsApp) y al vendedor. Se eliminó el campo: la comuna basta |
| 9 | La pantalla "Pedido enviado" siempre confirmaba "en tu estación de metro" | Falso para pedidos a domicilio |
| 10 | El Dashboard etiquetaba los pedidos a domicilio como "Retiro tienda" | El vendedor no veía la dirección al revisar los pedidos pendientes |
| 11 | El FAQ decía "al finalizar la compra te cotizamos la tarifa" | Contradecía al carrito (tarifa fija visible) y a las políticas legales. Se publica además como JSON-LD `FAQPage` |
| 12 | El radiogroup del selector de entrega sin roving tabindex ni flechas | El patrón ARIA se anunciaba pero las flechas no hacían nada. Ahora: flechas, Home/End, `tabindex` rotativo e indicador no cromático del estado activo |
| 13 | El JSON-LD declaraba solo la tarifa S ($4.200) | Google veía una tarifa que no era la máxima posible. Ahora declara S **y** M |

### Bugs corregidos (backend)
| # | Bug | Impacto |
|---|---|---|
| 14 | No se creaba el registro `Delivery` para los pedidos públicos a domicilio | El pedido **no aparecía** en Entregas, Calendario ni el contador de entregas del día, y el vendedor no podía gestionarlo (sin código de entrega, sin "En ruta/Llegó") |
| 15 | Las plantillas de notificación decían "Te esperamos en *Metro la estación*" | Un cliente de domicilio recibía "¡El repartidor llegó a la estación!" — y en **retiro en tienda** también |
| 16 | El POS no enviaba la dirección en la orden | El admin mostraba "Domicilio —" sin dirección para las ventas de mostrador |
| 17 | El recordatorio push decía siempre "🚇 Entrega en X min · Metro {estación}" | Mostraba "Metro " vacío en los envíos a domicilio |

### Decisiones tomadas
- **Se eliminó el campo `region`** en lugar de mantenerlo: con comuna de texto libre no
  se puede saber la región sin inventar un listado de comunas. El pedido lleva
  dirección + comuna, que es lo que el vendedor necesita.
- El perfil del cliente **conserva los datos de la otra modalidad** al cambiar entre
  compras (guardar un pedido a domicilio no borra la estación de Metro, ni al revés).
- El tipo de entrega real (`METRO` / `RETIRO_TIENDA` / `ENVIO_DOMICILIO`) se usa en
  todo el admin, con normalización del valor legado `STORE`.
- Los **títulos SEO** se dejaron intactos a propósito: no son falsos y cambiarlos altera
  el posicionamiento. Se actualizaron las descripciones.

### Verificación ejecutada
- Web: `npx tsc --noEmit`, `npm run build`, `npx jest` (**93/93**), `npx eslint`: sin
  errores ni warnings.
- Backend: `npx tsc --noEmit -p tsconfig.json`, `npm test` (**132/132**).
- Accesibilidad del selector medida con Chrome DevTools Protocol
  (`scripts/check-radiogroup.mjs`): `tabindex` rotativo `["0","-1"]`, las flechas
  mueven foco y selección, Home/End correctos.
- Persistencia del perfil verificada en navegador real (`scripts/check-profile.mjs`):
  con un perfil de domicilio guardado, el carrito precarga método, dirección, comuna
  y talla.
- Flujo de compra reverificado: total **$31.700** en domicilio (27.500 + 4.200).

### Archivos modificados
Web: `src/lib/store.ts`, `src/lib/whatsapp.ts`, `src/lib/api.ts`, `src/lib/policies.ts`,
`src/lib/blue-express.test.ts`, `src/lib/seo/merchant-config.ts` (+ test),
`src/components/layout/CartDrawer.tsx`, `src/components/admin/EditOrderModal.tsx`,
`src/components/admin/Resumen.tsx`, `src/components/admin/Entregas.tsx`,
`src/components/admin/NotificationButton.tsx`, `src/components/pos/Pos.tsx`,
`src/components/home/FAQ.tsx`, `src/types/index.ts`, `src/types/admin.ts`.
Backend: `backend/src/orders/orders.service.ts` (+ spec),
`backend/src/delivery/notification.service.ts` (+ spec nuevo),
`backend/src/delivery/delivery.service.ts`.

### Capturas
`docs/capturas/audit-carrito-390.png`, `audit-carrito-1280.png`.

### Pendiente / requiere validación humana
- **El backend hay que desplegarlo**: los cambios de `backend/` (creación de la
  entrega a domicilio y plantillas de notificación) no surten efecto hasta que
  Render despliegue la API.
- **Abrir la cuenta de Blue Express**: hasta registrarse en `app.bluex.cl` no se
  pueden generar etiquetas ni despachar. La opción de domicilio está publicada en
  el sitio pero no es operable sin esto.
- Medir el peso real de cada producto para asignar la talla automáticamente.
- Preexistentes fuera del alcance: `updateOrder` no sincroniza el registro
  `Delivery` cuando se cambia la estación/fecha; `returnOrder` no cancela la
  entrega asociada; dos warnings de `react-hooks/exhaustive-deps` en el POS
  (`Pos.tsx:311` y `:449`).

### Siguiente paso
Push a producción del frontend y despliegue del backend, luego verificación en vivo
del flujo de domicilio.

---

## Sesión: regla oficial de talla Blue Express (el local la calcula)

### Objetivo
El dueño ya tiene cuenta en `app.bluex.cl`. Al revisar la **guía oficial de tallas**
de Blue Express se confirmó que el diseño anterior (que el **cliente** eligiera la
talla) era un riesgo económico y operativo. Se rediseñó.

### Reglas verificadas (fuente oficial, 2026-10-20)
`https://www.blue.cl/nosotros/centro-de-ayuda/tallas-envio` y el tarifario PYME
`https://www.blue.cl/docs/enviar/tarifario-pyme.pdf` (enlazado desde esa misma guía):
- La talla depende del **peso físico y del volumen** del paquete.
- **Peso volumétrico = (largo × ancho × alto en cm) / 4000**; se cobra el **mayor**
  entre el físico y el volumétrico.
  Ejemplo de Blue: 1 kg en una caja de 30×30×30 → volumétrico 6,75 → **talla L**.
- "Cuando un paquete supera el límite de peso o volumen de una talla, **pasa de
  inmediato al siguiente tamaño**" (Blue lo reclasifica y lo cobra así).
- "**Intenta siempre seleccionar la talla correcta para evitar la suspensión de tu
  cuenta.**"
- Tallas disponibles: XS, S, M, L. L admite hasta 20 kg; medidas máximas 70×70×70 cm.

### Por qué cambió el diseño
Si el cliente elegía "S" y la caja real era de 30×30×30, Blue la factura como L
($5.400) pero el cliente solo había pagado $4.200: **la diferencia la absorbía el
local**, y los reclasificaciones reiterados pueden **suspender la cuenta**.

### Decisiones tomadas
- **El cliente ya NO elige la talla.** La calcula el local con la fórmula oficial.
- Se implementó `src/lib/blue-express.ts` con la fórmula de Blue, los límites por
  talla y el cálculo del pedido (la talla mayor de todos sus productos, porque van
  en el mismo paquete).
- `Product` acepta `weightKg` y `packageDims` (cm) para calcular la talla por
  producto. **Hoy el catálogo no tiene esos datos**, así que se usa la talla por
  defecto del local (`BLUE_DEFAULT_SIZE = 'M'`, la más conservadora: una talla mayor
  de la real la absorbe el local; una menor, el cliente).
- El precio del envío a domicilio **se muestra en el carrito** con la talla ya
  resuelta; el texto explica que el tamaño lo determina el local.
- La talla viaja en el pedido (`Order.blueSize`) y en el mensaje de WhatsApp, para
  que el vendedor genere la etiqueta en `app.bluex.cl` con la talla correcta.

### Verificación ejecutada
- `npx tsc --noEmit`, `npm run build`, `npx eslint`: sin errores.
- `npx jest`: **103/103** (11 suites; 10 tests nuevos del cálculo de talla).
- Los tests detectaron un **bug de la propia implementación**: la talla por defecto
  "M" ganaba siempre y un pedido de productos chicos nunca daba talla S. Se corrigió
  diferenciando "talla desconocida" (null) de "talla M".
- En navegador real: el carrito ya **no muestra selector de talla**; el total con
  domicilio es **$32.300** ($27.500 + $4.800, talla M) y el perfil sigue precargando
  método, dirección y comuna.

### Pendiente / requiere validación humana
- **Medir cada producto**: peso en kg y medidas de la caja/embalaje en cm, para
  cargar `weightKg` y `packageDims` en el seed y que la talla sea exacta. Con un
  1 kg en caja de 30×30×30 el envío es talla L, no S.
- **Contraste de la tabla de tallas**: los límites en kg están publicados en imágenes
  en la guía oficial, no en texto. Confirmarlos con la calculadora de
  `app.bluex.cl` (o con el tarifario PYME en PDF).
- **Decidir el cobro del envío**: hoy el envío va dentro del total del carrito y el
  cliente lo paga al local en la entrega. Blue Express permite "envío por pagar"
  (el cliente paga el despacho al courier), que reduciría el riesgo de cobro. Es una
  decisión comercial pendiente.

### Siguiente paso
Cargar pesos y medidas en el catálogo y decidir el esquema de cobro del envío.

---

## Sesión: datos reales de empaque y cálculo por pedido

### Objetivo
El dueño aportó las medidas reales de los empaques para que la talla Blue Express
sea exacta y no una suposición.

### Datos entregados (2026-10-21)
- "Frascos de pastillas: disponibles en capacidades que van desde 15 ml hasta 100 ml."
- "Las dimensiones de un envase de 1 kg de plástico para proteínas pueden variar,
  pero aquí hay algunas medidas comunes: envase de proteína en polvo: mide
  aproximadamente **139.09 x 120 mm**."
- Medidas orientativas con ejemplos publicados:
  | Artículo | Medida orientativa |
  |---|---|
  | Whey 1 kg, pote | 14-17 x 14-17 x 21-24 cm (ej.: 14 cm diámetro x 21,5 cm alto; 17x17x23) |
  | Creatina 300 g, pote | ~9 x 9 x 15 cm |
  | Pote de cápsulas | ~5,5 x 5,5 x 10,5 cm (referencia 120 cápsulas) |
  | Shaker 500 ml | ~9 x 9 x 18-20 cm (hasta 24 cm con compartimentos) |

### Interpretación y cálculo
- El **divisor de Blue Express es 4.000**, confirmado en su guía oficial ("el peso
  volumétrico se calcula multiplicando alto x largo x ancho y dividiendo por
  4.000"). No es 5.000.
- El **shaker del catálogo es de 700 ml** (Botella Keep Sport Shaker 700 ml), no
  de 500 ml: se modeló con 9,5 x 9,5 x 22 cm.
- El pote de proteína se modeló como **14 x 14 x 21,5 cm** (el diámetro de 13,9 cm
  del dueño corresponde al ejemplo de 14 cm de diámetro; la altura de 12 cm que se
 -guessó al inicio- era incorrecta y se corrigió con la altura de 21,5 cm).
- Se cargó `weightKg` y `packageDims` en los **33 productos** del catálogo, así que
  la talla **nunca** cae en el valor por defecto.
- El cálculo del pedido se hizo sobre la **caja completa** (base máxima x altura
  acumulada + 2 cm de holgura), no sobre la talla mayor de cada producto: 3 botes de
  1 kg pesan 3,3 kg y eso ya es **talla M** aunque cada bote por sí solo sea S.
- Se redondea el peso facturable a 2 decimales: los acumulados de coma flotante
  (3,3000000000000003) podían tippingar el paquete en el límite exacto de una talla.

### La regla final: "suelto y en caja"
Práctica del local (2026-10-21): **un solo producto va suelto** (el pote sellado, tal
cual) y **los pedidos de varios productos van en caja**. Como Blue Express mide el
paquete que recibe, eso fija la tarifa:

| Formato del pedido | Peso | Caja | Facturable | Talla | Envío |
|---|---|---|---|---|---|
| 1 whey 1 kg | 1,1 kg | 16x16x23,5 (suelto) | 1,50 kg | S | $4.200 |
| 1 frasco de pastillas | 0,2 kg | 7,5x7,5x12,5 (suelto) | 0,20 kg | S | $4.200 |
| 1 creatina 300 g | 0,45 kg | 11x11x17 (suelto) | 0,51 kg | S | $4.200 |
| 1 batidora 700 ml | 0,2 kg | 11,5x11,5x24 (suelto) | 0,79 kg | S | $4.200 |
| whey + 1 frasco | 1,3 kg | 25x20x25 (caja) | 3,13 kg | M | $4.800 |
| whey + creatina | 1,55 kg | 25x20x25 (caja) | 3,13 kg | M | $4.800 |
| 2 whey 1 kg | 2,2 kg | 30x25x20 (caja) | 3,75 kg | M | $4.800 |
| 3 whey 1 kg | 3,3 kg | 44x16x23,5 (caja) | 4,14 kg | M | $4.800 |

**Regla simple para el cliente: $4.200 si es un solo producto, $4.800 si son varios**
(el volumen de la caja es lo que sube la talla).

**Corrección importante:** con el default anterior (M) se cobraban $4.800 en
pedidos que en realidad son talla S. Con los datos reales, un pedido de un solo
producto cobra $4.200.

### Verificación ejecutada
- `npx tsc --noEmit`, `npm run build`, `npx eslint`: sin errores.
- `npx jest`: **118/118** (12 suites).
- En navegador real: el carrito con un bote de 1 kg en Metro da **$31.700**
  ($27.500 + $4.200, talla S).

### Pendiente / requiere validación humana
- **Las cajas de courier son un supuesto**: se configuraron seis tamaños habituales
  (20x15x10, 25x20x15, 30x20x15, 25x20x25, 30x25x20, 40x30x25) en
  `COURIER_BOXES_CM`. Hay que cargar **las cajas que el local realmente tiene**:
  de eso depende que un pedido de varios productos sea talla S ($4.200) o M
  ($4.800). Por ejemplo, con una caja de 30x20x15 el pedido "whey + 1 frasco"
  bajaría de M a S.
- **Confirmar las medidas con cinta métrica** y el peso con báscula del pote de
  whey que vende NutriFit, del pote de creatina y de la batidora.
- **Confirmar los límites en kg por talla** con la calculadora de `app.bluex.cl`.

### Siguiente paso
Cargar las cajas reales del local y las medidas de los envases.

---

## Sesión: retiro del envío a domicilio (solo Metro)

### Objetivo
El dueño indicó que **por el momento no se ofrece envío a domicilio con Blue Express**.
Se eliminó la opción del carrito público y se volvió al único modo de entrega:
retiro en estación de Metro de Santiago.

### Decisiones tomadas
- **El carrito solo ofrece "Retiro en Metro"**: se eliminó el selector de
  método de entrega (domicilio/metro), la tarifa de Blue Express y los campos
  de dirección/comuna del checkout.
- **El código de Blue Express se conserva inactivo**: `src/lib/blue-express.ts`
  y el cálculo de tallas (`COURIER_BOXES_CM`, `orderPackage`) quedan en el
  código para cuando el dueño decida reactivar el envío a domicilio. No se
  borra para no perder el trabajo de cálculo de tarifa.
- **Backend**: el código de `deliveryType: 'ENVIO_DOMICILIO'` y la creación de
  `Delivery` para domicilio permanecen en `backend/` pero el frontend no los
  invoca, por lo que no afectan al funcionamiento actual.

### Archivos modificados
- `src/components/layout/CartDrawer.tsx`: se eliminó el radiogroup de método
  de entrega, los campos de dirección/comuna y la tarifa de Blue Express; el
  carrito usa siempre `deliveryMethod: 'metro'` y `settings.shipping`.
- `src/context/CartContext.tsx`: se eliminó el estado de `deliveryMethod` y
  `blueSize`; el envío siempre es `settings.shipping`.
- `src/lib/whatsapp.ts`: se eliminó la lógica de mensaje de domicilio; el
  pedido indica siempre "Metro".
- `src/lib/blue-express.ts` y `src/data/seed.ts`: se mantienen sin cambios
  (cálculo de talla por paquete), listos para cuando se reactive el domicilio.

### Verificación ejecutada
- `npx tsc --noEmit`, `npm run build`, `npx eslint`: sin errores.
- `npx jest`: **107/107** (11 suites).
- En navegador real: el carrito muestra solo "Retiro en Metro" y el total es
  `$27.500 + $1.000 = $28.500` para un bote de 1 kg.

### Siguiente paso
Cuando el dueño decida reactivar el envío a domicilio, restaurar el selector
en el carrito y conectar el backend de `ENVIO_DOMICILIO` (actualmente listo
pero sin uso).

---

## Sesión: Fase 6A - Notificaciones push (PWA) de pedidos web

### Objetivo
Implementar la base del sistema de notificaciones push (Web Push con VAPID) para que el administrador reciba alertas en su dispositivo cuando ocurran eventos de pedidos en la página web.

### Decisiones tomadas
- **No usar servicios de pago de terceros**: se usa Web Push estándar (VAPID) con la librería `web-push` ya instalada en el backend.
- **Webhook compartido**: el frontend envía eventos al endpoint `/api/notificaciones/evento` con un secreto compartido (`WEBHOOK_SECRET`), que los reenvía al backend de NutriFit (`/push/evento`).
- **Anti-duplicado**: la tabla `notificaciones_enviadas` evita notificar dos veces el mismo evento (tipo + referencia).
- **Preferencias por usuario**: cada usuario puede activar/deshabilitar cada tipo de evento mediante `preferencias_notificacion`.
- **Mensajes sin datos personales**: las notificaciones no incluyen nombre, teléfono ni dirección del cliente.

### Archivos creados/modificados
- `public/manifest.webmanifest` (nuevo): manifiesto PWA con iconos 192/512, `display: standalone`, `theme_color`, atajos.
- `src/app/api/notificaciones/evento/route.ts` (nuevo): endpoint que valida `WEBHOOK_SECRET` y reenvía al backend.
- `backend/prisma/schema.prisma`: agregadas tablas `PreferenciaNotificacion`, `NotificacionEnviada`; agregado campo `activa` a `PushSubscription`.
- `backend/src/push/push.service.ts`: agregado método `procesarEventoPedido` y tipo `EventoPedido`.
- `backend/src/push/push.controller.ts`: endpoint `POST /push/evento` sin JWT (valida secreto compartido).
- `backend/.env` y `backend/.env.example`: agregadas `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `WEBHOOK_SECRET`.
- `.env.local` y `.env.example` (frontend): agregada `WEBHOOK_SECRET`.

### Verificación ejecutada
- `npx tsc --noEmit` (frontend y backend): sin errores.
- `npm run build` (frontend): compilado exitosamente.
- `npx jest`: **107/107** (11 suites) en frontend.
- El servidor backend no se pudo verificar localmente porque no hay PostgreSQL corriendo en el puerto 5433 (necesario para `prisma db push`).

### Pendiente / requiere validación humana
- **Ejecutar `prisma db push`** cuando haya una base de datos PostgreSQL disponible (local o remota) para crear las tablas `PreferenciaNotificacion` y `NotificacionEnviada`.
- **Generar claves VAPID** (`npx web-push generate-vapid-keys`) y configurarlas en las variables de entorno del backend y Vercel.
- **Configurar Database Webhooks** en Supabase/Render para que los eventos de pedidos lleguen a `/api/notificaciones/evento`.
- **Configurar tareas programadas** (recordatorio 20:00, stock bajo 09:00, resumen diario 21:00, hora Santiago) usando pg_cron de Supabase o cron externo.
- **Probar en iPhone real**: instalar PWA, aceptar notificaciones, verificar que llegan.

### Siguiente paso
Sub-fase 6B: webhook de pedidos y eventos `nueva_venta`, `pago_recibido`, `pedido_agendado` con anti-duplicado.

---

## Sesión: release del landing + migración push + auditoría de cuota

### Decisiones tomadas y por qué

- **No subir `nutrifit 2.0\restored`**: es del 20-ago y producción es del 20-oct. Las secciones que le sobran a producción (`Testimonials`, `Combos`, `BundlesSection`, `FlashSaleCountdown`, `ExitIntentPopup`, `Storytelling`) se eliminaron a propósito en `9c09e47` y `cd2afe8` por no ser verificables. Subirlas sería un retroceso de dos meses (SEO, tema visual, credibilidad).
- **La copia de trabajo real es `Documentos\nutrifit-web`** (clon con `origin` correcto). Al inicio tenía 30 commits propios sin subir y 5 por detrás de `main`.
- **Release por rama, no directo a `main`**: `release/landing-2026-10`, con tag de respaldo `respaldo-antes-release-2026-10-28`. Producción no cambia hasta aprobación humana.
- **Migración añadida antes de fusionar**: los 30 commits cambian `schema.prisma` sin migración, y `db-push.yml` no se ejecuta desde el 12-ago. Sin migración, `delivery.service.ts:728` (`await this.push.broadcast(...)` **sin try/catch**) rompería todo cambio de estado de entrega. La convención del repo es migración **idempotente**, porque `prisma/baseline.js` solo marca 3 migraciones como aplicadas y el resto se re-ejecuta en cada arranque.

### Archivos creados/modificados

- `backend/prisma/migrations/20261028_push_preferencias/migration.sql` (nuevo): `ALTER TABLE push_subscriptions ADD COLUMN activa`, tablas `preferencias_notificacion` y `notificaciones_enviadas`, más sus índices.
- `docs/auditoria-consumo-render-2026-10-26.md`: §27.5.2 (resultado del test de spin-down) y §28 (conclusión de cuota).
- Sin cambios en `src/`: el merge de `origin/main` se resolvió solo y eliminó el latido de `src/lib/api.ts` (32 líneas).

### Verificación ejecutada

| Comprobación | Comando | Resultado |
|---|---|---|
| Tipos frontend | `npx tsc --noEmit` | exit 0 |
| Tipos backend | `npx prisma generate` + `npx tsc --noEmit` | exit 0 |
| Esquema válido | `npx prisma validate` | válido |
| Migración == delta real de Prisma | `prisma migrate diff` + comparación operación por operación | **6/6 idénticas, 0 faltantes, 0 extra** |
| Invariantes de la auditoría | `api.ts` sin latido, `ENABLE_SWAGGER === 'true'`, seed con guarda de versión, Todoist no bloqueante | intactas |
| Build de producción | `npm run build` | compila y genera todas las rutas, pero **exit 1** por el aviso de seguridad de Next.js (ver abajo) |

- El `exit 1` del build **no es un fallo del código**: es `SecurityFatalError`, una función del propio Next.js 16.4.0 (`experimental.agentUpgrade`, política por defecto `'security'` en `next/dist/server/config-shared.js`) que interrumpe builds lanzados por un agente cuando hay avisos de seguridad abiertos. No viene del repo (`next.config.mjs` no la declara) y **no afecta a Vercel**: el bloqueo solo actúa si detecta un agente o hay TTY interactiva, y en CI ninguna de las dos se cumple.
- Los avisos son reales y verificados contra el registro de npm: `next@16.4.0` acumula **3 avisos**, dos de ellos **críticos** — RCE no autenticado en la Image Optimization API usando SVG (`GHSA-2464-fhr4-w9xw`) y RCE en funciones `use cache` que devuelven typed arrays (`GHSA-673q-mjm6-r5xr`). Última versión publicada: **16.4.3**.

### Pendiente / requiere validación humana

- **Aprobar el merge a `main`** después de revisar el preview de Vercel de la rama.
- **Actualizar Next.js 16.4.0 → 16.4.3** por los dos avisos críticos. No se hizo: exige rebuild, prueba del landing y no estaba autorizado.
- Sigue pendiente desde 6A: claves VAPID, Database Webhooks, tareas programadas y prueba en iPhone real.
- `NODE_ENV` sin definir en Render; `/api/auth/bootstrap` sin arreglar; PR #2 (parche de seguridad) sigue abierto.

### Siguiente paso

Revisar el preview → fusionar `release/landing-2026-10` a `main` → verificar que Render aplica `20261028_push_preferencias` en el arranque y que un cambio de estado de entrega sigue funcionando.

---

## Sesión: revisión de errores en backend (entregas y push)

### Hallazgos

Antes de tocar código se comprobó producción: `/api/health`, `/api/products` y `/api/metro-stations` responden 200, la portada de Vercel renderiza sin errores y Swagger sigue en 404. Los 404 de `/api/categories` y `/api/blog` **no son fallos**: esas páginas son estáticas y no consultan la API.

Los defectos reales estaban en el camino de entregas y notificaciones:

| # | Defecto | Impacto | Estado |
|---|---|---|---|
| 1 | `push.service.ts`: `vapid()` se llamaba **fuera** del `try` de `sendTo` | Sin claves VAPID, la excepción subía hasta `dispatchReminders`: el cron respondía **500 y perdía el lote entero** de recordatorios | ✅ corregido |
| 2 | `broadcast()` y `sendToUser()` no filtraban por `activa` | Se seguía notificando a dispositivos **desactivados** (los recordatorios usan `broadcast`) | ✅ corregido |
| 3 | `procesarEventoPedido()` creaba la marca `notificaciones_enviadas` **antes** de enviar y no la liberaba | Un fallo transitorio, o no tener suscriptores, daba el aviso por **enviado para siempre**, sin reintento posible | ✅ corregido |
| 4 | `dispatchReminders()` hacía `await push.broadcast()` sin `try/catch` dentro del bucle | Un fallo cortaba los **recordatorios restantes** y devolvía 500 al cron | ✅ corregido |
| 5 | Carrera `autoCreateDelivery` vs `POST /api/deliveries` sobre `deliveries.orderId` (`docs/propuesta-p2002-delivery.md`) | El vendedor recibía **500 aunque la entrega existiera** | ✅ corregido (parches A y B) |

Además, `dispatchReminders` ahora **no** marca `REMINDER_SENT` si no hubo destinatarios: se reintenta en la siguiente pasada.

### Identificado pero NO corregido (requiere decisión)

`POST /api/auth/bootstrap` no exige sesión y **resetea la contraseña de cualquier usuario** usando `ADMIN_PASSWORD` como clave. Tiene throttle (3 / 5 min) y comparación timing-safe, pero:

- quien conozca `ADMIN_PASSWORD` puede cambiar la contraseña de **cualquier** cuenta, no solo del admin;
- no deja rastro en auditoría.

No se tocó porque desactivarlo elimina la única vía de recuperación si se pierde el acceso. Las opciones son: exigir `ALLOW_BOOTSTRAP=true` (fail-closed, como se hizo con Swagger) o limitarlo a usuarios `ADMIN` y registrar auditoría.

### Archivos modificados

- `backend/src/push/push.service.ts`
- `backend/src/delivery/delivery.service.ts`
- `backend/src/orders/orders.service.ts`
- Pruebas: `push.service.spec.ts`, `delivery.service.spec.ts`, `orders.service.spec.ts`

### Verificación ejecutada

| Comprobación | Comando | Resultado |
|---|---|---|
| Tipos backend | `npx tsc --noEmit -p tsconfig.json` | exit 0 |
| Pruebas backend | `npx jest` | **142/142**, 14 suites, exit 0 (antes 132) |
| Pruebas frontend | `npx jest` | 78/78, 9 suites |

Se añadieron 10 pruebas que cubren cada caso. La de `orders.service.spec.ts` falló al principio porque el mock no tenía `delivery.findUnique`: se detectó y se corrigió el mock, no se relajó la aserción.

### Pendiente / requiere validación humana

- Decidir qué hacer con `/api/auth/bootstrap`.
- Sigue pendiente de 6A: claves VAPID, Database Webhooks, tareas programadas, prueba en iPhone.
- `xlsx` (alto, sin parche en npm) se usa para **leer planillas subidas** en el admin.

### Siguiente paso

Los arreglos van en la rama del release (PR #3), en un commit propio. Tras fusionar: verificar que el cron `POST /api/deliveries/reminders/dispatch` responde 200 y no 500, y que un cambio de estado de entrega funciona.

---

## Sesión: publicación del landing en nutrifitsuplementos.cl

### Diagnóstico (CONFIRMADO)

El dominio no tenía ningún problema de DNS ni de Vercel: `A → 76.76.21.21`, `www → cname.vercel-dns.com`, NS en Cloudflare. Servía **exactamente** el mismo HTML que `nutrifit-web-nu.vercel.app` (280.105 B, mismos chunks).

La causa era otra: **`main` no tenía los cambios**. Vercel publica `main`; los 36 commits del landing vivían solo en `release/landing-2026-10`.

Prueba: el HTML de producción contenía `Stock actualizado hoy` (componente `TopStockBanner`, que el release elimina) y no contenía `HomeCarousel` ni el bloque de sets/packs.

### Publicado

PR **#3** fusionado a `main` (`4bddc73`) con checks en verde (Backend, Frontend, deploy, Vercel). Tras el deploy, el dominio pasó de 280.105 B a 620.518 B y ahora contiene "Sets y packs", "Ofertas", "Recién llegados" y el enlace `/marcas`; ya no contiene el marcador viejo.

### Bug encontrado y corregido al verificar el deploy

`POST /api/push/evento` respondía **401 siempre** en producción. Vivía en `PushController`, con `@UseGuards(JwtAuthGuard, RolesGuard)` de clase; `@UseGuards()` vacío en el método **no anula** los guards de clase (Nest los concatena). El frontend solo manda `x-webhook-secret`, así que ninguna notificación de pedido se enviaba.

Ahora vive en `PushWebhookController`, sin guards, y la autorización la hace `procesarEventoPedido` comparando el secreto. PR **#5**.

### Bootstrap de contraseñas

`POST /api/auth/bootstrap` quedó restringido a cuentas `ADMIN`, con registro en `audit_logs` (`BOOTSTRAP_PASSWORD_RESET` + IP) y con `ENABLE_BOOTSTRAP=false` como interruptor para desactivarlo del todo. En producción responde "Bootstrap no configurado" porque `ADMIN_PASSWORD` no está definida: hoy el endpoint está inerte.

### Verificación ejecutada

| Comprobación | Resultado |
|---|---|
| `/api/health` | 200 `{"status":"ok","db":"ok"}` |
| `/api/ping` | 200 `{"ok":true,"db":1}` |
| `/api/products` | 200 |
| `/api/docs-json` | 404 (correcto) |
| `POST /api/deliveries/reminders/dispatch` sin secreto | 401 (nunca más 500) |
| `npx tsc --noEmit` (backend) | exit 0 |
| `npx jest` (backend) | **151/151**, 16 suites |

### Pendiente / requiere acceso al panel

- **`WEBHOOK_SECRET` igual en Render y Vercel**: sin eso el webhook sigue en 401.
- **Claves VAPID** (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`): sin ellas no se envía ningún push, aunque el cron ya no falla.
- Los textos del sitio siguen ofreciendo **envío a domicilio por Blue Express**, pero el carrito fija `deliveryMethod: 'metro'` y no hay selector de domicilio. Es una decisión de negocio, no se tocó.

### Siguiente paso

Confirmar el 200 del cron con `CRON_SECRET` real y una entrega de prueba; decidir qué hacer con los textos de envío a domicilio.

---

## Sesión: bugs encontrados verificando el sitio publicado

### Corregidos

| # | Bug | Evidencia | Estado |
|---|---|---|---|
| 1 | `addBundle` hacía `p.variants!.indexOf(variant!)` con `variants` opcional | Clic en "Agregar · $27.500" de la portada: `TypeError: Cannot read properties of undefined (reading 'indexOf')`, 0 diálogos, 0 productos | ✅ |
| 2 | `src/lib/reviews.ts` pedía `/reviews/...` sin el prefijo `/api` | `/reviews/product/<slug>` → 404; `/api/reviews/product/<slug>` → 200. La ficha nunca mostraba reseñas y publicar fallaba | ✅ |
| 3 | `api/notificaciones/evento` reenviaba a `/push/evento` sin `/api` | 404, encadenado al guard de clase que ya se quitó | ✅ |
| 4 | `POST /api/push/evento` exigía JWT (`@UseGuards()` vacío no anula los guards de clase) | 401 en el 100% de los envíos | ✅ |

El **#1 rompía el CTA principal de la portada**: el pack más vendido no se podía agregar.

### Verificación en producción (post-deploy)

| Comprobación | Resultado |
|---|---|
| Clic en el pack de portada | Carrito abre, **2 productos**, **0 errores** |
| Ficha de producto | 200, **0 errores de consola** (antes: 404 de reseñas) |
| `/productos` | 200, 66 tarjetas, 0 desbordamiento horizontal |
| `/marcas`, `/sobre-nosotros`, `/blog` | 200, 0 errores |
| `POST /api/push/evento` sin secreto | 400 "Webhook secreto inválido" (ya no 401 de guard) |
| `npx tsc --noEmit` (frontend y backend) | exit 0 |
| `npx jest` (frontend / backend) | **112/112** (12 suites) / **151/151** (16 suites) |

### Incoherencia de negocio detectada (no corregida)

El carrito muestra la insignia **"METRO O DOMICILIO — Retiro en Santiago o envío"** y el texto "o envío a domicilio en Santiago", pero los únicos campos son línea y estación de Metro, y el pedido se crea con `deliveryMethod: 'metro'`. Lo mismo en hero, FAQ, barra superior, legal y sobre nosotros.

Según `docs/estado.md` (sesión del 23-oct), el domicilio se retiró a propósito y el selector se restauraría "cuando el dueño decida reactivarlo". Hay dos salidas y ninguna es técnica:

- **reactivar el domicilio** en el carrito (el backend `ENVIO_DOMICILIO` y `src/lib/blue-express.ts` ya están listos);
- **quitar las menciones de domicilio** del sitio mientras siga desactivado.

### Siguiente paso

Decidir lo del domicilio y confirmar `WEBHOOK_SECRET` y las claves VAPID en Render/Vercel.


---

## Sesión: Fase 0 — reconocimiento y auditoría (29-oct-2026)

### Objetivo
Ejecutar la Fase 0 de `docs/MEJORAS.md`: reconocimiento sin cambios de código, línea base de
rendimiento y `docs/AUDIT.md`. Una fase por sesión; no se avanzó a Fase 1.

### Decisiones tomadas
- **La Fase 0 no toca código de producto.** Solo se agregaron documentos y capturas.
- **PSI estaba sin cuota**, así que la línea base se midió con Lighthouse 12 CLI en modo móvil
  (emulación Moto G Power, throttling simulado) + Playwright/Chrome con viewport 390×844.
- **Las capturas válidas se hacen con emulación móvil.** Las de `chrome --headless
  --screenshot` sin emulación recortaban el layout y simulaban un desbordamiento que no existe.
- **No se inventaron datos.** Todo lo que requiere al dueño quedó como decisión pendiente en
  `docs/AUDIT.md` §6, incluida la contradicción de domicilio ya registrada antes.

### Archivos creados/modificados
- `docs/MEJORAS.md` (nuevo): plan completo del dueño.
- `docs/AUDIT.md` (nuevo): stack, modelo de datos, inventario de imágenes, línea base y 30
  hallazgos clasificados (CONFIRMADO / PROBABLE / NO VERIFICADO).
- `docs/capturas/fase-0/`: `home-390.png`, `catalogo-390.png`, `ficha-390.png`, `carrito-390.png`.
- `docs/estado.md`: esta entrada.

### Hallazgos que cambian el orden de la Fase 1
1. **El service worker recarga la página en cada visita.** Con SW bloqueado hay 1 documento; con
   SW activo hay 2 (el segundo con `navigation.type = 'reload'`). `sw.js` hace `skipWaiting()` +
   `clients.claim()` y `PWA.tsx` recarga al activarse. Infla el LCP de Lighthouse (4,4 s catálogo,
   5,8 s ficha) y produce un parpadeo en cada visita.
2. **La home no emite LCP**: `NO_LCP` en Lighthouse y `LCP = 0` con `PerformanceObserver` real.
   Causa probable: el hero entra con `opacity: 0` (Framer Motion, animación de compositor).
3. **Encoding roto acotado a una línea**: `src/data/seed.ts:7` (`BRAND.tagline`), no todo el repo.
   `package.json` está sano.
4. **Packs con imágenes equivocadas confirmadas**: Set Bienestar muestra óxido nítrico, Set Pump
   Total muestra una creatina, los packs con shaker muestran solo whey.

### Qué se probó y cómo
| Comprobación | Comando / método | Resultado |
|---|---|---|
| Tests frontend | `npx jest --silent` | **112/112**, 12 suites |
| Lint | `npm run lint` | **falla**: 19 errores preexistentes, casi todos en `backend/` y `backend/dist/` |
| Build | `npm run build` | exit 1 en el primer intento (aviso de seguridad de Next 16.4.0); **exit 0 al reintentar** |
| Lighthouse home / catálogo / ficha | `npx lighthouse@12 … --form-factor=mobile` | 521 / 676 / 426 KiB; LCP home `NO_LCP`, 4,4 s, 5,8 s |
| Métricas reales 390×844 | Playwright + `PerformanceObserver` | LCP home 0; catálogo 1.060 ms; ficha 556 ms; CLS 0 |
| Doble carga por SW | Playwright con `serviceWorkers: block` vs `allow` | 1 vs 2 documentos (`reload`) |
| Desbordamiento horizontal | `scrollWidth` vs `innerWidth` a 390 | **0 px** en las 3 páginas |
| Encoding | script sobre 514 archivos + HTML de producción | 1 línea con U+FFFD, confirmada en el footer publicado |
| sitemap / robots | `GET` a producción | 200, 42 URLs |

### Pendientes y decisiones que requieren validación humana
- Aprobación del dueño para pasar a Fase 1 y para el orden propuesto (adelantar el bug del SW y
  el encoding antes de las imágenes de packs).
- Decisiones 1–8 de `docs/MEJORAS.md` §6 y 9–12 nuevas (domicilio, stock real, testimonios,
  recarga del SW) en `docs/AUDIT.md` §6.

### Siguiente paso
PR con `docs/MEJORAS.md`, `docs/AUDIT.md` y las capturas. **No fusionar** hasta el OK del dueño
para la Fase 1.