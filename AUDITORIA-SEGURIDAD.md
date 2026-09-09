# NutriFit — Informe de Auditoría de Seguridad Web

**Fecha:** 2026-09-08
**Alcance:** Frontend (Next.js 16) + Backend (NestJS/Prisma/PostgreSQL) en Render
**Metodología:** OWASP Top 10 (2021), OWASP Testing Guide, NIST

---

## Resumen Ejecutivo

| Severidad | Cantidad | Estado |
|-----------|----------|--------|
| **Crítico** | 2 | Requiere acción inmediata |
| **Alto** | 4 | Requiere acción inmediata |
| **Medio** | 12 | Requiere acción a corto plazo |
| **Bajo** | 11 | Buenas prácticas pendientes |

**Práctica positiva:** Todas las queries Prisma usan parameterización — no hay riesgo de SQL injection.

---

## HALLAZGOS CRÍTICOS

### C1 — JWT Secret predecible
- **Archivo:** `backend/.env:2`
- **Vulnerabilidad:** `JWT_SECRET="nutrifit-super-secret-key-2026"` — string predecible y adivinable. Permite forjar tokens JWT y acceder como admin.
- **Impacto:** Compromiso total del sistema. Cualquiera puede autenticarse como admin.
- **Remediación:** `openssl rand -hex 32` → actualizar en Render dashboard. Nunca en `render.yaml`.

### C2 — Contraseñas admin/seller en código fuente
- **Archivo:** `backend/render.yaml:19-21`
- **Vulnerabilidad:** `ADMIN_PASSWORD=admin-change-me-2026` y `SELLER_PASSWORD=seller-change-me-2026` en texto plano en el repo Git.
- **Impacto:** Cualquiera con acceso al repo puede resetear contraseñas vía bootstrap.
- **Remediación:** Eliminar de `render.yaml`. Configurar solo vía dashboard de Render.

---

## HALLAZGOS ALTOS

### H1 — Credenciales de BD débiles
- **Archivo:** `backend/.env:1`
- **Vulnerabilidad:** Password `nutrifit123` es trivialmente adivinable.
- **Impacto:** Acceso directo a la base de datos PostgreSQL.
- **Remediación:** Rotar credenciales inmediatamente.

### H2 — Endpoint bootstrap sin rate limiting dedicado
- **Archivo:** `backend/src/auth/auth.controller.ts:85-89`
- **Vulnerabilidad:** `POST /api/auth/bootstrap` permite reset de contraseña con solo `bootstrapKey`. Con la contraseña débil de `render.yaml`, cualquier usuario puede resetear cualquier cuenta.
- **Impacto:** Takeover de cuentas admin.
- **Remediación:** Rate limiting dedicado + eliminar password débil por defecto.

### H3 — readJsonBody bypass de validación
- **Archivo:** `backend/src/common/decorators/raw-body.decorator.ts:18-54`
- **Vulnerabilidad:** El body se parsea manualmente, bypassing el `ValidationPipe` de NestJS. Los DTOs declarados nunca se validan.
- **Impacto:** Inputs maliciosos pueden llegar sin validación.
- **Remediación:** Aplicar `class-validator` explícitamente sobre el body parseado.

### H4 — IDOR en pedidos públicos
- **Archivo:** `backend/src/orders/orders.controller.ts:57-62`
- **Vulnerabilidad:** `POST /api/orders/public` acepta `customerId` arbitrario del body. Cualquiera puede crear pedidos bajo identidad de otro usuario.
- **Impacto:** Manipulación de pedidos y datos de clientes.
- **Remediación:** Validar que `customerId` coincida con la identidad del llamador o usar solo lookup por teléfono.

---

## HALLAZGOS MEDIOS

| # | Archivo | Vulnerabilidad | Remediación |
|---|---------|---------------|-------------|
| M1 | `backend/src/auth/auth.controller.ts:26-61` | Rate limiting in-memory — se reinicia en restarts de Render | Mover a Redis o DB |
| M2 | `backend/src/auth/auth.controller.ts:26-28` | Sin lockout permanente — 5 intentos/10min infinitamente | Lockout progresivo o CAPTCHA |
| M3 | `backend/src/auth/jwt.strategy.ts` | JWT 7 días sin refresh token ni revocación | Implementar refresh token rotation |
| M4 | `backend/src/app.module.ts:46` | JwtAuthGuard no es global — puede olvidarse en rutas nuevas | Registrar como guard global |
| M5 | `backend/src/main.ts:43-51` | CORS deshabilitado cuando `CORS_ORIGINS` está vacío | Configurar orígenes explícitos |
| M6 | `backend/Dockerfile:16` | `--accept-data-loss` puede borrar columnas en producción | Usar `prisma migrate deploy` |
| M7 | `backend/src/main.ts:57-66` | Swagger expuesto si `NODE_ENV` no está en producción | Verificar `NODE_ENV=production` en Render |
| M8 | `backend/src/reviews/reviews.controller.ts:16-21` | Reviews sin autenticación — XSS almacenado posible | Sanitizar inputs de reviews |
| M9 | `backend/src/orders/orders.service.ts:496` | `Math.random()` para código de entrega — no criptográficamente seguro | Usar `crypto.randomInt()` |
| M10 | `backend/src/google/google-auth.controller.ts:24-36` | OAuth callback sin validación de `state` CSRF | Generar y validar state |
| M11 | `next.config.mjs:44` | `script-src 'unsafe-inline'` en CSP | Usar nonce-based CSP |
| M12 | `backend/prisma/schema.prisma:46-69` | PII (RUT, nombre, dirección) en texto plano | Cifrar campos sensibles en reposo |

---

## HALLAZGOS BAJOS

| # | Archivo | Vulnerabilidad | Remediación |
|---|---------|---------------|-------------|
| B1 | N/A | Sin `robots.txt` — admin/POS indexables | Agregar `robots.txt` |
| B2 | `backend/src/auth/auth.service.ts:43-45` | Comparación de bootstrap key sin timing-safe | Usar `crypto.timingSafeEqual()` |
| B3 | `backend/src/common/filters/all-exceptions.filter.ts:37-45` | `path` en respuestas de error puede filtrar estructura | Ocultar en producción |
| B4 | `backend/src/common/decorators/raw-body.decorator.ts:42-44` | JSON malformado retorna `{}` silenciosamente | Lanzar BadRequestException |
| B5 | `backend/src/common/decorators/raw-body.decorator.ts:53` | Timeout retorna `{}` sin error | Retornar error |
| B6 | `backend/src/orders/orders.service.ts:662-671` | Audit log sin IP address | Capturar IP |
| B7 | `backend/src/customers/customers.service.ts:38` | Teléfono sin validación de formato | Validar dígitos |
| B8 | `backend/src/main.ts:42` | `trust proxy` puede ser inexacto en Render | Verificar configuración |
| B9 | `next.config.mjs:34-47` | CSP sin `report-uri` | Agregar reporting |
| B10 | `backend/src/auth/auth.service.ts:22-26` | JWT sin `iss`/`aud` claims | Agregar claims |
| B11 | `backend/src/google/google-calendar.service.ts:47-53` | Tokens OAuth en memoria — se pierden en restart | Persistir en DB |

---

## PRÁCTICAS POSITIVAS IDENTIFICADAS

| # | Práctica | Detalle |
|---|----------|---------|
| 1 | **SQL injection protegido** | Todas las queries Prisma usan parameterización |
| 2 | **Stack traces no expuestos** | El error filter oculta detalles internos del cliente |
| 3 | **.env en .gitignore** | Los archivos de entorno no se commitean al repo |
| 4 | **Bcrypt para contraseñas** | `bcrypt.hash()` con salt rounds 12 |
| 5 | **Rate limiting global** | ThrottlerModule configurado (30 req/min) |
| 6 | **HTTPS forzado** | Next.js redirige HTTP a HTTPS |
| 7 | **Headers de seguridad** | CSP, X-Frame-Options, HSTS configurados en next.config |

---

## PLAN DE REMEDIACIÓN PRIORIZADO

### Inmediato (hoy)
1. [ ] Rotar `JWT_SECRET` → `openssl rand -hex 32`
2. [ ] Rotar credenciales PostgreSQL
3. [ ] Eliminar contraseñas de `render.yaml` → configurar en Render dashboard
4. [ ] Verificar `NODE_ENV=production` en Render

### Corto plazo (esta semana)
5. [ ] Agregar CORS explícito con orígenes permitidos
6. [ ] Fix `readJsonBody` → lanzar error en JSON malformado
7. [ ] Registrar JwtAuthGuard como global
8. [ ] Sanitizar inputs de reviews (strip HTML)
9. [ ] Agregar `robots.txt` conDisallow admin/pos/api

### Medio plazo (este mes)
10. [ ] Implementar refresh token rotation
11. [ ] Mover rate limiting a Redis
12. [ ] Cambiar `db push` → `prisma migrate deploy` en Dockerfile
13. [ ] Validar state en Google OAuth callback
14. [ ] Usar `crypto.randomInt()` para códigos de entrega
15. [ ] Cifrar RUT y datos sensibles en reposo

---

*Auditoría realizada por opencode — Metodología OWASP Top 10 (2021)*
