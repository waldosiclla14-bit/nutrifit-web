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
4. **Environment variables** (las que lee el código):

   | Variable | ¿Obligatoria? | Valor y para qué |
   | --- | --- | --- |
   | `DATABASE_URL` | sí | Connection string de Neon (pooled) |
   | `DIRECT_URL` | sí | Conexión directa de Neon; la usan `prisma migrate deploy` y `baseline.js` al arrancar |
   | `JWT_SECRET` | sí | `openssl rand -hex 32`. Firma los tokens de sesión |
   | `CORS_ORIGINS` | sí | Orígenes permitidos, separados por coma; debe incluir `https://nutrifitsuplementos.cl`. Los previews `*.vercel.app` se aceptan solos (`main.ts:51`) |
   | `NODE_ENV` | sí | `production`. Sin esto la cookie de sesión sale `SameSite=Lax` y el login cross-site (Vercel → Render) falla en silencio (`auth.service.ts:31-37`) |
   | `SEED_ADMIN_PASSWORD` | solo seed | Contraseña inicial del admin para `prisma db seed` (también acepta `ADMIN_PASSWORD`, `seed.ts:7`). **El arranque no ejecuta el seed** |
   | `SEED_SELLER_PASSWORD` | solo seed | Igual, para el vendedor |
   | `CRON_SECRET` | si usas el cron | Secreto de `POST /api/deliveries/reminders/dispatch` (header `x-cron-secret`). Sin él responde 401 |
   | `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | si usas push | Web Push. Sin ellas los endpoints de push responden 400 «Push no configurado» |
   | `WEBHOOK_SECRET` | si usas notificaciones de pedido | Secreto de `POST /api/push/evento` (header `x-webhook-secret`). **Hoy no está definida en Render**: ese webhook responde 400 |
   | `GEMINI_API_KEY` | si usas el asistente | Sin ella la IA responde 503 |
   | `TODOIST_API_TOKEN` | opcional | Sincronización con Todoist; sin ella queda deshabilitada y avisa en el log |
   | `JWT_EXPIRES_IN` | opcional | Si falta, el código usa `7d` (`auth.module.ts:22`) |

   **No definas `PORT`.** Render inyecta la suya (en producción es `10000`) y `backend/src/main.ts` hace `process.env.PORT || 3001`. Si fijas `3001` a mano, chocas con el puerto que Render espera y el servicio no responde. El `EXPOSE 3001` del `Dockerfile` es solo documental y no manda.

   **Contraseñas de bootstrap.** `POST /api/auth/bootstrap` compara la clave contra `ADMIN_PASSWORD` (`auth.service.ts:92-95`), que **no está definida** en el servicio real. Por eso hoy responde «Bootstrap no configurado»: la recuperación de contraseña por esa vía está caída. `SEED_ADMIN_PASSWORD` no sirve para esto; es solo del seed.

   **Variables presentes en Render que este repo no lee:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` y `GOOGLE_SERVICE_ACCOUNT_EMAIL` (0 referencias en el código). No hacen falta para desplegar y no se borraron; comprueba antes si las usa otro sistema.

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

> ⚠️ **`backend/render.yaml` se retiró el 04-11-2026.** Nunca se aplicó y no reflejaba el servicio real: declaraba `healthCheckPath: /api/products`, `PORT: 3001` y un servicio `nutrifit-api-staging` que no existe en el workspace. La configuración real vive en el panel de Render. **No lo reintroduzcas como Blueprint**: crearía servicios contra la misma cuota de 750 h/mes.

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
