# Despliegue en producción — NutriFit ERP

Arquitectura:

```
Tienda + Admin + POS (Next.js)  →  API (NestJS)  →  Postgres
        Vercel                        Render          Neon
```

- **Frontend** (tienda `/`, panel `/admin`, POS `/pos`): Vercel (ya conectado, deploy automático al hacer push).
- **API / ERP** (`backend/`): Render (Web Service con el `Dockerfile` incluido).
- **Base de datos** (Postgres): Neon (capa gratuita, sin servidor).

---

## 1. Base de datos en Neon

1. Crea una cuenta en <https://neon.tech> → **Create a project** (región cercana, p. ej. `us-east`).
2. Copia la **connection string** con `psql`:

   ```
   postgresql://USER:PASSWORD@EP.neon.tech/nutrifit?sslmode=require
   ```

   Guárdala: será la `DATABASE_URL` de la API. (En Neon, la URL recomendada para Prisma es la de `prisma`/pooled: `postgresql://USER:PASSWORD@EP-POOLER.neon.tech/nutrifit?sslmode=require`.)

## 2. API en Render

1. Repositorio en GitHub (o conecta esta carpeta `backend/` como **Blueprint**).
2. **New → Web Service**, elige el repo y la carpeta raíz `backend`.
3. Configura:
   - **Runtime**: Docker (usa el `Dockerfile` incluido).
   - **Health Check Path**: `/api/docs` (o `/api/products`).
4. **Environment variables**:

   | Variable            | Valor                                        |
   | ------------------- | -------------------------------------------- |
   | `DATABASE_URL`      | La connection string de Neon (arriba)        |
   | `JWT_SECRET`        | Clave larga y aleatoria (p. ej. `openssl rand -hex 32`) |
   | `JWT_EXPIRES_IN`    | `7d`                                         |
   | `PORT`              | `3001` (Render la asigna igual, se deja igual) |
   | `CORS_ORIGIN`       | `https://tu-dominio.vercel.app` (opcional)   |

5. Al arrancar, el contenedor ejecuta `npx prisma db push` + seed automáticamente (crea tablas y usuarios iniciales). La primera vez se crean:
   - `admin@nutrifit.cl` / `admin123`
   - `vendedor@nutrifit.cl` / `vendedor123`
6. Anota la URL del servicio, p. ej. `https://nutrifit-api.onrender.com`.

> ⚠️ Cambia las contraseñas por defecto tras el primer deploy y guarda un `JWT_SECRET` fuerte.

## 3. Frontend en Vercel

1. En el proyecto Vercel de la tienda → **Settings → Environment Variables** → añade:

   | Variable               | Valor                                |
   | ---------------------- | ------------------------------------ |
   | `NEXT_PUBLIC_API_URL`  | `https://nutrifit-api.onrender.com`  |

2. **Redeploy** (o un push). El valor se inyecta en build para:
   - El cliente API (`src/lib/api.ts`).
   - La política de seguridad CSP (`connect-src`) en `next.config.mjs`, que permite llamadas a esa API.

3. Verifica:
   - Tienda: `/` (checkout ahora registra la orden en el ERP).
   - Admin: `/admin` (login `admin@nutrifit.cl`).
   - POS: `/pos` (login `vendedor@nutrifit.cl`).

## 4. Local (opcional, sin Docker)

Para desarrollo local solo necesitas Node 20+ y Postgres:

```bash
cd backend
npm install
cp .env.example .env        # ajusta DATABASE_URL a tu Postgres local
npx prisma db push
npx prisma db seed
npm run start:dev           # API en http://localhost:3001
```

Y en la raíz:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001 npm run dev   # tienda en :3000
```

## Notas

- Las órdenes de la tienda llegan al ERP vía `POST /api/orders` (se crea el cliente por teléfono si no existe). Si la API no está disponible, el checkout **no se rompe**: sigue abriendo WhatsApp y guarda el pedido en `localStorage` (los pedidos sincronizados se marcan en la pantalla de confirmación).
- El panel admin confirma pedidos, marca pagos, actualiza stock, gestiona clientes y abre/cierra caja con arqueo. El POS cobra en local (requiere caja abierta).
- Documentación de la API: `<API_URL>/api/docs` (Swagger).
