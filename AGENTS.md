# NUTRIFIT — Suplementos Deportivos Premium

Tienda online chilena de suplementos deportivos y vitaminas de alta calidad. Basada en la marca real: nutrifitcl.netlify.app.

## Identidad de marca

- **Negocio**: Suplementos deportivos premium para quienes entrenan sin excusas. Santiago, Chile.
- **Voz**: cercana, motivadora y con autoridad en nutrición deportiva. Español de Chile.
- **Eslóganes**: "Nutrición • Energía • Resultados" / "Move... no, SUPLEMENTOS DEPORTIVOS • CHILE".
- **Contacto**: WhatsApp `+56 9 2388 3826` · Instagram `@nutrifitsuplementos_cl`.

## Modelo de compra (sin pasarela de pago)

- **Checkout por WhatsApp**: el cliente completa nombre, teléfono, entrega y pago; al finalizar se genera el pedido y se abre WhatsApp con el mensaje completo.
- **Entrega en Metro de Santiago**: estaciones de las líneas 1, 2, 3, 4, 4A, 5 y 6 (todas las estaciones).
- **Envío gratis** en compras sobre **$40.000 CLP**.
- **Métodos de pago**: transferencia bancaria o efectivo en el punto de entrega (contra entrega).
- **Entrega**: se coordina por WhatsApp, normalmente en 24 a 48 horas.

## Catálogo

- **Categorías**: Whey Protein · Creatina · Vitaminas · Omega 3 · Bienestar · Pre-entreno.
- **Marcas**: NutriFit · FullEnergic · Rain · FNL.
- **Objetivos**: Ganancia muscular, Rendimiento, Fuerza, Salud, Bienestar, Control de peso, Vegano.
- **Ofertas**: Flash Sale (hasta 15% OFF en Whey Protein), Combos, newsletter con 10% OFF.

## Datos clave

- **Moneda**: Peso chileno (CLP). Precios incluyen IVA.
- **Garantía**: 30 días de satisfacción en productos sin abrir, con sello intacto.
- **Confianza**: 100% productos originales, +500 pedidos entregados, valoración 4.9/5.
- **Estadísticas del sitio actual**: 3 pasos de compra (elige → completa datos → finaliza por WhatsApp).

## Stack (cuando se construya la web)

- **Next.js 15** (App Router) · **React 19** · **TypeScript** · **Tailwind CSS 3**.
- **Framer Motion** (animaciones) · **Lucide Icons**.
- **Sin backend**: datos en `localStorage`, sembrados con datos iniciales (como VELYNNA).
- **Scripts**: `npm run dev` · `npm run build` · `npm run start` · `npm run lint`.

## Convenciones

- Textos en español (Chile), moneda CLP con `formatPrice`.
- Estructura tipo VELYNNA: `src/app` (rutas), `src/components` (admin, home, layout, product, ui), `src/context`, `src/data`, `src/lib`, `src/types`.
- Panel admin protegido por contraseña; checkout por WhatsApp; entrega por metro.
- Antes de escribir código, revisar las guías de Next.js en `node_modules/next/dist/docs/` si hay dudas de la versión.
- No añadir comentarios al código salvo que se pidan.
- Las mejoras de conversión (CRO) deben basarse en esta identidad: urgencia (flash sale), prueba social (opiniones, +500 pedidos), confianza (originales, garantía 30 días) y fricción mínima (WhatsApp).
