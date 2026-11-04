# Despliegue en producción — NutriFit ERP

Arquitectura:

```
Tienda + Admin + POS (Next.js)  →  API (NestJS)  →  Postgres
        Vercel                        Render          Neon
```

- **Frontend** (tienda `/`, panel `/admin`, POS `/pos`): Vercel (ya conectado, deploy automático al hacer push). Dominio canónico: `https://nutrifitsuplementos.cl` (`src/lib/site.ts`); `nutrifit-web-nu.vercel.app` es un host legado que redirige 301.
- **API / ERP** (`backend/`): Render, Web Service con el `Dockerfile` incluido. Deploy **automático por el propio Render** (`autoDeploy` del servicio): al llegar un push a `main` que toque `backend/`, Render construye y despliega sin intervención de GitHub Actions.
- **Base de datos** (Postgres): Neon (capa gratuita, sin servidor).

---

## 0. Auto-deploy del backend (Render)

Render está conectado al repositorio y despliega por su cuenta. **No hace falta un workflow.**

| Mecanismo | Estado |
|---|---|
| `autoDeploy` del servicio en Render | **Activo.** Es el único mecanismo de despliegue |
| `.github/workflows/deploy-render.yml` | **Solo manual** (`workflow_dispatch`). Sirve para crear o monitorear un deploy puntual, no para el día a día |

> **Historia, para que nadie lo revierta sin querer:** hasta el 03-11-2026 este workflow tenía además un disparador `push` a `main` con `paths: backend/**`, que hacía `POST /v1/services/{id}/deploys`. Eso **duplicaba** cada despliegue: en el último push al backend el workflow corrió a las `02:37:25Z` y Render creó su propio deploy a las `02:37:30Z`, del mismo commit. Se quitó el `push` en el PR #15. `autoDeploy` se verificó por API como `"yes"`.

Para lanzar un deploy a mano: **Actions → Deploy API a Render → Run workflow**. El input `deploy_id` es opcional: vacío crea un deploy nuevo; con `dep-xxxx` solo lo monitorea.

Secretos que usa ese workflow manual (GitHub → Settings → Secrets):

| Secret              | Valor                                      |
| ------------------- | ------------------------------------------ |
| `RENDER_API_KEY`    | Tu API key de Render (empieza con `rnd_`) |
| `RENDER_SERVICE_ID` | ID del servicio (p. ej. `srv-...`)         |

Para regenerar el API key si se pierde: render.com → Settings → API Keys → Create API Key.


---

## 1. Base de datos en Neon

1. Crea una cuenta en <https://neon.tech> → **Create a project** (región cercana, p. ej. `us-east`).
2. Copia la **connection string** con `psql`:

   ```
   postgresql://USER:PASSWORD@EP.neon.tech/nutrifit?sslmode=require
   ```

   Guárdala: será la `DATABASE_URL` de la API. (En Neon, la URL recomendada para Prisma es la de `prisma`/pooled: `postgresql://USER:PASSWORD@EP-POOLER.neon.tech/nutrifit?sslmode=require`.)

## 2. API en Render

1. Repositorio en GitHub conectado a Render.
2. **New → Web Service**, elige el repo y la carpeta raíz `backend`.
3. Configura:
   - **Runtime**: Docker (usa el `Dockerfile` incluido).
   - **Health Check Path**: **déjalo vacío**. Ver la advertencia de abajo.
4. **Environment variables**:

   | Variable            | Valor                                        |
   | ------------------- | -------------------------------------------- |
   | `DATABASE_URL`      | La connection string de Neon (arriba)        |
   | `DIRECT_URL`        | La conexión directa de Neon (para migraciones) |
   | `JWT_SECRET`        | Clave larga y aleatoria (p. ej. `openssl rand -hex 32`) |
   | `JWT_EXPIRES_IN`    | `7d`                                         |
   | `CORS_ORIGINS`      | Dominio de producción: `https://nutrifitsuplementos.cl` |
   | `ADMIN_PASSWORD`    | Contraseña inicial segura, mínimo 12 caracteres |
   | `SELLER_PASSWORD`   | Contraseña inicial segura, mínimo 12 caracteres |

   **No definas `PORT`.** Render inyecta la suya (en producción es `10000`) y `backend/src/main.ts` hace `process.env.PORT || 3001`. Si fijas `3001` a mano, chocas con el puerto que Render espera y el servicio no responde. El `EXPOSE 3001` del `Dockerfile` es solo documental y no manda.

5. Al arrancar, el contenedor ejecuta `prisma/baseline.js` → `prisma/ensure-enum.js` → `npx prisma migrate deploy`, con hasta 5 reintentos. **No usa `db push` ni seed**: los datos no se pisan en cada arranque. Ese pre-arranque es lo que hace que un arranque en frío tarde decenas de segundos (medido: **44 s** el 02-11-2026).
6. Anota la URL del servicio. Hay dos nombres para la misma instancia:

   | Nombre | Valor | Quién lo usa |
   |---|---|---|
   | Host interno de Render | `https://nutrifit-api-635n.onrender.com` | el workflow de diagnóstico y las pruebas directas |
   | Dominio público de la API | `https://api.nutrifitsuplementos.cl` | **el frontend en producción** (CNAME al host de arriba, verificado por DNS) |

> ⚠️ **Health check: vacío, no `/api/health`.** Mientras exista un health check **HTTP**, Render sondea la instancia cada pocos segundos y la instancia **nunca duerme**. Sin health check, Render usa una sonda TCP. Y con `healthCheckPath` configurado, un deploy que tarde más de 15 min puede quedarse en `update_failed` esperando que la sonda pase.
>
> **Pero vaciarlo no basta.** Cualquier tráfico entrante con menos de 15 min de separación mantiene la instancia despierta: un cron externo, un monitor de disponibilidad o un latido del frontend hacen lo mismo. Un cron cada 15 min es tan efectivo como el health check. Si el consumo sigue alto con el health check vacío, **el sospechoso es quien llama a la API**, no Render. Contexto: `docs/estado.md` (sección «el health check no era la causa»).

> ⚠️ Usa secretos únicos en Render y no los guardes en GitHub.

> ⚠️ **No apliques `backend/render.yaml` como Blueprint.** Nunca se aplicó y no refleja el servicio real: declara `healthCheckPath: /api/products`, `PORT: 3001` y un servicio `nutrifit-api-staging` que no existe en el workspace. Aplicarlo revertiría el health check a uno pesado y volvería a impedir el reposo.

## 3. Frontend en Vercel

1. En el proyecto Vercel de la tienda → **Settings → Environment Variables** → añade:

   | Variable               | Valor                                |
   | ---------------------- | ------------------------------------ |
   | `NEXT_PUBLIC_API_URL`  | `https://api.nutrifitsuplementos.cl` |

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
