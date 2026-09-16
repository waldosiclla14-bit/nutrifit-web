<!-- BEGIN:nextjs-agent-rules -->
# AGENTS.md — NutriFit Chile

Siempre lee la documentacion de Next.js bundled en `node_modules/next/dist/docs/` antes de escribir codigo.
<!-- END:nextjs-agent-rules -->

# NutriFit Chile — Contexto del Proyecto

Suplementos deportivos vendidos via Metro de Santiago. Tienda publica + admin panel + POS.

## Stack

| Capa | Tecnologia | Version |
|------|-----------|---------|
| Frontend | Next.js (App Router) | 16.3 |
| React | React | 19 |
| Backend | NestJS + Prisma | — |
| DB | PostgreSQL (Neon) | — |
| Deploy FE | Vercel (`nutrifit-web-nu.vercel.app`) | — |
| Deploy BE | Render (`nutrifit-api-635n.onrender.com`) | — |
| Repo | `waldosiclla14-bit/nutrifit-web` rama `main` | — |

## Arquitectura

```
nutrifit-web/
├── src/                    # Frontend Next.js
│   ├── app/                # App Router pages
│   ├── components/admin/   # Admin + POS components
│   ├── lib/                # Utilities, API client, helpers
│   └── types/              # TypeScript types
├── backend/                # NestJS API
│   ├── src/
│   │   ├── products/       # CRUD productos
│   │   ├── orders/         # Ordenes + stock
│   │   ├── purchases/      # Modulo compras OCR
│   │   ├── delivery/       # Entregas Metro
│   │   ├── ocr/            # Gemini OCR provider
│   │   └── auth/           # JWT auth
│   └── prisma/schema.prisma
└── public/                 # Static assets
```

## Convenciones

- `apiFetch()` en frontend agrega `/api` automaticamente
- Backend usa global prefix `api` — todas las rutas son `/api/...`
- Auth: JWT con roles `ADMIN`, `SELLER`, `DELIVERY`
- Stock: `physicalStock` (Prisma) = `stock` (DB column via `@map`)
- Precios en CLP (enteros), IVA 19%
- Brand accent: `#5DD62C` (verde lima)

## Bugs Conocidos (ver ANTIGRAVITY-BUGS-IMPROVEMENTS.md)

### Criticos
- `Math.random()` en delivery codes (usar `crypto.randomInt`)
- Race condition en purchase/receipt numbers
- Doble descuento de stock en delivery
- Transacciones no atomicas en pgbouncer

### Altos
- POS: `insufficientStock()` nunca se ejecuta
- Purchases: sin `@Roles` guard
- Documentos base64 en DB (migrar a S3/R2)
- Compras: `JSON.stringify` doble en body

### Medios
- Brand search muestra `[object Object]`
- CostHistory ignora parametro `:id`
- Compras: `parseInt` pierde precision en costos
- WhatsApp phone duplica codigo pais

## Comandos

```bash
# Frontend
npm run dev          # Dev server
npm run build        # Build produccion
npm run lint         # ESLint

# Backend
cd backend
npx prisma migrate deploy  # Migraciones (Render)
npx tsc --noEmit           # Type check
```

## Credenciales

- Admin: `admin@nutrifit.cl` / `Lacaletagrone14`
- Health: `GET /api/health`

## Importante

- NO usar `curl` en PowerShell (usar `Invoke-WebRequest`)
- NO usar `&&` en PowerShell (usar `;`)
- NO usar `head` (usar `Select-Object -First N`)
- Local DB no esta corriendo — migraciones en Render
- iOS BarcodeDetector NO existe — usar html5-qrcode con ZXing fallback
- Todos los productos tienen barcode vacio — escaneo no funciona hasta asignar barcodes
