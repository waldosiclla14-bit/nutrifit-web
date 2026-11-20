# Asistente de Ficha de Producto — Fase 0 (auditoría) y plan

Fecha: 2026-11-18
Alcance: formulario "Productos" del admin + modelo de datos + endpoints de productos/IA.
Regla de esta fase: **no se modifica código de ventas ni de stock**. Este documento es solo auditoría y plan.

---

## 0. Resumen ejecutivo

El objetivo (foto → borrador en <20 s, ideal <10 s) es viable con la arquitectura actual, pero hay **3 bloqueantes reales** que hoy impiden cumplirlo:

1. **El frontend exige SKU** aunque el placeholder diga "opcional" y el backend ya lo autogenere (`src/components/admin/Productos.tsx:182` y `:289` vs `place:658`; `products.service.ts:438`). Sin corregir esto, el flujo "IA + guardar en 20 s" se corta en la validación.
2. **No existe endpoint de categorías/marcas**. El formulario usa texto libre y las categorías se derivan de los productos ya cargados (`Productos.tsx:81-85`). La regla "categoría y marca desde listas existentes" no se puede cumplir sin exponer esas listas.
3. **No hay infraestructura de IA para fichas**: existe chat (`ai.service.ts`) y OCR de documentos (`ocr/gemini-ocr.provider.ts`), pero no visión estructurada con zod, ni control de cuota diaria, ni búsqueda web, ni persistencia de fuentes. Además el backend **no tiene zod instalado** (`backend/package.json`).

Riesgo adicional de aceptación: el backend vive en Render free con cold start medido de ~44 s (`src/lib/api.ts:93-106`). El criterio "<10 s" solo es medible con instancia caliente. Hay que precalentar y medirlo explícitamente.

El formulario actual tampoco es mobile-first: es un bloque inline dentro de una lista larga, con Guardar/Cancelar al final, y la barra fija "Vender" (`BottomNav.tsx:80-100`) puede taparlos. No hay duplicar, ni lote, ni confianza por campo, ni herencia de precio/costo a variantes.

Nada de lo propuesto requiere tocar `orders`, `reservations` ni `confirmStock`; la creación seguirá pasando por `POST /products` existente.

---

## 1. Auditoría

### 1.1 Flujo actual de creación

```
Productos.tsx (estado local form + formVariants)
  └─ create()  ── POST /erp/products (JSON)
        └─ apiFetch (90 s timeout POST, cookie HttpOnly)
              └─ ProductsController.create  [ADMIN]
                    └─ ProductsService.create
                          ├─ uniqueSlug / uniqueSku
                          ├─ resolveCategory (crea si no existe)
                          ├─ resolveBrand (crea si no existe)
                          └─ prisma.product.create({ variants: { create } })
```

- Formulario: `src/components/admin/Productos.tsx:653-712`.
- Payload: `Productos.tsx:204-232`. Stock inicial va como `stock` por variante (`:228`).
- Backend: `backend/src/products/products.controller.ts:111-118`; lógica `products.service.ts:431-515`.
- El stock inicial se escribe directo en `physicalStock` (`products.service.ts:483`), **sin** `InventoryMovement` ni `AuditLog`. Es comportamiento existente; no se debe cambiar en este proyecto sin decisión explícita (ver §1.6, H-02).

### 1.2 Modelo de datos relevante

`backend/prisma/schema.prisma`:

| Modelo | Campos clave | Observación para la ficha |
|---|---|---|
| `Product` (`:378`) | `sku @unique`, `barcode @unique?`, `name`, `slug @unique`, `description`, `basePrice`, `costPrice`, `comparePrice`, `registroIsp`, `imageUrl`, `categoryId` (req.), `brandId?`, `lowStockThreshold` | No hay `size`, `servings`, `ingredients`, `descriptionShort`, `seoTitle`, ni fuentes IA. |
| `ProductVariant` (`:415`) | `sku @unique`, `barcode @unique?`, `variantName`, `attributes Json`, `price?`, `costPrice?`, `physicalStock @map("stock")`, `reservedStock`, `publicStock`, `publicPublished`, `lowStockAlert` | Los sabores se representan naturalmente como variantes (`variantName` + `attributes`). No hace falta columna `flavors`. |
| `Category` (`:352`) | `name @unique`, `slug @unique`, `isActive` | Existe, pero no se expone por API. |
| `Brand` (`:366`) | `name @unique`, `slug @unique`, `isActive` | Ídem. |
| `OrderItem` (`:543`) | copia `productName`, `variantName`, `sku`, `unitPrice`, `unitCost` | Guarda snapshot: renombrar/editar producto no reescribe ventas. |
| `InventoryMovement` (`:725`) | auditoría de movimientos | La creación de producto no lo usa hoy. |

Conclusión: **se puede implementar todo con migraciones aditivas y nullable**, sin reescribir tablas existentes.

### 1.3 Formulario actual: campos y brechas

Campos en creación (`Productos.tsx:657-701`): nombre, SKU, barcode (+escáner), categoría (texto), marca (texto), precio base, costo, precio tachado, proveedor, umbral stock, descripción, registro ISP; variantes con nombre, SKU, barcode, precio, costo, stock, alerta.

Brechas frente al objetivo:

| # | Brecha | Evidencia | Impacto |
|---|---|---|---|
| F-01 | Sin entrada por foto/URL/texto; solo tecleo | `:653-701` | No reduce tiempo |
| F-02 | SKU obligatorio en UI aunque backend lo autogenere | `:182-186`, `:289-293`, `sku.ts:27` | Bloquea guardado rápido |
| F-03 | Categorías derivadas solo de productos activos cargados | `:81-85` | Categorías vacías desaparecen; no sirve como "lista existente" |
| F-04 | Marca inconsistente: crear usa **nombre**, editar usa **id** | `:215`, `:251`, `:321` | El borrador IA debe resolver nombre→id al editar |
| F-05 | Sin advertencia de duplicados (barcode/nombre) | — | Duplicados silenciosos |
| F-06 | Sin herencia de precio/costo a variantes | `:679-697` | Repetir datos por sabor = lentitud |
| F-07 | Sin duplicar producto | — | Fricción operativa |
| F-08 | Sin modo lote | — | Fricción operativa |
| F-09 | Guardar/Cancelar al final de un formulario inline; nav fija `z-40` | `:703-710`, `BottomNav.tsx:80` | Se tapan en móvil |
| F-10 | Precios `type=number` sin `inputMode` | `:665-667`, `:687-689` | Teclado numérico inconsistente en iOS |
| F-11 | Sin confianza por campo ni fuentes | — | Aprobación insegura |
| F-12 | Al crear, `costPrice: Number(cost) || undefined` y `basePrice || undefined` | `:211-212` | `0` explícito se vuelve `undefined`; tolerable, pero conviene enviar números válidos |

### 1.4 API actual: lo que ya sirve y lo que falta

Ya existe y **se reutiliza sin cambios**:

- `POST /api/products` (`ADMIN`) — creación con variantes anidadas.
- `GET /api/products/internal` (`ADMIN`,`SELLER`) — lista para admin, solo activos (`products.service.ts:79`).
- `GET /api/products/barcode/:code` — busca en producto **y** variante (`:145-181`). Base perfecta para duplicados exactos.
- `PATCH /api/products/:id`, `PATCH /:id/stock`, `PATCH /:id/price`, `PATCH /:id/adjust-stock`.

Falta:

- `GET /api/products/taxonomies` (categorías/marcas activas).
- `GET /api/products/duplicates?name=&barcode=` (o que el draft lo devuelva).
- `POST /api/products/:id/duplicate` (o duplicado resuelto en frontend, ver §2.7).
- `POST /api/ai/product-draft`.
- `GET /api/ai/product-draft/status` (cuota + precalentamiento).

Detalles transversales:

- Auth por cookie HttpOnly + `apiFetch` (`src/lib/api.ts:109-195`); el prefijo real es `/erp/*` → backend `/api/*` (`next.config.mjs:23-30`).
- Body: **no** hay `express.json`; se lee el stream en el handler con `readJsonBody`, límite 5 MB y timeout de 15 s (`backend/src/common/decorators/raw-body.decorator.ts:18-22`). Fotos deben ir comprimidas y en base64 JSON.
- Throttler global 30 req/min por IP (`app.module.ts:29`); `/ai/chat` ya limita a 10/min (`ai.controller.ts:18`).
- CSP permite `img-src data: blob:` (`next.config.mjs:52`), así que previews locales funcionan.

### 1.5 IA existente

- `AiService.chat` (`backend/src/ai/ai.service.ts:104-172`): cadena `gemini-3.6-flash → 3.5 → 2.5`, timeout 55 s, sin structured output.
- `GeminiOCRProvider` (`backend/src/ocr/gemini-ocr.provider.ts`): visión + JSON parseado con regex, **sin validación de esquema**. Sirve de referencia, no se debe reutilizar tal cual.
- No hay `zod` en `backend/package.json`; tampoco en el frontend.
- No hay tabla de uso/cuota ni almacenamiento de fuentes.
- `GEMINI_API_KEY` no está en `backend/.env` local (sí puede estar en Render; verificar antes de probar).

### 1.6 Hallazgos priorizados

| ID | Sev. | Hallazgo | Acción propuesta |
|---|---|---|---|
| B-01 | Bloqueante | SKU obligatorio en UI contra backend que autogenera | Añadir `generateSku()` y permitir vacío; backend sigue siendo autoridad |
| B-02 | Bloqueante | No hay API de categorías/marcas | `GET /products/taxonomies` + cache 60 s |
| B-03 | Bloqueante | No existe pipeline de borrador validado | Servicio nuevo con zod + visión + cuota |
| H-01 | Alto | Cold start Render ~44 s vs meta <10 s | Prewarm al abrir Productos + medir en caliente; documentar |
| H-02 | Alto | Creación de producto no registra `InventoryMovement` por stock inicial | **No cambiar** en fase 1; dejar stock en 0 en borradores IA y cargarlo luego por ajuste auditado, o decisión explícita |
| H-03 | Alto | `findInternal` solo devuelve activos, pero el filtro UI ofrece "Inactivos" | Fuera de alcance; no tocar para evitar regresiones |
| H-04 | Alto | No hay almacenamiento de imágenes (`imageUrl` sin upload) | Fase 1: fotos solo como entrada efímera; persistencia en fase 4 con R2/S3 |
| H-05 | Alto | Duplicados por nombre sin `pg_trgm` | Migración opcional con fallback en TS |
| M-01 | Medio | Body 5 MB / 15 s puede ser justo con 4 fotos en 4G | Comprimir a ≤400 KB/foto; subir timeout de esa ruta a 30 s |
| M-02 | Medio | `basePrice/costPrice` con `|| undefined` | Enviar `undefined` solo si el string está vacío |
| M-03 | Medio | Marca nombre vs id inconsistente | Normalizar en el mapeo del borrador |
| M-04 | Medio | Formulario inline no apto para móvil | Drawer full-screen + footer sticky |
| M-05 | Medio | Sin idempotencia en `POST /products` | Generar SKU único por borrador antes de aprobar (doble tap falla por `@unique`, no duplica) |
| M-06 | Medio | Claims médicos no filtrados | Prompt + blocklist server-side + warning |
| H-06 | Alto | Al editar, se enviaba el **ID** de marca en el campo `brand`; `resolveBrand` lo trataba como nombre y podía crear una marca nueva con el UUID | **Corregido**: el formulario de edición ahora usa el nombre de marca |

### 1.7 Invariantes que NO se tocan

- `reserveStock`, `releaseStock`, `confirmStock`, `updateStock`, `adjustStock`.
- `POST /orders`, `POST /orders/public`, checkout, POS, caja.
- Cálculo de `stock` (`physicalStock @map("stock")`), `reservedStock`, `publicStock`.
- `OrderItem` y snapshots históricos.
- Reglas de SKU/barcode `@unique`.

El asistente **solo propone**; la escritura usa `POST /products` existente y las mismas validaciones.

---

## 2. Diseño propuesto

### 2.1 Contrato del endpoint

`POST /api/ai/product-draft` — `ADMIN`, `@Throttle 8/min`.

Request:

```ts
{
  mode: 'photo' | 'barcode' | 'url' | 'text';
  images?: { mimeType: string; dataBase64: string }[]; // 1..4, ≤400 KB c/u
  barcode?: string;
  url?: string;
  text?: string;
  hints?: { category?: string; brand?: string };
  webSearch?: boolean; // default false salvo URL
}
```

Response 200:

```ts
{
  draftId: string;                 // uuid efímero
  name: string | null;
  brand: string | null;
  category: string | null;         // solo nombre existente o null
  flavors: string[];               // 0..12
  size: string | null;
  servings: number | null;
  isp_number: string | null;
  ingredients: string | null;
  barcode: string | null;
  description_short: string | null;
  seo_title: string | null;
  sku_suggested: string | null;
  confidence: Record<string, number>; // 0..1 por campo
  sources: { type: 'label'|'web'|'catalog'; title: string; url?: string; field?: string; retrievedAt: string }[];
  duplicates: {
    exact: { id: string; name: string; sku: string; barcode: string | null; match: 'product'|'variant' }[];
    similar: { id: string; name: string; score: number }[];
  };
  warnings: string[];              // claims, ISP dudoso, categoría nueva, etc.
  meta: {
    model: string;
    latencyMs: number;
    webSearchUsed: boolean;
    quota: { used: number; limit: number; resetAt: string };
  };
}
```

Errores: `400` input inválido, `422` imágenes ilegibles, `429` cuota/throttle, `503` sin `GEMINI_API_KEY`, `504` timeout IA.

### 2.2 Esquema zod (servidor, estricto)

Campos del borrador: `name`, `brand`, `category`, `flavors[]`, `size`, `servings`, `isp_number`, `ingredients`, `barcode`, `description_short`, `seo_title`, `sku_suggested`; `confidence` como `record(field, z.number().min(0).max(1))`; `sources[]` con `type` enum.

Reglas de validación posteriores al modelo:

- `name`: 2–120 chars, sin HTML.
- `barcode`: solo dígitos, 8–14, validar dígito EAN/UPC; si no, `null`.
- `servings`: entero 1–1000 o `null`.
- `sku_suggested`: `^[A-Z0-9-]{1,50}$`; si falla, `null` (el cliente genera uno).
- `confidence`: claves desconocidas se descartan; defaults a 0.
- `sources`: máx. 10, URLs solo `http(s)`.

**Regla ISP**: se acepta `isp_number` solo si sus dígitos aparecen literalmente en el texto OCR/etiqueta o en una fuente web citada; si no, `null` + warning. Nunca inferir.
**Regla ingredientes**: solo si visibles en foto de etiqueta o en fuente citada; si no, `null`.
**Claims**: blocklist (`cura`, `trata`, `previene`, `adelgaza`, `quema grasa`, `mejora la salud`, etc.). Si aparecen en `description_short`/`seo_title`, se eliminan y se agrega warning.

### 2.3 Pipeline

```
fotos comprimidas (cliente)
   → validación tamaño/mime (servidor)
   → 1 llamada Gemini vision + JSON schema
   → zod parse
   → post-proceso (ISP, claims, barcode, SKU)
   → duplicados (barcode exacto + nombre similar)
   → web search opcional (grounding) para mercado CL
   → respuesta con confianza/fuentes/warnings
```

- Usar `responseMimeType: application/json` + `responseSchema` cuando el modelo lo soporte; **siempre** validar con zod y reparar con una segunda pasada acotada (`maxOutputTokens` bajo) solo si el JSON falla.
- Mantener la cadena de fallback de modelos existente, centralizada en un helper para no duplicar lógica.
- Timeout servidor 25 s; el cliente mide y muestra etapas.

### 2.4 Duplicados

- **Exacto**: reutilizar `findByBarcode` (producto y variante).
- **Nombre**: normalizar (minúsculas, sin tildes, quitar unidades `1kg/2lb/30 serv`, quitar tokens de marca), luego:
  - preferido: `pg_trgm` (`similarity(name, $1) > 0.45`) con índice GIN;
  - fallback: candidatos por primera palabra + Jaccard de tokens en TS.
- Devolver top 5 con score; nunca bloquear automáticamente: el usuario decide.

### 2.5 Web search (opcional)

- Preferencia: **Google Search grounding de Gemini** (sin nueva API key), tomando `groundingMetadata` para fuentes.
- Solo si `webSearch=true` o `mode='url'`; 1 llamada, máx. 3–5 competidores CL.
- Los precios de mercado son **referencia informativa**: no prellenan precio ni costo (regla del negocio).
- Persistir fuentes en la respuesta y, al aprobar, en `Product.aiSources`.
- Si no hay grounding disponible o falla: degradar silenciosamente (`webSearchUsed:false`), no romper el borrador.

### 2.6 Cuota diaria

- Tabla `ai_usage_daily` (`userId`, `day`, `calls`, `tokens`), `@@unique([userId, day])`.
- Incremento atómico con `INSERT ... ON CONFLICT ... DO UPDATE ... WHERE calls < limit RETURNING calls` (compatible con pgbouncer; sin transacción interactiva).
- Límite por env `AI_DRAFT_DAILY_LIMIT` (default 60) y throttle 8/min.
- La cuota se descuenta al **intentar** el borrador; los fallos de red del proveedor no se devuelven (registrar `tokens` si hay respuesta).

### 2.7 UX móvil (frontend)

- Botón **"Crear con IA"** sobre el formulario, primario; abre un `ProductFormSheet` full-screen (`fixed inset-0 z-50`) con:
  - cabecera fija y footer sticky (Guardar/Cancelar) con `pb-[calc(env(safe-area-inset-bottom)+72px)]` para no chocar con la nav `z-40`;
  - paso 1: fuente (cámara / galería / barcode / URL / texto);
  - paso 2: procesando con etapas y contador;
  - paso 3: revisión con confianza por campo (verde ≥0.85, ámbar 0.60–0.84, rojo <0.60), fuentes y duplicados;
  - paso 4: variantes por sabor con herencia de precio/costo (editar la primera fila propaga; override por fila);
  - stock y costo siempre manuales; stock inicial por defecto 0 (evita H-02).
- Cámara: `<input type="file" accept="image/*" capture="environment">` **de a una foto** (iOS limita `multiple` con `capture`), tira de miniaturas hasta 4. Compresión canvas a máx. 1280 px, JPEG q0.72, objetivo ≤400 KB, sin EXIF.
- Barcode: reutilizar `BarcodeScanner.tsx` existente (html5-qrcode + ZXing), no reimplementar.
- Precios: `type="text"` + `inputMode="numeric"` + formateo CLP al perder foco (evita spinners iOS).
- Confianza: componente `ConfidenceField` que pinta borde/fondo y tooltip; los campos rojos deben tocarse/confirmarse antes de guardar.
- **Nada se guarda** hasta pulsar "Guardar producto" y confirmar duplicados/categoría nueva.
- **Modo lote**: cola en `localStorage` (máx. 10, expira 24 h) con estados `pending|saving|done|error`; "Aprobar todos" secuencial, con resumen por fila. Si se prefiere persistencia multi-dispositivo, alternativa: tabla `ai_product_drafts` (ver §4, opción B).
- **Duplicar**: botón por fila que abre el formulario prellenado como **nuevo** borrador (nombre + " copia", stock 0, barcode vacío, SKU vacío→autogenerado). Sin escritura hasta aprobar. Alternativa server-side `POST /products/:id/duplicate` si se quiere 1 clic.
- **SKU automático**: `generateSku(category, name, size)` en `src/lib/sku.ts` con preview; el backend mantiene `uniqueSku` como respaldo.

### 2.8 Rendimiento (presupuesto tibio)

| Etapa | Presupuesto |
|---|---|
| Compresión cliente (4 fotos) | 0.3–0.8 s |
| Subida 4G | 0.5–2 s |
| Gemini visión | 2–5 s |
| Duplicados + taxonomías | 0.1–0.3 s |
| **Total** | **3–8 s** |

Cold start Render (~44 s) queda fuera del criterio; mitigar con `GET /ai/product-draft/status` al abrir la pestaña Productos y, si se requiere SLA, instancia paga o ping programado.

---

## 3. Plan por fases

### Fase 0 — Auditoría (este documento)
- Sin cambios de código. Entregable: hallazgos, contrato, plan, riesgos.
- Salida: aprobación de decisiones abiertas (§7).

### Fase 1 — Núcleo backend + migración mínima (1–2 días)
- Instalar `zod`.
- Migración: columnas nuevas en `products`, tabla `ai_usage_daily`, extensión `pg_trgm` (+índice).
- `GET /products/taxonomies`.
- `POST /ai/product-draft` con visión, zod, normalización, ISP/claims, duplicados exactos y por nombre, cuota.
- `GET /ai/product-draft/status`.
- Tests unitarios de esquema/reglas y e2e con Gemini mockeado.
- **Criterio de salida**: `curl`/Invoke-WebRequest con 1 foto devuelve JSON válido; sin key → 503 claro; cuota → 429.

### Fase 2 — Frontend móvil (2–3 días)
- Extraer `ProductFormSheet`, `AiDraftReview`, `ConfidenceField`, `VariantRows`.
- Botón "Crear con IA", cámara, compresión, barcode, URL/texto.
- Confianza, fuentes, duplicados, categoría nueva con confirmación.
- Variantes con herencia; stock/costo manuales; SKU automático; footer sticky.
- Corregir B-01 (SKU opcional) y F-10 (inputMode).
- **Criterio**: foto → formulario prellenado <10 s en caliente; nada se guarda sin aprobar.

### Fase 3 — Productividad (1–2 días)
- Duplicar producto (prefill sin escritura; opcional endpoint).
- Modo lote con cola y "Aprobar todos".
- Persistencia de `aiSources` al aprobar.
- **Criterio**: 3 borradores aprobados en lote con resultado por fila; duplicado no hereda stock/barcode.

### Fase 4 — Endurecimiento y opcionales (1 día)
- Web search con grounding + fuentes (si Fase 1 no lo incluyó).
- Telemetría de latencia/cuota, alertas, documentación operativa.
- Pruebas iOS/Android reales.
- Sin storage de imágenes ni `imageUrl` (decisión cerrada: solo extracción).

Dependencias: Fase 2 depende de Fase 1; Fase 3 de Fase 2; Fase 4 puede recortarse sin bloquear el objetivo.

---

## 4. Migraciones

### Opción A (recomendada, mínima) — **creada el 2026-11-18**

Archivo real: `backend/prisma/migrations/20261118_ai_product_draft/migration.sql` (idempotente, sin `pg_trgm`; la detección de nombres usa el fallback en TS ya implementado). Validada con `prisma validate` y `prisma generate`.

SQL de referencia:

```sql
-- Campos de ficha (todos nullable: migración segura, sin backfill)
ALTER TABLE "products" ADD COLUMN "size" TEXT;
ALTER TABLE "products" ADD COLUMN "servings" INTEGER;
ALTER TABLE "products" ADD COLUMN "ingredients" TEXT;
ALTER TABLE "products" ADD COLUMN "descriptionShort" TEXT;
ALTER TABLE "products" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "products" ADD COLUMN "aiSources" JSONB;
ALTER TABLE "products" ADD COLUMN "aiConfidence" JSONB;

-- Cuota diaria por usuario
CREATE TABLE "ai_usage_daily" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "day" DATE NOT NULL,
  "calls" INTEGER NOT NULL DEFAULT 0,
  "tokens" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_usage_daily_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ai_usage_daily_userId_day_key" ON "ai_usage_daily"("userId", "day");

-- Duplicados por nombre (opcional; el código tiene fallback sin extensión)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "products_name_trgm_idx" ON "products" USING GIN ("name" gin_trgm_ops);
```

Y en `schema.prisma`: campos equivalentes + `AiUsageDaily` + `@@map("ai_usage_daily")`. Sin cambios en `ProductVariant` (sabores = variantes).

### Opción B (solo si se quiere cola persistente multi-dispositivo)

Añadir `AiProductDraft`:

```prisma
model AiProductDraft {
  id              String   @id @default(uuid())
  createdById     String
  status          String   @default("DRAFT") // DRAFT|APPROVED|DISCARDED
  payload         Json
  sources         Json?
  confidence      Json?
  approvedProduct String?
  createdAt       DateTime @default(now())
  expiresAt       DateTime
  @@index([createdById, status])
  @@map("ai_product_drafts")
}
```

Coste: más superficie y limpieza programada. **Recomendación**: empezar con Opción A + cola en `localStorage`; migrar a B solo si el equipo opera desde varios dispositivos.

Rollback: columnas y tabla son aditivas; `DROP` seguro. No reversible el uso de `pg_trgm` si otra feature lo adopta (no es el caso).

---

## 5. Archivos tocados (previstos)

### Backend
```
backend/package.json                                  # + zod
backend/prisma/schema.prisma                          # campos IA + AiUsageDaily
backend/prisma/migrations/20261118_ai_product_draft/  # SQL
backend/src/ai/ai.module.ts                           # registrar servicio/controller
backend/src/ai/product-draft.controller.ts            # nuevo
backend/src/ai/product-draft.service.ts               # nuevo
backend/src/ai/product-draft.schema.ts                # nuevo (zod)
backend/src/ai/product-draft.prompt.ts                # nuevo
backend/src/ai/product-draft.duplicates.ts            # nuevo
backend/src/ai/ai-usage.service.ts                    # nuevo
backend/src/ai/product-draft.service.spec.ts          # nuevo
backend/src/products/products.controller.ts           # + taxonomies (sin tocar ventas)
backend/src/products/products.service.ts              # + taxonomies/duplicates (solo lectura)
```
Sin cambios en: `orders`, `cash-register`, `delivery`, `inventory`, `products.service.ts` métodos de stock.

### Frontend
```
src/components/admin/Productos.tsx                    # integración (reduce tamaño extrayendo form)
src/components/admin/productos/ProductFormSheet.tsx   # nuevo
src/components/admin/productos/AiDraftReview.tsx      # nuevo
src/components/admin/productos/ConfidenceField.tsx    # nuevo
src/components/admin/productos/VariantRows.tsx        # nuevo
src/components/admin/productos/BatchQueue.tsx         # nuevo (fase 3)
src/lib/admin/productDraft.ts                         # nuevo (tipos, mapeo, compresión)
src/lib/admin/helpers.ts                              # mapear campos nuevos
src/lib/sku.ts                                        # + generateSku (no romper skuError)
src/lib/api.ts                                        # opcional: helper con timeout por llamada
src/types/admin.ts                                    # extender AdminProduct
src/app/(admin)/admin/page.tsx                        # pasar taxonomías/refresh (mínimo)
```
Sin cambios en: POS (`src/app/pos`, `Caja.tsx`), checkout público, `BarcodeScanner.tsx` (se reutiliza).

### Docs
```
docs/PLAN-ASISTENTE-FICHA-2026-11-18.md               # este archivo
```

---

## 6. Checklist de pruebas

### 6.1 Unitarias (backend)
- [ ] Zod acepta JSON válido y rechaza campos extra/tipos incorrectos.
- [ ] `isp_number` se anula si no aparece en OCR/fuente.
- [ ] `ingredients` se anula sin etiqueta/fuente.
- [ ] Claims médicos se eliminan y generan warning.
- [ ] `barcode` inválido (dígito verificador) → `null` + warning.
- [ ] `sku_suggested` inválido → `null`.
- [ ] Normalización de nombre y score de similitud (casos: "Whey 1kg" vs "WHEY PROTEIN 1 KG", "Creatina" vs "Creatina Monohidratada").
- [ ] Cuota: incremento atómico, límite exacto, reset diario, concurrencia (2 requests simultáneos).
- [ ] Sin `GEMINI_API_KEY` → 503; modelo caído → fallback; JSON roto → 422/504 controlado.

### 6.2 Integración
- [ ] Foto de etiqueta real → todos los campos con confianza y fuentes.
- [ ] Solo barcode → duplicado exacto detectado (producto y variante).
- [ ] URL oficial → datos + fuentes; sin precios prellenados.
- [ ] Texto libre → borrador parcial sin alucinar ISP/ingredientes.
- [ ] Duplicado por nombre con `pg_trgm` y con fallback sin extensión.
- [ ] `POST /products` con el borrador aprobado crea producto + N variantes y stock 0.
- [ ] Doble aprobación del mismo borrador → segundo intento 400 por SKU/barcode, sin duplicado.

### 6.3 Regresión (crítica)
- [ ] Venta POS normal descuenta stock y crea `OrderItem` correcto.
- [ ] Reserva/confirmación de pedido público mantiene stock y `reservedStock`.
- [ ] `PATCH /:id/stock`, `/:id/adjust-stock` y `/:id/price` sin cambios.
- [ ] Editar producto existente (incluida marca por id) sigue funcionando.
- [ ] Importar/Exportar Excel intacto.
- [ ] Barcode scanner sigue buscando producto/variante.
- [ ] Caja y reportes sin cambios.

### 6.4 Manual iOS / Android
- [ ] iOS Safari: cámara abre, 1 foto por captura, miniaturas, compresión, preview.
- [ ] iOS Safari: teclado numérico en precio/costo/stock; sin zoom raro.
- [ ] Android Chrome: hasta 4 fotos, HEIC/JPEG, cámara trasera.
- [ ] Footer Guardar/Cancelar visible y no tapado por "Vender" (safe-area).
- [ ] Vista previa de confianza legible al sol; targets ≥44 px.
- [ ] Procesando → borrador <10 s (instancia caliente, 4G).
- [ ] Modo avión / 3G lento: mensaje claro, sin perder fotos.
- [ ] Rotación y teclado abierto no rompen el sheet.

### 6.5 Seguridad / privacidad
- [ ] Endpoint solo `ADMIN`; `SELLER` recibe 403.
- [ ] Body >5 MB rechazado con 413/400 claro.
- [ ] Base64 no se escribe en logs.
- [ ] Fuentes solo `http(s)`; sin HTML inyectado en descripción/SEO.
- [ ] Rate limit 8/min y cuota diaria verificables.
- [ ] Confirmación explícita antes de crear categoría/marca nueva.

---

## 7. Decisiones cerradas (2026-11-18)

1. **Persistencia de borradores**: **`localStorage`** por dispositivo, cola máx. 10, expira 24 h. No se crea `ai_product_drafts`; la migración se limita a la Opción A.
2. **Fotos del producto**: **solo extracción**. Se comprimen, se envían, se procesan y se descartan. No hay subida a storage ni escritura de `imageUrl` en esta entrega; persistencia de imágenes queda fuera de alcance (futuro R2/S3).
3. **Stock inicial**: **0 por defecto**. El stock se carga después con `PATCH /:id/adjust-stock`, que ya registra `InventoryMovement` y `AuditLog`.
4. **Web search**: grounding de Gemini, opt-in, sin proveedor adicional. No prellena precios.
5. **Permisos**: todo el flujo es `ADMIN` (coherente con `POST /products`).
6. **Duplicar**: prefill de un borrador nuevo sin escritura; stock 0, barcode vacío, SKU autogenerado.

Con esto, la migración requerida queda exactamente en la Opción A de §4 y la Fase 4 se reduce a web search + endurecimiento (sin storage de imágenes).

---

## 8. Implementado sin IA (2026-11-18)

Se adelantó toda la base no dependiente de Gemini. La migración de §4 (Opción A) **ya está creada** para dejar el modelo listo, pero ningún endpoint IA la usa todavía: las columnas son nullable y no alteran el flujo actual.

### Backend
- `GET /api/products/taxonomies` — categorías y marcas activas (`ADMIN`, `SELLER`). Solo lectura.
- `GET /api/products/duplicates?name=&barcode=&excludeId=` — duplicado exacto por barcode (producto o variante, reutiliza `findByBarcode`) y similitud de nombre por tokens, con fallback sin `pg_trgm`. Solo lectura.
- `GET /products/internal` ahora incluye `registroIsp`, `imageUrl` y los campos de ficha (`size`, `servings`, `ingredients`, `descriptionShort`, `seoTitle`) para que editar/duplicar no los pierda.
- **Migración creada**: `20261118_ai_product_draft` agrega columnas nullable a `products` y la tabla `ai_usage_daily`. Aún no la consume ningún endpoint IA.
- `create` y `update` aceptan y persisten los 5 campos de ficha de forma opcional; vacío se guarda como `null`. No cambian stock, órdenes, POS ni caja.
- Tests: 5 casos nuevos en `products.service.spec.ts` (taxonomías, barcode exacto, exclusión al editar, similitud con tildes/unidades, sin consulta innecesaria). Total del archivo: 18 pasando.

### Frontend (`Productos.tsx`)
- SKU automático: se genera desde categoría + nombre (`generateSku` en `src/lib/sku.ts`), editable, y el backend sigue garantizando unicidad. Se eliminó el bloqueo por SKU vacío.
- Captura numérica (`inputMode="numeric"`, `min=0`, `step=1`) en precio, costo, tachado, stock, alerta y umbral.
- Sabores en lote: input "Vainilla, Chocolate, Frutilla" → una fila por sabor heredando precio/costo del producto; botón "Aplicar precio/costo a todas"; herencia automática al salir de precio/costo si la variante está vacía.
- Duplicar producto: abre el formulario como **nuevo** borrador (sin escribir nada), nombre "(copia)", stock 0, barcode vacío y SKU autogenerado.
- Duplicados visibles: aviso en el formulario al salir de nombre/barcode; bloqueo de barcode exacto y confirmación si hay nombre parecido al guardar.
- Categorías y marcas con `datalist` desde el endpoint nuevo (sin impedir crear una nueva).
- Footer de Guardar/Cancelar sticky por encima de la nav "Vender" (`bottom: calc(72px + safe-area)`), y footer sticky en el modal de edición.
- **Corregido H-06**: editar marca ya no envía el UUID; envía el nombre y el backend resuelve la marca existente.
- `mapApiProduct` ahora conserva `registroIsp`, `imageUrl`, `slug`, `supplierId` y los 5 campos de ficha (antes se perdían al editar/duplicar).
- **Carga manual de ficha (Opción A)**: los 5 campos se pueden llenar a mano en crear y editar, se envían al backend y se muestran al reabrir. Sin IA todavía. Tests: 2 casos en `src/lib/admin/helpers.test.ts` ampliados con los campos nuevos.
- Tests: 5 casos nuevos en `src/lib/sku.test.ts` y 2 en `src/lib/admin/helpers.test.ts`.
- **Contrato del borrador listo (sin conectar)**: `src/types/productDraft.ts` define `ProductDraft` (campos, `confidence`, `sources`) y `src/lib/admin/productDraft.ts` expone `draftToForm()` para convertir un borrador al shape del formulario (un sabor = una variante, stock 0). Tests: `src/lib/admin/productDraft.test.ts` → 3/3.

### Verificación ejecutada
- `npx jest src/products/products.service.spec.ts` → 18/18.
- `npx jest src/lib/sku.test.ts` → 10/10 (se conservaron los 5 previos + 5 nuevos).
- `npx jest src/lib/admin/helpers.test.ts` → 2/2.
- `npx jest src/components/admin` → 2/2 (sin regresión en Finanzas).
- `npx prisma validate` → schema válido; `npx prisma generate` → cliente regenerado.
- `tsc --noEmit`: sin errores en los archivos tocados. Persisten errores previos en `delivery/*` (backend) y `Entregas.tsx` (frontend), ajenos a este cambio.

### Pendiente para cuando se active la IA
- Endpoint `/api/ai/product-draft`, zod, cuota, web search y confianza/fuentes.
- Modo lote (la cola queda atada a borradores IA).
