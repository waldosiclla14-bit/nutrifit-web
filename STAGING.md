# STAGING — Entorno de pruebas de NutriFit

**Regla de oro: nada llega a `main` (producción) sin pasar por `staging`.**

```text
feature/*  →  staging  →  (verificado)  →  main (prod)
```

## Arquitectura

| | Producción | Staging |
|---|---|---|
| Frontend | `nutrifit-web-nu.vercel.app` (rama `main`) | Preview URL de Vercel (rama `staging`) |
| Backend | `nutrifit-api` (rama `main`) | `nutrifit-api-staging` (rama `staging`) |
| BD | PostgreSQL prod | PostgreSQL staging (¡separada!) |
| Google Calendar | Cuenta servicio prod | Desconectado (no compartirle calendarios reales) |

## Configuración (una sola vez)

### 1. Base de datos staging
Crea una BD PostgreSQL separada (mismo proveedor que prod u otra instancia).
Guarda su connection string como `DATABASE_URL_STAGING`.

### 2. Backend en Render
1. Render → **New +** → **Blueprint** → selecciona el repo `nutrifit-web`
2. Aparecerán `nutrifit-api` (existe → skip) y **`nutrifit-api-staging`** (nuevo → crear)
3. En `nutrifit-api-staging` → Environment, configura:
   - `DATABASE_URL` = tu BD staging (obligatorio: ¡nunca la de prod!)
   - `CORS_ORIGINS` = la Preview URL de Vercel de la rama staging
   - `FRONTEND_URL` = misma Preview URL
   - `ADMIN_PASSWORD` / `SELLER_PASSWORD` = claves de prueba (distintas a prod)
   - `JWT_SECRET` = se autogenera (`generateValue: true`)
   - `NODE_ENV` = `development` (ya viene en el yaml)
4. Primer deploy: el Dockerfile ejecuta `prisma db push` (crea el schema solo)
5. Sembrar datos base: conecta una terminal local con `DATABASE_URL` de staging y corre:
   ```bash
   cd backend
   $env:DATABASE_URL="<staging-url>"
   npx prisma db push
   npm run db:seed
   ```
   Esto carga estaciones de Metro y catálogos base. No copia ventas/clientes reales.

### 3. Frontend en Vercel
1. Vercel → proyecto → Settings → Git → confirma que **Preview Deployments** están activos para todas las ramas
2. Haz push de la rama `staging` → Vercel genera una Preview URL (ej: `nutrifit-web-git-staging-*.vercel.app`)
3. Esa URL va en `CORS_ORIGINS` y `FRONTEND_URL` del backend staging (paso 2.3)
4. Opcional: en Vercel → Environment Variables → Preview → `NEXT_PUBLIC_API_URL` = URL del backend staging, para que los previews apunten a staging y nunca a prod

## Flujo de trabajo

```bash
# 1. Nueva funcionalidad
git checkout staging
git checkout -b feature/mi-cambio
# ... codear, build local, tests ...
git push -u origin feature/mi-cambio

# 2. Probar en staging (merge a staging, NUNCA directo a main)
git checkout staging
git merge feature/mi-cambio
git push origin staging
# → Render despliega backend staging + Vercel genera preview
# → Probar: tienda, admin, POS, stock con datos de prueba

# 3. Solo si staging OK → producción
git checkout main
git merge staging
git push origin main
```

## Rollback

- **Frontend**: Vercel → Deployments → deploy anterior → Promote to Production (1 clic)
- **Backend**: Render → servicio → Events → deploy anterior → Redeploy
- **BD**: la Dockerfile usa `db push` sin `--accept-data-loss`, pero ante pérdida: restaurar desde el backup del proveedor antes de seguir operando

## Prohibido en staging

- Apuntar `DATABASE_URL` a producción
- Usar claves reales de admin/vendedor
- Conectar Google Calendar real (service account de prod)
- Enviar WhatsApp reales a clientes (usar números de prueba)
