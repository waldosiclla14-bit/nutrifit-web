# NUTRIFIT — Suplementos Deportivos Premium

Tienda online de suplementos deportivos y bienestar en Chile. **Nutrición • Energía • Resultados.**

**En vivo:** https://nutrifit-web-nu.vercel.app

Venta directa por WhatsApp con entrega coordinada en estaciones de Metro de Santiago (líneas 1, 2, 3, 4, 4A, 5 y 6). Envío gratis sobre $40.000.

## Stack

- **Next.js 15** (App Router, Server Components + SSG)
- **React 19** + TypeScript
- **Tailwind CSS 3** (tema oscuro + acento lima)
- **lucide-react** (iconos)
- **localStorage** (carrito, favoritos, pedidos y newsletter — sin backend)
- Checkout y pedidos vía **WhatsApp**

## Requisitos

- Node.js 18.18 o superior

## Instalación y uso

```bash
npm install       # instalar dependencias
npm run dev       # modo desarrollo → http://localhost:3000
npm run build     # build de producción (páginas estáticas SSG)
npm run start     # servir el build → http://localhost:3000
npm run lint      # revisar código (ESLint)
```

## Funcionalidades

- Landing con hero, categorías, más vendidos, combos, beneficios, cómo comprar, FAQ y opiniones.
- Catálogo `/productos` con filtros por categoría, marca, objetivo y precio, más búsqueda y orden.
- Detalle de producto `/productos/[slug]` (19 páginas SSG) con modo de uso, ingredientes, nutrientes y reseñas.
- Carrito lateral con barra de progreso de envío gratis y checkout que arma el mensaje y abre WhatsApp con el pedido completo.
- Favoritos persistidos en el navegador.
- Páginas: `/favoritos`, `/legal` (envío, términos y privacidad), `sitemap.xml`, `robots.txt`, 404.

## Estructura

```
src/
  app/                  # rutas y layout (metadata, fuentes, providers)
  components/
    layout/             # Header, Footer, CartDrawer, WhatsAppFloat
    home/               # secciones de la landing
    product/            # ProductCard, ProductDetail, Catalog
    ui/                 # Reveal, Stars
  context/              # CartContext, FavoritesContext (localStorage)
  data/
    seed.ts             # catálogo real: productos, categorías, combos, reseñas, marca
    metro.ts            # estaciones de Metro por línea
  lib/                  # utils, store (pedidos/settings), whatsapp
  types/                # tipos de dominio
public/
  img/                  # imágenes de productos y logo
```

## Personalización

| Qué | Dónde |
| --- | --- |
| Productos, precios, combos, reseñas, marca | `src/data/seed.ts` |
| Estaciones y colores de Metro | `src/data/metro.ts` |
| WhatsApp, envío gratis, costo de envío | `DEFAULT_SETTINGS` en `src/lib/store.ts` |
| Colores, fuentes, animaciones | `tailwind.config.ts` + `src/app/globals.css` |
| WhatsApp, envío gratis, costo de envío | `DEFAULT_SETTINGS` en `src/lib/store.ts` |

## Deploy

Proyecto 100% estático listo para **Vercel** (o cualquier host de Node). Los datos viven en `seed.ts`, no requiere base de datos ni panel admin.
