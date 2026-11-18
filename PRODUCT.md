# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dos públicos, sin prioridad declarada entre ellos:

- **Comprador que ya entrena** (aprox. 20-35, Santiago): busca suplemento específico, compara marca y precio por gramo, y espera recompra rápida.
- **Comprador que necesita orientación**: no domina la categoría, llega por Instagram o búsqueda, y decide cuando entiende qué le sirve.

Ambos compran desde el celular, en horario laboral o de traslado, y valoran recibir el pedido en su trayecto. Además existen dos audiencias internas con permisos distintos: vendedor (POS y pedidos) y repartidor (entregas con código).

## Product Purpose

Vender suplementos deportivos originales en Chile y entregarlos en estaciones del Metro de Santiago o a domicilio, coordinando el pedido por WhatsApp. El éxito es un pedido confirmado con retiro/entrega sin fricción y un cliente que vuelve por su próximo pote.

## Positioning

La red de entrega en el Metro de Santiago es el mecanismo que un competidor chileno no puede copiar sin construir la misma operación: el pedido se coordina por WhatsApp y se entrega en la estación que el cliente elige, dentro de la red de líneas y estaciones cubiertas (`src/data/metro.ts`). La logística es el diferenciador, no el catálogo.

## Operating Context

- Pedido sin pasarela de tarjeta: el cierre es una conversación de WhatsApp con confirmación de stock y punto de entrega.
- Entrega en estación (con código) o a domicilio dentro de Santiago; el repartidor opera desde el panel admin.
- Catálogo multi-marca (FNL, Full Energic, Eco Naturales, Ostrovit, Rain, etc.) con variantes por sabor y stock por variante.
- Backoffice propio: productos, pedidos, compras a proveedor con OCR de facturas, proveedores, marketing/cupones, reportes y POS presencial.
- Español de Chile, precios en CLP (enteros), IVA 19%.

## Capabilities and Constraints

- Tienda pública (catálogo, ficha de producto, favoritos, blog, marcas, legal, sobre nosotros) + panel admin + POS.
- Next.js App Router, React 19, Tailwind 3, Framer Motion, backend NestJS + Prisma/PostgreSQL.
- El stock real es `physicalStock`; los precios se muestran en CLP.
- El escaneo de código de barras existe pero los productos no tienen barcode asignado todavía.
- Los conteos de reseñas por producto vienen de datos seed, no de un historial verificado de compras.

## Brand Commitments

- Nombre **NutriFit** (wordmark "Nutri**Fit**"), Chile.
- Verde de marca `#72BF44` y acento naranja `#F97316` como identidad comprometida: se puede corregir su uso y contraste, no reemplazar la paleta.
- Bebas Neue como tipografía display; Inter como texto.
- Tono directo, deportivo, chileno; nada de promesas médicas ni resultados garantizados.

## Evidence on Hand

- Catálogo real con imágenes de producto en `public/img/` y datos en `src/data/seed.ts`.
- Red de Metro en `src/data/metro.ts`; blog con artículos propios en `src/data/blog.ts`.
- Reseñas enviadas por usuarios en la ficha de producto (persistidas), separadas del contador seed.
- **Ausencia deliberada**: no hay testimonios verificados, casos de estudio, prensa ni cifras auditadas de ventas. El trabajo futuro no debe fabricarlos.

## Product Principles

1. **La entrega es la promesa.** Toda superficie debe dejar claro dónde y cómo recibe el pedido antes que cualquier argumento de marca.
2. **Originalidad verificable, no adjetivos.** Mostrar marca, contenido y procedencia; no afirmar resultados.
3. **Decidir en el celular, en menos de un minuto.** Ficha y carrito deben resolver dudas de sabor, stock y entrega sin scroll infinito.
4. **El WhatsApp es el checkout.** El paso a la conversación es el objetivo de conversión, no un fallback.
5. **Un catálogo grande no justifica un catálogo ruidoso.** Filtros y categorías ordenan; el color de marca no compite con el producto.

## Accessibility & Inclusion

- Español de Chile como único idioma de la tienda; no hay requisito de multi-idioma.
- No se ha establecido un estándar formal; el trabajo nuevo debe cumplir WCAG 2.1 AA como mínimo (el audit del 2026-11-15 encontró contraste insuficiente en los colores de marca).
