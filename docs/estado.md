# Estado del proyecto NutriFit

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
- **Tallas sin peso real por producto**: el cliente elige la talla (S hasta 3 kg, M hasta
  6 kg) porque el catálogo no tiene pesos. Queda pendiente medir cada producto.
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

### Siguiente paso
Push a producción de los commits de esta sesión y verificación en vivo.
