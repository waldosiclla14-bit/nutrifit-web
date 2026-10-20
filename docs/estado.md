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
