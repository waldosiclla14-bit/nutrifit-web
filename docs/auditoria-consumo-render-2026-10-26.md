# Auditoría de consumo de Render — NutriFit

**Fecha:** 26 de octubre de 2026
**Alcance:** auditoría de **solo lectura**. No se modificó código, dependencias, variables de entorno, configuración de producción, despliegues, migraciones ni servicios de Render.
**Datos de la alerta:** cuota 750 h · consumo reportado 618 h · saldo 132 h · servicio señalado `nutrifit-api`.

---

## 1. Resumen ejecutivo

El consumo **no se explica por tráfico de clientes ni por bots**. Se explica por un **latido (heartbeat) que el propio frontend dispara contra la API**, programado cada 10 minutos, en la tienda pública, en `/login`, en `/admin` y en `/pos`.

Dos hechos, ambos verificados, cierran el caso:

1. `api.nutrifitsuplementos.cl` es un **CNAME a `nutrifit-api-635n.onrender.com`**, es decir, al servicio gratuito de Render.
2. El JavaScript de producción ejecuta `fetch("https://api.nutrifitsuplementos.cl/api/health")` al cargar la página, cada `600000 ms` (10 min) y cada vez que la pestaña vuelve a estar visible.

Como el umbral de reposo de Render es de **15 minutos sin tráfico entrante**, un latido cada 10 minutos **impide que la instancia se duerma**. Un solo servicio gratuito que nunca duerme consume ~720–744 h al mes, es decir, **casi exactamente las 750 h de la cuota completa**. Los 618 h reportados equivalen a **25,75 días de ejecución continua**, consistente con "encendido desde el inicio del ciclo".

Agravantes confirmados en el código: el health check de Render apunta a `/api/products` (consulta pesada con `include` de categorías, marcas, variantes y lotes) y el contenedor ejecuta `prisma db push` + `prisma db seed` en **cada arranque**.

El latido va a `/api/health`, endpoint que **no existe en el backend**: devuelve 404, no valida nada, pero **igual mantiene viva la instancia**. Costo total, beneficio cero.

---

## 2. Arquitectura real encontrada

```
Tienda / Admin / POS (Next.js)  →  API (NestJS)  →  PostgreSQL
        Vercel                      Render             Neon
```

| Capa | Dónde | Evidencia |
|---|---|---|
| Frontend | Vercel (`nutrifitsuplementos.cl` → 76.76.21.21) | DNS + `DEPLOY.md` |
| API | Render, servicio `nutrifit-api`, host real `nutrifit-api-635n.onrender.com` | `render.yaml`, DNS CNAME |
| Base de datos | Neon (PostgreSQL) | `schema.prisma` (`provider = "postgresql"`), `DEPLOY.md` |
| CI/CD | GitHub Actions → API de Render, solo ante cambios en `backend/**`, sin cron | `.github/workflows/deploy-render.yml` |

- `nutrifit-api` **es un backend independiente** (NestJS con prefijo global `/api`), **no** forma parte de Next.js.
- El frontend llama a la API por dos vías: rutas relativas `/erp/*` (proxy) y el host absoluto `https://api.nutrifitsuplementos.cl`.
- No hay cron, colas ni workers en el backend. El único proceso es el servidor HTTP.

---

## 3. Causas confirmadas

### 3.1 El latido del frontend (causa principal)

Chunk de producción `/_next/static/immutable/chunks/36j7e66r7nc24.js` (tienda) y `0as_dlil33q_w.js` (login/admin/POS). Código desminificado:

```js
const API = "https://api.nutrifitsuplementos.cl";
let last = 0;
const ping = () => {
  if (Date.now() - last < 3e5) return;        // throttle: mínimo 5 min entre llamadas
  last = Date.now();
  const ctrl = new AbortController;
  const to = setTimeout(() => ctrl.abort(), 6e4);
  fetch(`${API}/api/health`, { method: "GET", signal: ctrl.signal })
    .catch(() => {}).finally(() => clearTimeout(to));
};
ping();                                        // al cargar
setInterval(ping, 6e5);                        // cada 10 minutos
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") ping();
});
```

- **Intervalo: 600 000 ms = 10 min < 15 min** de umbral de reposo → la instancia no se duerme.
- Se ejecuta en **todas** las superficies: portada, `/login`, `/admin`, `/pos`.
- La reducción de timers en segundo plano del navegador (a ~1/min) **no lo detiene**: 10 min ya es mayor que ese mínimo, así que una pestaña olvidada sigue latiendo.
- El `catch(() => {})` oculta cualquier fallo: el latido es **silencioso e invisible** en el cliente.

### 3.2 El destino es Render

```
api.nutrifitsuplementos.cl  CNAME  nutrifit-api-635n.onrender.com
                                   gcp-us-west1-1.origin.onrender.com
                                   216.24.57.16 / 216.24.57.18
```

No es un proxy de Vercel ni un servicio distinto: **es el servicio gratuito de Render**.

### 3.3 El endpoint no existe

El backend NestJS (**snapshot local**) no tiene controlador ni ruta `health`. Controllers presentes: `audit`, `auth`, `cash-register`, `config`, `customers`, `orders`, `products`, `users`.

Consecuencia: cada latido recibe **404**, no valida nada y **no aporta ningún beneficio**; solo reinicia el contador de inactividad. *(En producción el 404 no está verificado al 100 %, pero es indiferente para el consumo: cualquier respuesta HTTP entrante cuenta como tráfico.)*

### 3.4 Health check pesado

`render.yaml`:

```yaml
healthCheckPath: /api/products
```

`products.service.ts → findAll()` ejecuta `findMany` con `include` de `category`, `brand`, `variants` y `batches`. Render consulta ese path **cada pocos segundos**. Es la consulta más costosa de la API usada como sonda de vida.

### 3.5 Arranque sucio

`Dockerfile`:

```
npx prisma db push || true; npx prisma db seed || true; npm run start:prod
```

- `db push` + `seed` en **cada arranque** → cold start largo.
- El `|| true` **enmascara errores**: si la base está suspendida, el arranque continúa en estado inconsistente.
- `seed` hace `upsert` (idempotente, no destructivo), pero **no debe correr en producción en cada boot**: puede reponer datos de demo sobre datos reales.
- Cold start largo + health check pesado = riesgo de reinicio, lo que multiplica el arranque y el consumo real percibido.

### 3.6 La cuota es del workspace, no del servicio

Las 750 h son **por workspace y por mes calendario**, compartidas por todos los servicios web gratuitos. Un solo servicio encendido 24/7 ya consume 720 h (mes de 30 días) o 744 h (mes de 31 días): deja **6 h de margen** o directamente agota la cuota. Cualquier segundo servicio gratuito rompe el presupuesto.

---

## 4. Causas probables (falta confirmación del panel)

| # | Hipótesis | Qué la sostiene | Qué falta para confirmarla |
|---|---|---|---|
| P1 | La instancia estuvo encendida ~24 h/día durante ~26 días | 618 h ≈ 25,75 días continuos; el latido lo permite | Gráfico de *instance hours* y marcas de "suspended/resumed" en Events |
| P2 | Una pestaña (POS o admin) quedó abierta de forma casi permanente en un equipo de tienda | El latido vive en `/pos` y `/admin`; un POS de mostrador suele quedar abierto | Logs: User-Agent de navegador y distribución horaria de `/api/health` |
| P3 | Existe un monitor externo (UptimeRobot, BetterStack, cron-job.org) | Explicaría latidos en horas sin pestañas abiertas | Logs: User-Agent del monitor |
| P4 | Hay otros servicios gratuitos en el workspace consumiendo cuota | La cuota es compartida | Billing → Monthly Included Usage, desglose por servicio |
| P5 | El backend en producción difiere del snapshot local (incluido `/api/health`) | Producción usa Next.js 16/Turbopack; el snapshot local usa Next 14.2.18 | Commit desplegado / logs de Render |

**Ninguna de estas hipótesis cambia la causa principal**: el latido de 10 minutos es condición suficiente para impedir el reposo mientras haya una pestaña abierta, y es la única explicación encontrada en el código para un consumo cercano a 24 h/día.

---

## 5. Hallazgos descartados

| Hipótesis | Veredicto | Motivo |
|---|---|---|
| Cron jobs o `@Cron` en el backend | **DESCARTADO** | No hay `ScheduleModule`, ni `@Cron`, ni `node-cron` en `restored/backend` |
| Auto-ping o bucle infinito en el servidor | **DESCARTADO** | Sin `setInterval`/`while` de red en el backend |
| Service worker con *periodic sync* | **DESCARTADO** | `public/sw.js` sin periodic sync; además excluye `/api/`, `/admin/`, `/pos/` |
| Bots, escáneres o ataque | **DESCARTADO** (sin evidencia) | No se observó tráfico anómalo; el patrón es periódico y exacto |
| Minutos de build contabilizados como horas de instancia | **DESCARTADO** | Son cuotas distintas; el workflow solo corre en push a `backend/**` |
| Polling de notificaciones del admin (60 s) como causa principal | **DESCARTADO** | `notifications.tsx` consulta `/api/admin/notifications` **en Vercel**, no en Render, y solo con el panel abierto |
| Timers de UI (`FlashSaleCountdown` 1 s, `LiveViewers` 30 s) | **DESCARTADO** | Puramente locales, sin red |
| Despliegues repetidos | **DESCARTADO** | El workflow no tiene cron ni se dispara fuera de `backend/**` |

---

## 6. Archivos y líneas relevantes

| Archivo | Línea / elemento | Relevancia |
|---|---|---|
| `restored/backend/render.yaml` | `healthCheckPath: /api/products` | Sonda pesada cada pocos segundos |
| `restored/backend/Dockerfile` | `CMD` con `prisma db push \|\| true; prisma db seed \|\| true` | Arranque lento y no determinista |
| `restored/backend/src/products/products.controller.ts` | `@Get() findAll()` | Endpoint usado como health check |
| `restored/backend/src/products/products.service.ts` | `findAll()` líneas ~9–30 | `include` de categoría, marca, variantes y lotes |
| `restored/backend/src/app.module.ts` | imports | Sin `ScheduleModule` (no hay cron) |
| `restored/backend/src/main.ts` | `bootstrap()`, `setGlobalPrefix('api')` | Confirma prefijo `/api` y ausencia de ruta `health` |
| `restored/backend/prisma/seed.ts` | `upsert` | Idempotente, pero no debe ejecutarse por arranque |
| `restored/.github/workflows/deploy-render.yml` | `on: push` | Sin cron; no explica consumo |
| Producción: `/_next/static/immutable/chunks/36j7e66r7nc24.js` | `setInterval(ping, 6e5)` | **Latido en la tienda pública** |
| Producción: `/_next/static/immutable/chunks/0as_dlil33q_w.js` | `setInterval(a, 6e5)` | **Latido en `/login`, `/admin`, `/pos`** |

> El latido **no existe en el snapshot local**: el código desplegado en Vercel es más nuevo que el repositorio local. Por eso se documenta por chunk de producción y no por archivo fuente. **Commit desplegado: NO VERIFICADO.**

---

## 7. Evidencias del panel y de los logs

**No se dispone de acceso al panel de Render** (no hay `RENDER_API_KEY` en el entorno; no se intentó obtenerla). Por lo tanto:

- Horas por servicio: **NO VERIFICADO**.
- Reinicios y eventos: **NO VERIFICADO**.
- Logs de `/api/health` y `/api/products`: **NO VERIFICADO**.
- Fecha exacta del ciclo de facturación: **NO VERIFICADO**.

Todo lo anterior es verificable en el código, el DNS y el bundle de producción, que sí se inspeccionaron. Las cifras de la sección 8 son **estimaciones derivadas de los datos de la alerta**, no lecturas del panel.

---

## 8. Estimación cuantitativa

| Métrica | Valor |
|---|---|
| Consumo reportado | 618 h |
| Cuota | 750 h |
| % consumido | **82,4 %** |
| Saldo restante | 132 h (17,6 %) |
| 618 h en días de ejecución continua | **25,75 días** |
| Consumo medio estimado (si la alerta llegó ~día 26) | **~23,8 h/día** |
| Proyección a 30 días a ese ritmo | ~714 h (95 %) |
| Proyección a 31 días a ese ritmo | ~738 h (98 %) |
| Tiempo hasta agotar 132 h a 24 h/día | **~5,5 días** |
| Consumo de 1 instancia 24/7, mes de 30 días | 720 h |
| Consumo de 1 instancia 24/7, mes de 31 días | 744 h |
| Margen real de la cuota | **6 h en un mes de 31 días** |

**Lectura:** el patrón observado **no corresponde a tráfico normal**. Corresponde a una instancia que no entra en reposo. Un servicio gratuito de Render está diseñado para dormirse; mantenerlo despierto consume la cuota completa por sí solo y no deja espacio para nada más.

**Limitaciones:** no se conoce la fecha de inicio del ciclo ni si existen otros servicios gratuitos en el workspace; ambas cosas pueden desplazar las cifras varios puntos porcentuales.

---

## 9. Plan de corrección (propuesta — **no implementado**)

Ordenado por impacto, costo y riesgo.

### A1 — Eliminar el latido del frontend · impacto alto · costo trivial · riesgo bajo
Quitar el bloque `ping` / `setInterval(ping, 6e5)` / `visibilitychange` de las cuatro superficies y volver a desplegar en Vercel.
- No aporta nada: apunta a un endpoint inexistente y su único efecto es impedir el reposo.
- Permite que la instancia se duerma tras 15 min, bajando el consumo a las horas de uso real.
- **Decisión previa requerida:** aceptar cold start en la primera visita (ver riesgos).

### A2 — Sustituir el health check pesado · impacto medio-alto · costo trivial · riesgo medio
Quitar `healthCheckPath: /api/products` (Render usa por defecto una sonda TCP, sin consultar la aplicación) o crear un `/api/health` real que no toque la base.
- Elimina la consulta más costosa de la API ejecutándose cada pocos segundos.
- Reduce CPU y el riesgo de reinicio cuando Neon está suspendida.

### A3 — Arranque determinista · impacto medio · costo bajo · riesgo medio-alto
Sacar `prisma db push` y `prisma db seed` del `CMD`; migrar con `prisma migrate deploy` en un paso explícito y sembrar solo manualmente.
- Acorta el cold start y elimina el riesgo de reponer datos de demo sobre datos reales.
- **Requiere** que las migraciones estén versionadas antes del cambio (hoy el snapshot usa `db push`, sin carpeta de migraciones).

### A4 — Decidir la arquitectura · impacto alto · costo variable · riesgo bajo (decisión)
Un servicio gratuito que se duerme es incompatible con un POS que debe responder al instante. Tres opciones:
1. **Gratis con cold start** (recomendada como paso inmediato): A1 + A2 + A3 y una pantalla de "iniciando servidor…" en el POS.
2. **Instancia paga** (~US$7/mes Starter): sin reposo, sin consumir el pool gratuito, POS siempre disponible. Es el costo real de tener un POS en la nube.
3. **Mover la API a funciones de Vercel**: elimina Render, pero es una migración mayor.

### A5 — Latido bajo demanda, no permanente · opcional
Si se quiere calentar la API, hacerlo **al pulsar "Abrir caja" / "Iniciar sesión"**, no en bucle cada 10 min. Un solo `fetch` por acción del usuario, no un temporizador.

### A6 — Auditoría del workspace · preventivo
Revisar si hay otros servicios gratuitos consumiendo la cuota compartida y eliminarlos o consolidarlos.

### A7 — Vigilancia
Registrar el consumo semanal de Render durante un ciclo completo para confirmar la caída tras A1.

---

## 10. Pruebas para verificar cada corrección

| Corrección | Prueba | Resultado esperado |
|---|---|---|
| A1 | Abrir la tienda, `/login`, `/admin`, `/pos` y dejarlas 30 min | **Cero** peticiones a `/api/health` en los logs de Render |
| A1 | Dejar todo cerrado 20 min | Evento "suspended" en Render; el gráfico de horas se aplana |
| A1 | Medir el consumo diario 3 días | Caída proporcional a las horas realmente usadas |
| A2 | Ver Events tras el deploy | Health checks OK, sin reinicios; `/api/products` deja de aparecer cada pocos segundos |
| A2 | Con Neon suspendida, provocar un health check | La sonda no falla por culpa de la base |
| A3 | Arranque en frío cronometrado | Tiempo notablemente menor; datos intactos; sin efectos del seed |
| A4 | Prueba de flujo completo | Ver sección 11 |

---

## 11. Riesgos por área

**Web (tienda)**
- Tras A1, la primera visita después del reposo paga el cold start (30–60 s, más si A3 no está hecho). Sin aviso visual, parece que el sitio está caído y se pierde la venta. Mitigación: estado de carga explícito y, si es posible, renderizado de catálogo estático en Vercel.

**POS**
- Es el punto crítico. Un cobro en mostrador no admite 40 s de espera. Si el POS se usa a diario, A1 sin A4.2 degrada la operación. Decidir esto **antes** de desplegar A1.

**Inventario**
- A2 y A3 no tocan datos. A3 sí implica dejar de ejecutar el seed en cada arranque: verificar que ningún dato dependa de ese efecto. El seed usa `upsert`, por lo que hoy **puede estar reescribiendo valores sembrados sobre datos reales** en cada reinicio; suspenderlo es más seguro, no menos.

**Pedidos**
- Sin impacto esperado: el latido no participa en la creación de pedidos (`/orders/public`). Verificar de todos modos el flujo completo tras A1: login → abrir caja → venta POS → movimiento de caja → pedido público → cambio de estado en admin → descuento de stock.

**Datos y secretos**
- Ninguna acción propuesta requiere tocar credenciales. No se leyó ni se imprimió ningún valor de `.env`.

---

## 12. Las tres acciones prioritarias

1. **Eliminar el latido de 10 minutos** de la tienda, `/login`, `/admin` y `/pos` (chunks `36j7e66r7nc24.js` y `0as_dlil33q_w.js` en el código fuente actual). Es gratis, no rompe nada y ataca la causa directa.
2. **Cambiar el health check** de `/api/products` a sonda TCP o a un `/api/health` liviano que no consulte la base.
3. **Sacar `prisma db push` y `prisma db seed` del arranque** y migrar de forma explícita, para acortar el cold start y dejar de reescribir datos en cada reinicio.

---

## 13. Datos que debes obtener manualmente de Render

Sin estos datos no se puede cerrar el desglose exacto (todo lo demás ya está verificado en el código).

**Render → Billing → Monthly Included Usage**
- [ ] Horas consumidas del ciclo y **fecha exacta de inicio y fin del ciclo**.
- [ ] Desglose por servicio: ¿todo el consumo es de `nutrifit-api` o hay otros servicios gratuitos?
- [ ] Captura del gráfico de consumo diario (para ver si la curva es plana a 24 h/día).

**Render → `nutrifit-api` → Settings**
- [ ] Plan real: **Free** o **Starter**.
- [ ] Número de instancias.
- [ ] `Health Check Path` configurado.
- [ ] Auto-Deploy activado o no.

**Render → `nutrifit-api` → Metrics** (últimos 7 días)
- [ ] Gráfico de *instance hours* / CPU / memoria.
- [ ] ¿La línea es plana o hay valles de reposo?

**Render → `nutrifit-api` → Logs**
- [ ] Filtrar `api/health`: frecuencia real y **User-Agent**.
  - User-Agent de navegador → pestaña abierta (POS/admin).
  - User-Agent tipo `UptimeRobot`, `BetterStack`, `cron-job.org` → monitor externo.
- [ ] Filtrar `api/products`: frecuencia (debería ser altísima por el health check).
- [ ] Códigos de estado: ¿predominan 404 en `/api/health`?

**Render → `nutrifit-api` → Events**
- [ ] Marcas de tiempo de `suspended` / `resumed`: **prueba definitiva** de si la instancia durmió alguna vez.
- [ ] Reinicios y despliegues del ciclo.

**Vercel**
- [ ] Project → Cron Jobs (confirmar que no hay ninguno).
- [ ] Variables de entorno del proyecto: **solo los nombres**, para ver si `NEXT_PUBLIC_API_URL` apunta a Render.
- [ ] Commit desplegado actualmente (para ubicar el latido en el código fuente).

**Externo**
- [ ] Revisar si existe algún monitor: UptimeRobot, BetterStack, cron-job.org, Freshping, Pingdom.

Con las capturas de Billing y de Events se puede confirmar o descartar P1–P4 y dar por cerrada la auditoría con cifras exactas.

---

## 14. Addendum — Evidencia del panel de Render (captura del 26-10-2026)

**Fuente:** Render → `nutrifit-api` → Metrics, filtro "Last 12 hours", resolución fija de 1 punto por hora. Ventana visible: 12:20 a 23:33.

### 14.1 Nuevos hechos confirmados

| Hecho | Evidencia |
|---|---|
| **El plan es Free** | El bloque *Application Metrics* muestra "Upgrade to any paid compute plan to view application metrics". No hay plan pagado. |
| **Sin observabilidad de CPU/RAM** | Memoria y CPU están bloqueadas tras el muro de pago. Límites visibles de la capa gratuita: **512 MB** de memoria, **0.15 CPU**. CPU y memoria quedan **NO VERIFICADOS** y no son obtenibles sin pagar. |
| **El tráfico es insignificante** | *Outbound Bandwidth*: **96 MB en todo el mes**, con picos ≤ **0,08 MB/hora**. Un e-commerce con catálogo real movería GB, no MB. |
| **Se sirve poco más que sondas** | La ventana de 12 h suma ~0,4–0,5 MB. El grueso de los 96 MB del mes no proviene de este tramo. |
| **Hay 4 eventos en 12 horas** | El filtro indica `Events 4`. Demasiados para un servicio tranquilo: candidatos a `suspended` / `resumed` / reinicio / deploy. |

### 14.2 Corrección al informe: el health check pesado

La evidencia **descarta en la práctica** la hipótesis 3.4 (health check contra `/api/products`).

Cálculo: si esa ruta se sondeara cada pocos segundos devolviendo el catálogo completo con variantes y lotes (~40 KB), el tráfico sería del orden de **20 GB/mes** (1 req/5 s × 40 KB × 720 h). Incluso a 1 req/min serían ~1,7 GB/mes. Lo observado es **96 MB**: entre 20 y 200 veces menos.

**Conclusión:** en producción la sonda es casi con seguridad **TCP** (la predeterminada, sin cuerpo de respuesta), o `healthCheckPath` no está aplicado en el servicio real. El `render.yaml` del repositorio no refleja la configuración viva. Se degrada de "causa confirmada" a **DESCARTADO como causa de consumo**, y queda como higiene de configuración pendiente de verificar en Settings.

### 14.3 Lo que la captura NO puede probar

- **No demuestra que la instancia nunca durmió.** Con 1 punto por hora, un reposo de 15 minutos es **invisible**: no genera hueco, solo un punto más bajo. La línea continua es compatible tanto con ejecución permanente como con micro-reposos.
- **No cubre la noche.** La ventana va de 12:20 a 23:33. Fuera de ese tramo no hay evidencia.
- **No explica los 96 MB.** A ~0,04 MB/h, 12 h dan ~0,5 MB; extrapolado a 26 días son ~25 MB, no 96. El resto del mes tuvo periodos más cargados (pruebas, deploys, promociones) o la ventana no es representativa. Sigue siendo un volumen trivial en cualquier caso.
- **No identifica el origen del tráfico.** Sin logs ni User-Agent no se distingue pestaña abierta de monitor externo.
- **Dos series en el gráfico.** Se ven dos líneas (gris suave y verde oscilante) bajo un solo título. Conviene confirmar si son dos instancias, dos métricas o serie y promedio: **dos instancias duplicarían las horas**.

### 14.4 Impacto en el diagnóstico

La causa principal **no cambia**: el latido de 10 minutos sigue siendo el único mecanismo verificado capaz de impedir el reposo. Lo que esta captura añade es la confirmación del **perfil del desperdicio**: una instancia gratuita encendida, con CPU y memoria invisibles, moviendo **96 MB al mes** y quemando la cuota completa.

La pregunta abierta ya no es *"¿por qué se enciende?"* sino ***"¿duerme alguna vez?"***. Eso se responde con **Events** (marcas `suspended`/`resumed`) y con el rango largo de Metrics, no con esta ventana de 12 horas.

## 15. Addendum 2 — El cron de keep-alive (hallazgo inicial)

> **ATENCIÓN: la conclusión causal de esta sección quedó CORREGIDA en §16.** El cron existe y se detuvo, pero **no corría cada 10 minutos** y **no puede explicar por sí solo las 618 h**. Se conserva el texto original para trazabilidad.

**Fuente:** repo `waldosiclla14-bit/nutrifit-web` (público), commit `3617079` = **el deploy Live** (`manual`/`API`, 6 días). Read-only vía API de GitHub.

### 15.1 El archivo que causa todo

`.github/workflows/keep-alive.yml` — presente en `main` y **activo ahora mismo**:

```yaml
name: Keep-alive API (Render)

on:
  schedule:
    - cron: '*/10 * * * *'        # cada 10 minutos, 24/7, todos los días
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping a la API para mantener Render despierto
        run: |
          code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 \
            "https://nutrifit-api-635n.onrender.com/api/products")
```

- **`*/10 * * * *` = cada 10 minutos, sin horario, sin condiciones.**
- Golpea **directamente** `nutrifit-api-635n.onrender.com`, el host de Render, sin pasar por Vercel ni por ningún navegador.
- **10 min < 15 min** de umbral de reposo → **la instancia no puede dormir nunca**.
- `144 pings/día × 30 días = 4.320 pings/mes`.
- Corre en un repo público → minutos de GitHub Actions **gratis e ilimitados**: el desperdicio es 100 % invisible en la factura de GitHub.

**Origen (commit `c5c6159`, 28-08-2026):**
> `ci: keep-alive de la API de Render (ping cada 10 min) para evitar cold start que causa fallos en movil`

Lleva **dos meses** funcionando. Se creó para evitar el cold start de 50 s; es decir, se resolvió el síntoma y se creó el gasto.

### 15.2 Reconciliación cuantitativa exacta

La cifra de **96 MB** de la captura de Metrics deja de ser un misterio:

| Dato | Cálculo | Resultado |
|---|---|---|
| Pings al mes | 6 × 24 × 30 | **4.320** |
| Payload por ping | 96 MB ÷ 4.320 | **≈ 22 KB** |
| Respuesta de `/api/products` | catálogo JSON con variantes y lotes | **≈ 22 KB** ✔ |

**Coincide.** El 96 MB mensual es, casi en su totalidad, el cron descargando el catálogo completo **4.320 veces al mes**. Esto además explica que la sonda de Render sea TCP (no consume ancho de banda) y **descarta definitivamente** la hipótesis 3.4 del health check pesado como causa de consumo.

### 15.3 Reconciliación de las horas

| Dato | Valor |
|---|---|
| 618 h ÷ 24 | **25,75 días** |
| Ciclo iniciado el 1 de octubre → 26 de octubre | **25–26 días** |
| Diferencia | Ninguna relevante |

El servicio estuvo encendido **de forma continua desde el inicio del ciclo**. No hubo reposo: el cron lo impide por diseño.

### 15.4 Segundo keep-alive, redundante

El latido del frontend (`setInterval(ping, 6e5)` en tienda, `/login`, `/admin` y `/pos`) fue añadido antes, en el commit `0f0d563` del **12-08-2026**:
> `fix(admin): per-tab lazy loading + keep-alive ping to fix slow admin (Neon pause)`

Son **dos mecanismos independientes** que persiguen lo mismo: impedir que Render duerma. El cron es el determinante, porque actúa 24/7 sin depender de que haya una pestaña abierta.

### 15.5 Descartado también: los 30 deploys

La captura de Deploys muestra **30 despliegues** en ~1 mes, varios **duplicados** (el mismo commit desplegado dos veces, `Manual` + `API`: `990d58d`, `fc6788d`, `47b55da`, `d1cfaef`, `7b25be3`).

- Duración media: ~2 m 45 s → **~80 minutos de build al mes**.
- Eso consume la cuota de **pipeline minutes**, que es **distinta** de las 750 h de instancia.
- **No es la causa.** Sí es churn: cada deploy reinicia el contenedor y dispara migraciones con reintentos contra una base dormida (`Neon dormido P1002`).

### 15.6 Nota de seguridad (repositorio público)

`waldosiclla14-bit/nutrifit-web` es **público**: el código, el esquema Prisma y todos los workflows son visibles.

- Revisión de los 20 workflows: **no se encontró fuga de valores**. Los `echo` exponen nombres, longitudes (`TOKEN_OK len=…`) y códigos HTTP, no credenciales. `db-push.yml` obtiene `DATABASE_URL` y solo imprime su longitud. Correcto.
- Sí hay **20 workflows**, la mayoría de diagnóstico desechable (`render-repro`, `render-diff`, `render-cli-logs`, `render-fetch-files`, `render-spec-secrets`, `render-final-fix`…). `render-final-fix.yml` **escribe** un `JWT_SECRET` vía API: rota sesiones y no debería quedar en un repo público.
- Recomendación: borrar los workflows de diagnóstico y conservar solo `ci.yml`, `deploy-render.yml` y `db-push.yml` bajo `workflow_dispatch` controlado.

### 15.7 Plan de corrección revisado

| # | Acción | Impacto | Costo | Riesgo |
|---|---|---|---|---|
| **A1** | **Borrar `keep-alive.yml`** | **Máximo: corta la causa raíz** | $0, 2 minutos | Bajo (vuelve el cold start) |
| **A2** | Quitar el latido del frontend (4 superficies) | Medio: elimina el keep-alive de horario comercial | $0 | Bajo |
| **A3** | Sacar `db push` / `seed` / reintentos de migración del arranque | Alto: ataca **por qué** se creó el keep-alive | Bajo | Medio |
| **A4** | Decidir POS: gratis con cold start vs Starter ~US$7/mes | Alto | $0 / $7 | Decisión del negocio |
| **A5** | Limpiar workflows de diagnóstico | Medio (seguridad e higiene) | $0 | Bajo |

**A1 es la corrección real.** A3 es la que evita que alguien vuelva a crear un keep-alive en tres meses.

---

## 16. Addendum 3 — CORRECCIÓN: el cron no corría cada 10 minutos

### 16.1 Qué se hizo

**Acción ejecutada:** `gh workflow disable keep-alive.yml` sobre `waldosiclla14-bit/nutrifit-web`.
**Estado verificado:** `disabled_manually`. El cron está detenido.
**No se borró el archivo:** GitHub exige el scope `workflow` para modificar contenido dentro de `.github/workflows/`, y el token disponible solo tiene `repo` (el DELETE devuelve 404). Deshabilitar consigue el mismo efecto y es reversible con `gh workflow enable`.

### 16.2 El dato que cambia la conclusión

| Dato | Valor |
|---|---|
| Ejecuciones totales del cron desde 2026-08-28 | **1.000** |
| Días transcurridos | **60** |
| Media real | **16,7 ejecuciones/día → una cada ~1 h 26 min** |
| Intervalo entre las dos últimas ejecuciones | **2 h 54 min** |
| Intervalo entre las dos anteriores | **3 h 51 min** |

**GitHub estrangula los workflows programados.** De 144 ejecuciones diarias teóricas (`*/10`) se ejecutaron ~17: **el 88 % nunca corrió**. GitHub documenta que los `schedule` son *best-effort* y se descartan bajo carga, y aquí ocurrió de forma sistemática.

**Consecuencia directa:** con huecos de 1,5 a 4 horas, el cron **no puede impedir el reposo de 15 minutos**. Enciende la instancia, la instancia se vuelve a dormir, y el siguiente ping llega mucho después.

### 16.3 La aritmética que desmonta mi hipótesis anterior

Medición real de `/api/products` (una petición, HTTP 200): **49.707 bytes ≈ 48,5 KB**.

| Escenario | Peticiones/mes | Ancho de banda resultante |
|---|---|---|
| Mi hipótesis anterior (cada 10 min) | 4.320 | **210 MB** ✗ |
| Realidad (1.000 ejecuciones / 2 meses) | ~500 | **24 MB** ✔ |
| Observado en Metrics | — | **96 MB** |

Si el cron hubiera corrido cada 10 minutos, habría movido **210 MB**, más del doble de lo observado. **Los números siempre contradijeron mi hipótesis**; el error fue calcular el tamaño del payload a partir del consumo en lugar de medirlo. Corregido.

**Reparto real de los 96 MB:** ~24 MB del cron (500 pings × 48,5 KB) + ~72 MB de tráfico real (~1.500 peticiones al mes).

### 16.4 Entonces, ¿qué mantiene despierta la instancia?

La asimetría que me confundió es esta:

| Mecanismo | Cadencia | Peso en el ancho de banda | ¿Impide el reposo? |
|---|---|---|---|
| Cron de GitHub | ~cada 1,5 h (real) | **Alto**: 48,5 KB por ping | **No** (hueco > 15 min) |
| Latido del frontend | **10 min exactos** | **Casi nulo**: apunta a `/api/health`, que devuelve 404 (~cientos de bytes) | **Sí** |

El latido del frontend es **invisible en el ancho de banda** pero **exacto en el tiempo**. Es el único mecanismo verificado con la cadencia necesaria para mantener viva la instancia de forma indefinida, y se activa con solo tener abierta una pestaña de la tienda, `/login`, `/admin` o `/pos`.

Esto ilustra exactamente la distinción planteada al inicio de la auditoría: **las solicitudes que consumen ancho de banda no son las que consumen horas de instancia**, y viceversa.

### 16.5 Hipótesis vigente

1. **Latido del frontend cada 10 min** (mientras haya una pestaña abierta) — principal, cadencias compatibles con 23,8 h/día solo si una pestaña permanece abierta casi todo el día.
2. **Tráfico real** de la tienda que reduzca los huecos de inactividad por debajo de 15 min.
3. **Combinación de ambas** — la más probable.

Ninguna se puede confirmar sin **Render → Events** (marcas `suspended` / `resumed`). Ese es el dato decisivo y sigue pendiente.

### 16.6 Estado de las acciones

| # | Acción | Estado |
|---|---|---|
| **A1** | Detener el cron | ✅ **HECHO** — `disabled_manually` |
| A1b | Borrar el archivo | ❌ **Descartado por decisión del usuario (26-10-2026): se conserva, deshabilitado** |
| **A2** | Quitar el latido del frontend | ⬆️ **Ahora es la prioridad real** (no A1) |
| A3 | Arranque sin `db push`/`seed` | Pendiente |
| A4 | Decisión POS (gratis vs US$7) | Pendiente |

A1 se ejecutó igualmente porque el cron era **inútil en todo sentido**: 1.000 consultas pesadas al catálogo al mes para un mecanismo que ni siquiera lograba su objetivo. Pero **no era la causa de las 618 h**, y así debe quedar registrado.

---

## 17. Addendum 4 — Evidencia de Events (26-10-2026)

**Fuente:** Render → `nutrifit-api` → Events, filtro por defecto, **38 eventos**. Todos los visibles son de despliegue (`Deploy started` / `Deploy live`).

### 17.1 Lo que la captura sí demuestra

| Hecho | Evidencia |
|---|---|
| **Cero reinicios y cero caídas** | No hay eventos de `restart`, `OOM`, ni fallo de health check en todo el historial visible. |
| **Cero despliegues en los últimos 6 días** | El evento más reciente es del **20 de octubre, 11:12 AM** (`Deploy live for 3617079`). Del 20 al 26 no hubo actividad de despliegue. |
| **El consumo no viene de churn** | Los últimos 6 días, sin un solo deploy ni reinicio, siguen consumiendo. El gasto es **ejecución estable**, no inestabilidad. |
| **Despliegues duplicados confirmados** | El 16-10: `fc6788d` desplegado por **API** (9:08) y otra vez **Manual desde Dashboard** (9:13); `990d8bd` igual (9:26 API / 12:57 Manual), con rollback entre medio. |
| **~19 despliegues** | 38 eventos ÷ 2 (started + live) = 19. Coincide con lo visto en Deploys. |

**Consecuencia:** se **descarta la hipótesis de reinicios, OOM o bucles de arranque** como causa del consumo. La inestabilidad del `Dockerfile` (migraciones con reintentos contra la base dormida) **no está produciendo reinicios** en la práctica. Esto baja la urgencia de A3, aunque A3 sigue siendo lo que hará rápido el cold start.

### 17.2 Lo que la captura NO demuestra

**No se puede concluir que la instancia nunca durmió.** Ausencia de eventos `suspended`/`resumed` **no es prueba de ausencia de reposo**: Render no registra necesariamente cada spin-down rutinario como un evento. La lista solo contiene despliegues porque los despliegues *sí* son eventos.

Se mantiene la incógnita central: **¿la instancia duerme o no?**

### 17.3 El test definitivo: contar arranques en los Logs

Cada arranque del contenedor imprime, desde `main.ts`:

```
NutriFit API running on http://localhost:<PORT>/api
```

**Procedimiento:** Render → `nutrifit-api` → Logs → buscar `NutriFit API running`.

| Resultado | Interpretación | Consecuencia |
|---|---|---|
| Aparece solo cerca del 1, 6, 16 y 20 de octubre | **Nunca durmió.** La instancia estuvo encendida de forma continua. | El culpable es el latido del navegador con una pestaña abierta casi permanentemente. **A2 lo resuelve.** |
| Aparece decenas de veces al día | **Duerme y despierta constantemente.** | Ni el cron ni el latido la mantenían viva; hay que buscar otra fuente (tráfico real, otro pinger). |
| Aparece algunas veces al día | **Duerme por la noche** y despierta con el uso. | El consumo vendría del horario de apertura; A2 reduce el resto. |

### 17.4 Pregunta operativa que cierra el caso

¿El POS o el panel de admin **quedan abiertos de noche** en algún equipo?

- **Sí** → el latido del navegador mantiene la API despierta 24/7. A2 resuelve el 100 % del problema.
- **No** → el latido no explica las 618 h y el origen está en otra parte (pendiente: Billing y Logs).

---

## 18. Addendum 5 — Correcciones contra el código realmente desplegado

**Contexto:** el usuario no encontró `NutriFit API running` en los logs. La causa es que **el snapshot local `restored/` está desactualizado (~2 meses)**. Todo lo que sigue se verificó leyendo el commit `3617079` del repositorio desplegado, no la copia local.

### 18.1 Marcadores de arranque reales

`backend/src/main.ts` en producción **no tiene ningún `console.log`**. Usa el `Logger` de NestJS:

```ts
logger.log(`Listening on http://0.0.0.0:${port}/api (health: /api/health)`);
```

Y el `CMD` real del `Dockerfile` imprime, antes de arrancar la aplicación:

```sh
for i in 1 2 3 4 5; do
  echo "[boot] intento $i"
  node prisma/baseline.js && node prisma/ensure-enum.js && npx prisma migrate deploy \
    && { ok=1; break; } \
    || { echo "[boot] pre-arranque fallido, reintentando en 25s..."; sleep 25; }
done
```

**Marcadores válidos para contar arranques:**

| Cadena a buscar | Origen | Significado |
|---|---|---|
| `[boot]` | `Dockerfile` (shell) | **El contenedor arrancó.** Aparece una vez por arranque, hasta 5 si la base falla. |
| `Listening on` | `main.ts` (`Logger`) | La aplicación quedó escuchando. |

### 18.2 Tres afirmaciones anteriores que quedan CORREGIDAS

| § | Lo que dije | Realidad en producción |
|---|---|---|
| 3.3 | "`/api/health` no existe, el latido devuelve 404 y no aporta nada" | **Falso.** El propio log de arranque referencia `(health: /api/health)`: el endpoint **existe** y el latido recibe un 200. |
| 3.5 | "El arranque corre `prisma db push` + `prisma db seed` en cada boot" | **Falso.** Producción corre `baseline.js` + `ensure-enum.js` + **`prisma migrate deploy`**. Es la práctica correcta; no hay `db push` ni `seed`. |
| 17.3 | "Busca `NutriFit API running`" | **Cadena inexistente.** Buscar `[boot]` o `Listening on`. |

### 18.3 Lo que sí empeora el arranque (y sí es real)

El `CMD` envuelve las migraciones en **5 intentos con `sleep 25`**. Si la base está suspendida, el arranque puede perder **hasta ~2 minutos** solo esperando reintentos antes de levantar NestJS.

Eso explica por qué el cold start se percibe peor que los 50 s que anuncia Render, y explica por qué en agosto alguien decidió crear un keep-alive: **el problema era real, la solución fue la equivocada.**

### 18.4 El test que no depende del buscador

El buscador de logs puede no cubrir toda la retención. Alternativa robusta:

1. Poner el rango en el máximo disponible.
2. **Desplazarse hasta la línea más antigua** del visor.
3. Si la primera línea **no** es `[boot] intento 1`, entonces el contenedor no se ha reiniciado dentro de la ventana de retención.

Como un spin-down de Render **relanza el contenedor** al despertar, cada reposo deja un `[boot]` nuevo. Contar `[boot]` = contar despertares.

---

## 19. Addendum 6 — PRUEBA DEFINITIVA: la instancia no duerme

**Evidencia:** Render → `nutrifit-api` → Logs, rango **Last 7 days** (20–27 de octubre), búsqueda `boot`. Resultado: **4 líneas en total**, todas del **20 de octubre**.

```
11:10:26 AM  [96nkk]  [boot] intento 1
11:10:49 AM  [96nkk]  [Nest] ... LOG [Bootstrap] Startup: NODE_ENV=(unset) PORT=10000 DATABASE_URL=present JWT_SECRET=present
11:10:50 AM  [96nkk]  [Nest] ... LOG [RouterExplorer] Mapped {/api/auth/bootstrap, POST} route +1ms
11:12:25 AM  [96nkk]  [Nest] ... LOG [Bootstrap] Listening on http://0.0.0.0:10000/api (health: /api/health)
```

### 19.1 Conclusión

**Un solo arranque en 7 días, y coincide exactamente con el deploy del 20 de octubre** (`Deploy live` a las 11:12 AM). Desde entonces, **cero arranques**.

Como un spin-down de Render relanza el contenedor al despertar, **cada reposo dejaría un `[boot]` nuevo**. No hay ninguno en 7 días.

> **CONFIRMADO: la instancia no ha dormido ni una vez en los últimos 7 días. Corre 24/7.**

Esto explica las 618 h sin necesidad de más hipótesis: 7 días = 168 h encendidas de 168 posibles. Extrapolado al ciclo completo, ~744 h de 750.

### 19.2 El cron queda descartado como causa del keep-alive

El cron disparaba cada ~1 h 26 min, con huecos observados de hasta 3 h 51 min. Con un umbral de reposo de 15 min, **sus huecos habrían producido decenas de `[boot]`**. No hay ninguno.

**Prueba aritmética:** si el cron fuera el que mantiene viva la instancia, en 7 días habría ~117 ejecuciones y, con huecos de 1,5 h, la instancia habría dormido y despertado decenas de veces. Cero `[boot]` lo descarta de forma definitiva.

### 19.3 El único mecanismo con la cadencia correcta

| Mecanismo | Cadencia | ¿Puede evitar el reposo 24/7? |
|---|---|---|
| Cron de GitHub | ~1,5 h (real) | **No** — descartado por evidencia |
| **Latido del frontend** | **10 min exactos**, con throttle de 5 min | **Sí**, si hay una pestaña abierta de forma permanente |
| Tráfico real | irregular | Solo si hubiera pedidos cada <15 min, día y noche |

El latido del navegador es el **único mecanismo conocido con la cadencia necesaria**. Su existencia está verificada en los bundles de producción; lo que falta es confirmar la condición operativa: **que exista una pestaña abierta casi todo el tiempo**.

### 19.4 Cold start real medido: 1 min 59 s

| Tramo | Tiempo |
|---|---|
| `[boot] intento 1` → `Startup` (baseline + ensure-enum + migrate deploy) | **23 s** |
| `Startup` → `Listening on ...` | **96 s** |
| **Total arranque → aplicación escuchando** | **1 min 59 s** |

Render promete "50 segundos o más". La realidad medida es **casi 2 minutos**, y hay un tramo de **96 segundos entre el mapeo de rutas y el `listen`** que no está explicado por la base de datos. Merece revisión aparte: es el componente más caro del cold start y no depende de la migración.

**Consecuencia para el POS:** abrir caja tras un reposo costaría ~2 minutos. Ese es el número real que decide entre A2 y los US$7.

### 19.5 Estado del diagnóstico

| Hipótesis | Estado |
|---|---|
| Consumo por tráfico de clientes | **DESCARTADO** — 96 MB/mes, ~3 peticiones/hora |
| Consumo por bots o ataques | **DESCARTADO** — sin evidencia |
| Consumo por reinicios o churn | **DESCARTADO** — cero reinicios en 7 días |
| Consumo por deploys | **DESCARTADO** — cero deploys en 6 días |
| Cron de GitHub como keep-alive | **DESCARTADO por evidencia** (§19.2) |
| **Instancia permanentemente despierta** | ✅ **CONFIRMADO** (§19.1) |
| **Latido del navegador como mecanismo** | 🟡 **Principal candidato** — única cadencia compatible; falta confirmar la pestaña abierta |
| Origen de los 96 MB | ✅ Explicado: ~24 MB cron + ~72 MB tráfico real |

---

## 20. Addendum 7 — Fuente del latido, Vercel y exposición de Swagger

Verificado contra el commit `3617079` (390 archivos del repo).

### 20.1 El latido, localizado en el código fuente

`src/lib/api.ts`, **líneas 293–323**, a nivel de módulo (se ejecuta al importar `api.ts`, en cualquier página):

```ts
// ── Keep-alive ping to prevent Render cold starts ─────────────────────────────
// Pings /api/health every 10 minutes to keep the free-tier instance awake.
if (typeof window !== 'undefined') {
  const KEEPALIVE_INTERVAL = 10 * 60 * 1000;
  const MIN_GAP = 5 * 60 * 1000;
  let lastPing = 0;
  const ping = () => { ... fetch(`${API_BASE}/api/health`, ...) ... };
  ping();
  setInterval(ping, KEEPALIVE_INTERVAL);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') ping();
  });
}
```

**El propio comentario lo declara:** *"to keep the free-tier instance awake"*. No es un health check de la aplicación: es un mecanismo para impedir el reposo. **Es el parche A2 completo: 31 líneas a borrar.**

### 20.2 Vercel: sin cron, pero con endpoints para monitores

- `vercel.json` = **`{}`** → **no hay Vercel Cron Jobs**. Hipótesis descartada.
- Existen dos endpoints creados explícitamente para ser pingueados desde fuera:

| Endpoint | Dónde | Qué hace |
|---|---|---|
| `/api/keep-alive` | Vercel (`src/app/api/keep-alive/route.ts`) | Proxy a Render `/api/health`, devuelve `elapsed` |
| `/api/ping` | Render (`backend/src/ping/ping.controller.ts`) | `SELECT 1` contra la base |

Si no hay una pestaña abierta de noche, **un monitor externo apuntando a cualquiera de estos dos es el sospechoso principal**, y explicaría el 24/7 sin ninguna pestaña.

**Cómo comprobarlo:** Vercel → proyecto → Logs / Observability → filtrar por `/api/keep-alive`. Si aparece invocado cada pocos minutos, ahí está el pinger.

### 20.3 HALLAZGO DE SEGURIDAD: Swagger público en producción

El log de arranque dice `NODE_ENV=(unset)`. Consecuencia directa en `main.ts`:

```ts
if (process.env.NODE_ENV !== 'production') {
  SwaggerModule.setup('api/docs', app, document);
}
```

Sin `NODE_ENV`, la condición es **verdadera** y Swagger se monta. Verificado:

```
GET https://api.nutrifitsuplementos.cl/api/docs  →  HTTP 200
```

**La documentación completa de la API está expuesta públicamente**: todos los endpoints, esquemas, modelos y requisitos de autenticación. Cualquiera puede enumerar la superficie de ataque del ERP.

Además, `SwaggerModule.createDocument()` se ejecuta **incondicionalmente** (fuera del `if`), así que el costo de generar el documento se paga en cada arranque aunque no se monte la UI. **Corrección (§22):** ese costo es mínimo — ocurre *antes* del mapeo de rutas, dentro del segundo que separa `Startup` de la primera línea `Mapped`. No es parte de los 96 s.

**Acción propuesta (A3b):**
1. Definir `NODE_ENV=production` en Render → Settings → Environment.
2. Mover `createDocument` dentro del `if` para no generarlo en producción.

Riesgo: `NODE_ENV=production` puede alterar comportamientos que dependen de esa variable (cookies `secure`, logging, validaciones). Hay que verificar login y POS después.

### 20.4 Estado consolidado

| Hallazgo | Estado |
|---|---|
| Instancia no duerme (7 días sin `[boot]`) | ✅ CONFIRMADO |
| Latido del navegador | ✅ LOCALIZADO (`api.ts:293–323`) |
| Cron de GitHub | ✅ DESHABILITADO (no era la causa) |
| Vercel Cron | ✅ DESCARTADO (`vercel.json = {}`) |
| Swagger público | ⚠️ **CONFIRMADO** — HTTP 200 |
| `NODE_ENV` sin definir | ⚠️ CONFIRMADO por el log de arranque |
| Monitor externo | 🟡 Pendiente: logs de Vercel de `/api/keep-alive` |
| Cold start | ✅ Medido: 1 min 59 s |

---

## 21. A2 APLICADO — latido eliminado

**Fecha:** 27-10-2026
**Commit:** `16c2d00c4b9a6f9abbff7b04e9767e73be7f39f7`
**Archivo:** `src/lib/api.ts` → de **324 a 292 líneas**
**Mensaje:** `chore(perf): eliminar keep-alive del frontend que impedia el spin-down de Render`

### 21.1 Qué se eliminó exactamente

Líneas **292–323** (32 líneas), todo el bloque:

```ts
// ── Keep-alive ping to prevent Render cold starts ─────
// Pings /api/health every 10 minutes to keep the free-tier instance awake.
if (typeof window !== 'undefined') {
  const KEEPALIVE_INTERVAL = 10 * 60 * 1000;
  const MIN_GAP = 5 * 60 * 1000;
  let lastPing = 0;
  const ping = () => { ... fetch(`${API_BASE}/api/health`, ...) ... };
  ping();
  setInterval(ping, KEEPALIVE_INTERVAL);
  document.addEventListener('visibilitychange', () => { ... });
}
```

Borrado completo: no queda ni el `setInterval`, ni la llamada inmediata, ni el listener de `visibilitychange`.

### 21.2 Verificación

| Comprobación | Resultado |
|---|---|
| `KEEPALIVE_INTERVAL` en el archivo | **Ausente** |
| `/api/health` en el archivo | **Ausente** |
| Total de líneas | 324 → **292** |
| Estructura previa validada antes de escribir | Línea 293 = comentario del bloque; línea 323 = `}` de cierre |
| Despliegue de Vercel | **✅ COMPLETADO** (ver §21.6) |
| Redeploy de Render | **No se dispara** — `deploy-render.yml` solo escucha `backend/**` |

### 21.3 Protocolo de verificación (pendiente de ejecutar)

1. Esperar a que Vercel termine el deploy y confirmar que el bundle ya no contiene `/api/health`.
2. **Cerrar todas las pestañas** de la tienda, `/login`, `/admin` y `/pos`.
3. Esperar **20 minutos** sin abrir nada.
4. Render → Logs → buscar `[boot]`.
   - **Aparece un `[boot]` nuevo** → el latido era la causa; la instancia ya duerme. ✔
   - **No aparece ninguno** → hay un pinger externo fuera del código; seguir investigando.
5. Render → Metrics: el consumo de horas debe dejar de ser plano a 24 h/día.

### 21.4 Reversión

`git revert 16c2d00` o restaurar las 32 líneas. Sin migraciones, sin cambios de esquema, sin impacto en datos.

### 21.5 Efecto esperado

| Aspecto | Antes | Después |
|---|---|---|
| Instancia con pestañas abiertas | Despierta siempre | Despierta solo con tráfico real |
| Instancia sin pestañas | Despierta (latido) | **Duerme a los 15 min** |
| Consumo mensual estimado | ~744 h | **horas de uso real** |
| Primer acceso tras reposo | instantáneo | **1 min 59 s** |

### 21.6 Despliegue verificado en producción

Verificación ejecutada sobre el sitio en vivo, con caché desactivada (`cache: no-store`), contando los chunks servidos por el edge de Vercel:

| Comprobación | `nutrifit-web-nu.vercel.app` | `nutrifitsuplementos.cl` |
|---|---|---|
| Chunks `<script src>` en el HTML | 17 | 17 |
| Chunks descargados e inspeccionados | 17 / 17 | — |
| Chunks que contienen `/api/health` | **0** | — |
| Chunk obsoleto `36j7e66r7nc24.js` presente | **NO** | **NO** |
| Estado de despliegue (GitHub Deployments API, contexto `Vercel`) | **`success`** | **`success`** |

**Conclusión:** el latido ya **no existe en el JavaScript que reciben los usuarios**. Ninguna de las 17 piezas descargadas contiene la cadena `/api/health`, que era el `fetch` del keep-alive. La verificación se hizo contra el artefacto servido, no contra el código fuente, por lo que descarta tanto un despliegue incompleto como una caché intermedia.

Un detalle relevante: en el check anterior el chunk viejo seguía sirviéndose. Eso confirma que la propagación del edge de Vercel tardó algunos minutos; ahora está completa.

### 21.7 Lo que falta para declarar A2 resuelto

El despliegue está hecho; el **efecto sobre Render aún no está medido**. Es importante no confundir las dos cosas:

| Afirmación | Estado |
|---|---|
| El latido desapareció del bundle en producción | ✅ CONFIRMADO (§21.6) |
| La instancia de Render deja de estar despierta | 🟡 **NO VERIFICADO** — requiere observar un `[boot]` nuevo |

**Protocolo (ejecución manual):**

1. **Cerrar todas las pestañas** de la tienda, `/login`, `/admin` y `/pos` — en todos los dispositivos y navegadores. Una sola pestaña abierta mantiene el ciclo de 10 min.
2. Esperar **20 minutos** sin abrir nada (15 min de umbral de reposo + margen).
3. Render → `nutrifit-api` → Logs → buscar `[boot]`.
4. Interpretar:

| Resultado | Lectura |
|---|---|
| Aparece un `[boot] intento 1` con hora posterior al cierre de pestañas | ✅ El latido era la causa. A2 resuelto |
| No aparece ningún `[boot]` nuevo | 🟡 Hay un pinger externo (Health Check Path de Render, monitor tipo UptimeRobot, o `/api/keep-alive`) |
| Aparecen varios `[boot]` seguidos | ⚠️ Arranque inestable — revisar la conexión a la base en el pre-arranque |

**Nota sobre la interpretación:** el `[boot]` del 20-10 a las 11:10 ya no sirve como referencia. Lo que se busca es un `[boot]` con hora **posterior al cierre de las pestañas**, posterior al 27-10. Si el visor de logs solo retiene 7 días, conviene capturar la evidencia en las primeras 24 h.

### 21.8 Segundo punto de verificación: Metrics

Render → Metrics → rango de 24 h. La gráfica de instancia activa debe mostrar, a partir del cierre de pestañas, **una caída a cero tras ~15 min**. Un patrón que siga plano en 24 h con las pestañas cerradas confirma que el origen es externo al navegador.

---

## 22. Addendum 8 — Causa de los 96 segundos: el seed de estaciones en cada arranque

Verificado contra el commit `3617079`. Esto responde la pregunta que había quedado abierta en §19.4.

### 22.1 El orden real del arranque de NestJS

`main.ts` (86 líneas) hace, en este orden:

```ts
const app = await NestFactory.create(AppModule, { bodyParser: false });  // línea 38
// ... urlencoded, helmet, cors, ValidationPipe, filtro global, setGlobalPrefix
const document = SwaggerModule.createDocument(app, config);              // línea 70
if (process.env.NODE_ENV !== 'production') SwaggerModule.setup(...);     // línea 72
await app.listen(port);                                                  // línea 76
```

En NestJS, `app.listen()` es quien dispara `init()`, y `init()` ejecuta en este orden:

1. `registerRouter()` → **aquí se imprimen las líneas `Mapped {ruta}`**
2. `callInitHook()` → **todos los `onModuleInit()` de los 6 providers**
3. `callBootstrapHook()` → `onApplicationBootstrap()`
4. bind del puerto → **aquí se imprime `Listening on ...`**

Los timestamps del 20-10 encajan exactamente con ese orden:

| Hora | Evento | Qué está corriendo |
|---|---|---|
| 11:10:49 | `Startup: NODE_ENV=(unset)...` | primera línea de `bootstrap()` |
| 11:10:50 | `Mapped {/api/auth/bootstrap, POST}` | `registerRouter()` |
| — | *(96 s sin logs)* | **`onModuleInit()` de los 6 providers** |
| 11:12:25 | `Listening on http://0.0.0.0:10000/api` | puerto abierto |

**Los 96 segundos están íntegramente dentro de los hooks `onModuleInit`.**

### 22.2 Qué corre en esos hooks

| Provider | Qué hace al arrancar | Coste |
|---|---|---|
| `PrismaService` | Solo un `logger.log('Prisma: modo lazy')` — **no** conecta | ~0 |
| **`DeliverySeedService`** | **143 `upsert` secuenciales, uno por estación de metro** | 🔴 **dominante** |
| `OrdersService` | Query `MAX(orderNumber)` + upsert del contador + `expireAbandonedOrders()` | ~3 consultas |
| `ProductsService` | `findMany` de variantes con stock reservado; sale temprano si no hay | ~1 consulta |
| `PurchasesService` | 2 × `CREATE TABLE IF NOT EXISTS` | ~2 consultas |
| `TodoistService` | **Llamada HTTPS a `api.todoist.com`** (`ensureProject`) | red externa |

`DeliverySeedService.onModuleInit()` se ejecuta **en cada arranque, sin condición**:

```ts
async onModuleInit() {
  await this.seedStations();      // 143 upserts secuenciales
  await this.seedSettings();
  await this.syncScheduleWindow();
}
```

Y `seedStations()` hace exactamente esto:

```ts
const existing = await this.prisma.metroStation.findMany({ ... });
for (const station of existing) { ...delete si no está en el seed... }
for (const station of METRO_STATIONS) {          // 143 estaciones
  await this.prisma.metroStation.upsert({ ... }); // ← un round trip por estación
}
```

El seed declara **143 estaciones en 7 líneas** (L1, L2, L3, L4, L4A, L5, L6), y cada `upsert` es una **ida y vuelta secuencial** a Neon. No hay batching, no hay `Promise.all`, no hay `createMany`.

### 22.3 La aritmética

```
96 s ÷ 143 upserts ≈ 0,67 s por round trip
```

Es un número perfectamente plausible: instancia gratuita de Render (0,1 CPU compartida) + Neon con *scale-to-zero* (el primer query paga el despertar del compute) + sin paralelismo. Con `Promise.all` el mismo trabajo costaría ~2 s.

**CONFIRMADO:** el código ejecuta 143 `upsert` secuenciales en cada arranque.
**PROBABLE (muy alto):** eso consume la práctica totalidad de los 96 s.
**Confirmation pendiente:** ver el log sin filtrar entre 11:10:50 y 11:12:25 y comprobar que `Metro stations synced: 143 upserted` aparece justo antes del `Listening on`.

### 22.4 El arranque completo, desglosado

| Fase | Tiempo | Causa | Arreglo |
|---|---|---|---|
| `[boot]` → `Startup` | **23 s** | `baseline.js` + `ensure-enum.js` + `migrate deploy` | A3 — sacar del `CMD` |
| `Startup` → `Mapped` | ~1 s | DI + Swagger `createDocument` | ninguno (ya es barato) |
| `Mapped` → `Listening` | **96 s** | **seed de 143 estaciones** | **A3.1 — batchear o saltar** |
| **Total** | **1 min 59 s** | | **~15–20 s** |

### 22.5 Corrección de una afirmación anterior

En §20.3 dije que `SwaggerModule.createDocument()` formaba parte de los 96 s. **Es falso.** Se ejecuta antes de `listen()`, o sea antes del mapeo de rutas, dentro del segundo que separa `Startup` de la primera línea `Mapped`. Su coste es despreciable y no explica nada del arranque.

`NODE_ENV=production` sigue siendo necesario (§20.3) — pero **por seguridad, no por rendimiento**. Cerrar el Swagger público no acorta el cold start.

### 22.6 Propuesta A3 — parche preparado, NO aplicado

**A3.1 · Batchear el seed de estaciones (el 80 % de la ganancia)**

Dos variantes, ambas de bajo riesgo:

| Variante | Cambio | Arranque |
|---|---|---|
| **Conservadora** | Guardar un `metro_seed_version` en `config`; si coincide, salir sin sincronizar | 143 round trips → **2** |
| **Agresiva** | Reemplazar el bucle por un único `INSERT ... ON CONFLICT DO NOTHING/UPDATE` | 143 → **1** |

La conservadora conserva la capacidad de actualizar el seed (se cambia la versión y sincroniza una vez). La agresiva es más rápida pero requiere construir el SQL a mano.

**A3.2 · `TodoistService.ensureProject()` fuera del arranque**

Es una llamada HTTPS externa dentro de `onModuleInit`. Si Todoist tarda o no responde, `listen()` espera. Moverla a *lazy* (primera invocación real) o envolverla en un timeout de 3 s.

**A3.3 · Migraciones fuera del `CMD`**

Hoy: `baseline.js && ensure-enum.js && migrate deploy` con 5 reintentos de `sleep 25`. Son 23 s en el mejor caso y **hasta 2 min** si la base falla. Alternativa: un paso de pre-deploy o ejecutarlas una sola vez por deploy en lugar de en cada arranque.

**A3.4 · Lo que NO hace falta tocar**

`PrismaService` ya está en modo lazy (bien hecho). `expireAbandonedOrders()` sale temprano si no hay pedidos. El `setInterval` de `auth.controller.ts` solo limpia un `Map` en memoria.

### 22.7 Impacto esperado

| Escenario | Cold start |
|---|---|
| Hoy | **1 min 59 s** |
| A3.1 solo | ~30 s |
| A3.1 + A3.2 + A3.3 | **~15–20 s** |

Con ~20 s, un reposo de Render deja de ser un problema operativo para el POS y A4 (los US$7 del plan Starter) se vuelve innecesario.

### 22.8 Verificación disponible antes de tocar código

Render → Logs → **quitar el filtro `[boot]`** → rango `Last 7 days` → ir al **20 de octubre, 11:10:50–11:12:25**. Deberían aparecer, en orden:

```
[DeliverySeedService] Syncing metro stations with seed data...
[PrismaService] Prisma: modo lazy (sin $connect en arranque)
...
[DeliverySeedService] Metro stations synced: 143 upserted, 0 removed
[DeliverySeedService] Delivery settings already seeded (11)
[DeliverySeedService] Delivery window synced: 08:00-22:00
[TodoistService] Todoist env: TOKEN=...
[Nest] LOG [Bootstrap] Listening on http://0.0.0.0:10000/api
```

Si `Syncing metro stations` está al principio de la ventana y `Metro stations synced` al final, la causa queda **CONFIRMADA con evidencia** y no por deducción.

---

## 23. Addendum 9 — A3.1, A3.2 y A3b APLICADOS

**Fecha:** 27-10-2026

| Commit | Cambio | Archivos |
|---|---|---|
| `1546a4a` | **A3.1** — seed de estaciones solo si cambia | `delivery-seed.service.ts` |
| `9fd7cdd` | **A3.2** — Todoist fuera del camino del arranque | `todoist.service.ts`, `main.ts` |

### 23.1 A3.1 — el seed deja de correr en cada arranque

`DeliverySeedService.onModuleInit()` pasa de **143 `upsert` secuenciales** a **2 consultas** cuando no hay cambios:

```ts
const [row, count] = await Promise.all([
  this.prisma.config.findUnique({ where: { key: 'metro_seed_version' } }),
  this.prisma.metroStation.count(),
]);
if (row?.value === METRO_SEED_VERSION && count === METRO_STATIONS.length) {
  this.logger.log('Metro stations al dia ... - sin sincronizar');
  return;
}
```

- `METRO_SEED_VERSION = '2026-10-27.1'` en la tabla `config` (ya existente: `key @unique`, `value String`).
- Doble condición: versión **y** conteo. Si alguien borra estaciones desde el admin, el `count()` lo detecta y el arranque siguiente lo repara.
- Cuando sí sincroniza: lotes de 10 en paralelo (`UPSERT_CHUNK`), **143 → 15 round trips**, conservando el `try/catch` individual.
- Archivo: 151 → 244 líneas.

**Obligación operativa:** al modificar `METRO_STATIONS` hay que subir `METRO_SEED_VERSION`. Es el único punto de atención del diseño.

### 23.2 A3.2 — Todoist deja de bloquear el arranque

`TodoistService.onModuleInit()` resolvía el proyecto con una **llamada HTTPS a `api.todoist.com`** antes de que la app escuchara. Con `AbortSignal.timeout(15000)` en `req()`, eso podía costar **hasta 15 s de cada cold start**.

Ahora:

```ts
this.token = token;
void this.resolveProject();   // no se espera
```

`resolveProject()` es idempotente (comparte la misma promesa), nunca lanza y se reintenta si falla. Los cuatro métodos públicos siguen guardados por `isReady()`, igual que antes.

**Efecto secundario aceptado:** durante los primeros cientos de milisegundos tras un arranque, `isReady()` devuelve `false`, así que una entrega creada exactamente en ese instante no generaría tarea en Todoist. La ventana es de milisegundos y solo ocurre tras un reinicio.

### 23.3 A3b (parcial) — Swagger ya no se genera en producción

`main.ts`:

```ts
if (process.env.NODE_ENV !== 'production') {
  const document = SwaggerModule.createDocument(app, config);   // ← ahora dentro del if
  SwaggerModule.setup('api/docs', app, document);
}
```

**Hoy es un no-op**, porque `NODE_ENV` sigue sin definir. Se vuelve efectivo en cuanto se defina `NODE_ENV=production` en Render → Environment.

**Falta el paso manual:** definir `NODE_ENV=production`. Ese cambio lo hace el propietario en el panel; no es código. Al aplicarlo, `GET /api/docs` debe devolver **404**.

### 23.4 A3.3 (migraciones) — NO aplicado, y por qué

El `CMD` del `Dockerfile` encadena `baseline.js` + `ensure-enum.js` + `migrate deploy` con 5 reintentos de `sleep 25` (23 s en el mejor caso, hasta 2 min si la base falla).

**Se decidió no tocarlo por ahora:**

1. Los tres scripts son **delicados y no idempotentes en sentido trivial**: `baseline.js` marca migraciones históricas como aplicadas cuando falta `_prisma_migrations`, y `ensure-enum.js` existe porque `ALTER TYPE ... ADD VALUE` no puede correr dentro de la transacción de `migrate deploy`. Unirlos o eliminarlos mal rompe la base.
2. Los 23 s restantes son aceptables una vez resuelto el resto: el cold start queda en ~26 s.
3. El riesgo de dejar el servicio sin arrancar es **mucho más caro** que 20 segundos de espera.

**Alternativa de bajo riesgo para más adelante:** combinar los tres en un único proceso Node, ahorrando dos arranques de intérprete y dos conexiones a Neon. Estimo 5–10 s. Requiere pruebas contra una base limpia.

### 23.5 Impacto acumulado

| Fase | Antes | Después |
|---|---|---|
| `[boot]` → `Startup` (migraciones) | 23 s | 23 s (sin cambios) |
| `Startup` → `Mapped` | ~1 s | ~1 s |
| `Mapped` → `Listening` | **96 s** | **~1–3 s** |
| Todoist dentro del arranque | hasta **15 s** | **0 s** (segundo plano) |
| **Cold start total** | **1 min 59 s** | **~26 s** |

Con ~26 s, el argumento para pagar los US$7 del plan Starter (A4) se debilita mucho.

### 23.6 Verificación pendiente (requiere el panel de Render)

1. Render → Logs, sin filtro, tras el despliegue de `9fd7cdd`:
   - Debe aparecer `Metro stations sync requerido: version ninguna -> 2026-10-27.1` (primera vez) y luego `Metro stations synced: 143 upserted, 0 removed`.
   - En el **siguiente** arranque: `Metro stations al dia (v2026-10-27.1, 143 estaciones) - sin sincronizar`.
2. Comparar la hora de `[boot] intento 1` con `Listening on ...`. Objetivo: **< 30 s**.
3. Admin → entregas → estaciones de metro: deben seguir las 143 con sus líneas y comunas.
4. Crear una entrega de prueba y confirmar que la tarea llega a Todoist (verifica A3.2).

### 23.7 Pendientes abiertos

| # | Pendiente | Tipo | Estado |
|---|---|---|---|
| 1 | `NODE_ENV=production` en Render | Panel (manual) | ⏳ Pendiente del propietario |
| 2 | Confirmar que la instancia duerme tras A2 | Observación | ⏳ Pendiente |
| 3 | A3.3 — unificar el pre-arranque | Código | ⏸️ Pospuesto (§23.4) |
| 4 | A4 — plan Starter US$7 | Decisión | 🔽 Menos urgente con 26 s |
| 5 | A5 — limpiar 14 workflows `render-*` de diagnóstico | Repo | ⏳ Pendiente |
| 6 | Bug P2002 en `delivery.service.ts:148` | Código | 📄 Analizado y propuesto en `docs/propuesta-p2002-delivery.md` — **no aplicado** |

---

## 24. Addendum 10 — `render.yaml`: el archivo que explica el 24/7 (y que nunca se aplicó)

**Hallazgo:** existe `backend/render.yaml` en el repositorio. Estaba ahí desde el principio y responde varias preguntas abiertas.

### 24.1 El health check que llevábamos días buscando

```yaml
services:
  - type: web
    name: nutrifit-api
    runtime: docker
    rootDir: backend
    healthCheckPath: /api/products     # ← el dato pendiente
    autoDeploy: true
```

**`healthCheckPath` = `/api/products`.** Es el mismo endpoint que usaba el cron de GitHub deshabilitado en §16. Alguien lo eligió como "endpoint de vida" en dos lugares distintos e independientes.

Dos problemas:

1. **Es caro**: devuelve **48,5 KB** y consulta la base de datos en cada llamada. Un health check debe costar milisegundos.
2. **Es frágil**: si la base está lenta o suspendida, `/api/products` falla y el servicio se marca como no saludable aunque la API esté viva.

**Alternativa correcta:** `/api/health`, que existe, responde **59 bytes** y tarda ~1 s en frío.

**Hipótesis viva:** si Render sondea ese path de forma periódica, sería el "pinger externo" que nunca apareció en los logs de Vercel, porque iría **directo contra Render**. No está confirmado — en el plan gratuito el health check se usa principalmente al desplegar — pero es el primer lugar a revisar si la instancia sigue sin dormir tras A2.

### 24.2 Producción no define `NODE_ENV`; staging sí

| Servicio | `NODE_ENV` en el yaml |
|---|---|
| `nutrifit-api` (producción) | **ausente** |
| `nutrifit-api-staging` | `value: development` |

La ausencia en producción **no fue una decisión**: es una omisión. Staging lo declara explícitamente. Eso confirma que el Swagger público (§20.3) es un accidente de configuración, no un descuido intencional.

### 24.3 El yaml nunca se aplicó: el servicio no es Blueprint

```yaml
- key: PORT
  value: 3001
```

Pero el log real de arranque dice:

```
Startup: NODE_ENV=(unset) PORT=10000
```

Render asigna `PORT=10000` automáticamente. Si el Blueprint estuviera sincronizado, el proceso vería 3001.

> **CONFIRMADO: `backend/render.yaml` es un archivo obsoleto; el servicio se gestiona desde el panel.**

Consecuencias:

- Editar `render.yaml` **no** cambia nada en producción. Sería una pérdida de tiempo.
- El panel de Render es la fuente de verdad para las variables.
- **No conviene sincronizar ese yaml ahora**: forzaría `CORS_ORIGINS` y `PORT` a valores fijos que hoy no están en uso, y podría romper CORS.

### 24.4 Estado de A3b: aplicado en código, **no efectivo**

`main.ts` ya tiene `createDocument` dentro del `if` (commit `9fd7cdd`, §23.3), pero la condición no se cumple mientras `NODE_ENV` siga sin definir.

| Hora (UTC) | `/api/docs` | `/api/docs-json` |
|---|---|---|
| 04:31 | 200 | 200 (95 rutas) |
| 04:44 | 200 | 200 |
| 04:49 | **200** | **200** |

**El Swagger sigue público.** El propietario reportó haber definido `NODE_ENV=production` en el panel, pero el efecto no se observó. Causas posibles, en orden de probabilidad:

1. Render guardó la variable sin redesplegar (requiere *Manual Deploy*).
2. El deploy estaba en curso al momento de la comprobación.
3. La variable se definió en `nutrifit-api-staging` por error.

**Verificación definitiva:** la línea de arranque imprime el entorno real.

```
[Bootstrap] Startup: NODE_ENV=production PORT=10000 DATABASE_URL=present JWT_SECRET=present
```

Si dice `(unset)`, la variable no llega al contenedor, por más que aparezca en el panel.

### 24.5 Acción correcta (no cambiar de estrategia)

| Paso | Dónde | Motivo |
|---|---|---|
| Definir `NODE_ENV=production` | Panel → Environment | Es la fuente de verdad (§24.3) |
| **Manual Deploy → Deploy latest commit** | Panel | Guardar la variable no siempre redespliega |
| Confirmar `NODE_ENV=production` en el log | Logs | Prueba directa |
| Confirmar `/api/docs` → 404 | HTTP | Prueba de efecto |
| Probar login admin y POS | Navegador | Las cookies pasan a `SameSite=None; Secure` |
| Considerar cambiar `healthCheckPath` a `/api/health` | Panel → Settings | Barato y correcto (§24.1) |

---

## 25. Addendum 11 — El canal de despliegue a Render está caído (27-10, ~04:49 UTC)

Hallazgo mientras se verificaba el cierre del Swagger. **No es un problema del código.**

### 25.1 Lo que sí llegó a producción

El deploy del commit `9fd7cdd` (A3.1 + A3.2 + A3b parcial) **se completó**. Evidencia tomada de los logs del propio workflow:

```
[04:28:24] deploy=build_in_progress
[04:28:44] deploy=update_in_progress
[04:29:04] deploy=update_in_progress
[04:29:24] deploy=update_in_progress
[04:29:45] deploy=live
DEPLOY_OK
```

> **CONFIRMADO: A3.1, A3.2 y A3b están desplegados y vivos desde las 04:29:45 UTC.**

### 25.2 Lo que **no** llegó

| Commit | Contenido | Estado |
|---|---|---|
| `9fd7cdd` | A3.1 + A3.2 + A3b | ✅ **live** (04:29:45) |
| `f1ee815` | Swagger fail-closed | ❌ **no desplegado** |

El workflow `Deploy API a Render` **falla al disparar** el deploy:

```
RESP: 
##[error]Process completed with exit code 1.
```

Dos intentos, idénticos:

| Hora UTC | Run | Resultado |
|---|---|---|
| 04:49:14 | 40451828064 | ❌ `RESP:` vacío |
| 04:51:28 | 40452024637 (dispatch manual) | ❌ `RESP:` vacío |

### 25.3 Descartado: no es la red ni Render caído

```
GET https://api.render.com/v1/services?limit=1  →  HTTP 401  (329 ms)
```

Render responde correctamente. Un 401 sin credencial es el comportamiento esperado. **La API está operativa.**

### 25.4 Por qué no vemos el error real

El workflow usa `curl -s -f`:

```bash
resp=$(curl -s -f -X POST ... "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys")
```

`-f` hace que curl falle **sin imprimir el cuerpo** ante cualquier HTTP ≥ 400, y `bash -e` aborta el paso. Resultado: `RESP:` vacío y cero información sobre la causa.

**Consecuencia:** no se puede distinguir entre 401 (clave inválida), 404 (service id inexistente) y 429 (rate limit).

**Arreglo del workflow** (requiere permiso `workflow`, que el token actual no tiene):

```diff
- resp=$(curl -s -f -X POST ...)
+ resp=$(curl -s -w '\nHTTP:%{http_code}' -X POST ...)
```

### 25.5 Efecto combinado

| Cambio | Hecho | Efectivo |
|---|---|---|
| `NODE_ENV=production` | En el panel (según el propietario) | ❌ **No** — `/api/docs` sigue en 200 |
| Swagger fail-closed (`f1ee815`) | Commiteado, CI verde | ❌ **No desplegado** |
| A3.1 + A3.2 + A3b | Desplegado | ✅ Sí |

**La instancia sigue corriendo el código de `9fd7cdd`.** Ni el cambio de panel ni el commit nuevo han llegado al contenedor.

### 25.6 Hipótesis, en orden de probabilidad

| # | Hipótesis | Cómo se confirma |
|---|---|---|
| 1 | Hay un deploy **en curso o atascado** desde el cambio de `NODE_ENV`; Render rechaza disparar otro | Render → **Events**: ¿hay un deploy después de las 04:40 y en qué estado? |
| 2 | `RENDER_API_KEY` revocada, rotada o sin permisos | El workflow no puede; el disparo desde el panel sí funciona |
| 3 | Rate limit de la API (429) | El workflow `Diagnóstico: estado vivo + rate-limit` sugiere que ya pasó antes |
| 4 | `RENDER_SERVICE_ID` apunta a un servicio eliminado | Events / panel |

### 25.7 Acción correcta

**Render → `nutrifit-api` → menú `⋯` → Manual Deploy → Deploy latest commit.**

Es el único camino que **no** depende de `RENDER_API_KEY`. Si funciona:

- El deploy construirá `f1ee815`, que **cierra el Swagger sin necesidad de `NODE_ENV`** (fail-closed).
- `/api/docs` debe pasar a **404** en cuanto termine.

Si el Manual Deploy **también** falla, entonces el problema está en la configuración del servicio y hay que ver el log del build en Render.

### 25.8 Corrección de enfoque: `f1ee815` vuelve innecesario forzar `NODE_ENV`

El commit `f1ee815` cambia la condición del Swagger a:

```ts
if (process.env.ENABLE_SWAGGER === 'true') {
```

**Cerrado por defecto.** Ya no depende de `NODE_ENV`, que ha demostrado ser frágil en este servicio. Una vez desplegado, el Swagger se cierra **sin tocar el panel**.

`NODE_ENV=production` sigue siendo conveniente por las cookies (`SameSite=None; Secure`), pero **deja de ser urgente**: la exposición pública de la API ya no depende de esa variable.

---

## 26. CAUSA RAÍZ — El health check apunta a `/api/docs` (28-10, 01:50 UTC)

**Este es el hallazgo que cierra el caso abierto en §25.** No era la clave de Render, ni la red, ni un deploy atascado.

### 26.1 El dato, leído del propio servicio

El objeto del servicio devuelto por `GET /v1/services/{id}` (workflow `render-inspect-deploy.yml`, run `40617432429`) contiene:

```json
{
  "name": "nutrifit-api",
  "slug": "nutrifit-api-635n",
  "type": "web_service",
  "autoDeploy": "yes",
  "autoDeployTrigger": "commit",
  "branch": "main",
  "rootDir": "backend",
  "suspended": "not_suspended",
  "serviceDetails": {
    "plan": "free",
    "region": "virginia",
    "runtime": "docker",
    "buildPlan": "starter",
    "cache": { "profile": "no-cache" },
    "healthCheckPath": "/api/docs",      // ← LA CAUSA
    "numInstances": 1
  },
  "url": "https://nutrifit-api-635n.onrender.com",
  "updatedAt": "2026-10-27T04:29:27.265337Z"
}
```

> **CONFIRMADO: `healthCheckPath` = `/api/docs`.**

Ni `/api/products` (lo que dice `render.yaml`) ni `/api/health` (lo sensato). **Un tercer valor distinto**, configurado a mano en el panel. Esto vuelve a probar, por tercera vía independiente, que `render.yaml` nunca se aplicó (§24.3).

### 26.2 Secuencia exacta del deploy fallido

```
dep-dbg2qjnb4ihs73b29620
  commit      f1ee815  ("cerrar Swagger por defecto (fail-closed)")
  status      update_failed
  createdAt   2026-10-27T04:49:19.496Z   ← lo creó el workflow
  startedAt   2026-10-27T04:59:27.526Z   ← 10 min 08 s en cola (plan free, 1 build a la vez)
  finishedAt  2026-10-27T05:15:05.246Z   ← 15 min 38 s después de startedAt
```

**15 minutos 38 segundos.** Ese número no es casualidad.

### 26.3 La regla de Render que lo explica

De la documentación oficial (https://render.com/docs/health-checks, consultado 28-10-2026):

> *Whenever **all** of the new instances are passing their health checks **at the same time**, Render considers the deploy successful and starts routing traffic to the new instances. **If this condition is not met within 15 minutes, Render cancels the deploy and continues routing traffic to your service's existing instances.***

> *To indicate a healthy instance, your endpoint can respond with any `2xx` or `3xx` status code. To indicate an unhealthy instance, your endpoint can respond with any `4xx` or `5xx` status code.*

Y `f1ee815` es exactamente el commit que **elimina** `/api/docs`:

```ts
if (process.env.ENABLE_SWAGGER === 'true') {   // antes: NODE_ENV !== 'production'
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);   // esto ya no se ejecuta
}
```

### 26.4 La cadena causal, paso a paso

| # | Hecho | Estado |
|---|---|---|
| 1 | Render crea una instancia nueva con `f1ee815` | CONFIRMADO |
| 2 | Esa instancia arranca bien (el cambio no afecta al boot) | CONFIRMADO (el único delta es el gate de Swagger) |
| 3 | Render sondea `GET /api/docs` con `Host: api.nutrifitsuplementos.cl` | CONFIRMADO (doc oficial + `healthCheckPath`) |
| 4 | La instancia responde **404** porque Swagger está apagado | CONFIRMADO (`/api/docs` ya devolvería 404 con ese código) |
| 5 | 404 es `4xx` → Render marca la instancia como **unhealthy** | CONFIRMADO (doc oficial) |
| 6 | Se agotan los **15 minutos** sin instancia sana | CONFIRMADO (ventana 15:38) |
| 7 | Render **cancela el deploy** y sigue sirviendo la versión anterior | CONFIRMADO (doc oficial) |
| 8 | Por eso `/api/docs` **sigue en 200**: nunca se desplegó lo nuevo | CONFIRMADO |

> **La paradoja:** el commit que cierra el Swagger **no puede desplegarse porque el health check vigila el Swagger.** El sistema protege exactamente lo que queremos eliminar.

### 26.5 Consecuencia operativa grave

```json
"autoDeploy": "yes", "autoDeployTrigger": "commit", "branch": "main", "rootDir": "backend"
```

**Todo push futuro a `backend/**` fallará igual**, con 15 minutos perdidos por intento. El canal de despliegue del backend está **roto de forma permanente**, no solo para `f1ee815`. Cada commit nuevo = un deploy fallido más.

### 26.6 El segundo hallazgo: esto explica el 24/7 (§5)

Según la misma documentación:

> *Every few seconds, Render sends **health checks** to each running web service and private service instance to confirm it's healthy and able to receive traffic.* … *Running instances: to confirm they're still responsive, automatically restarting them if they're not.*

Un sondeo **cada pocos segundos** contra `/api/docs` es tráfico entrante constante. Encaja con la observación central de esta auditoría (§5): **7 días, un solo `[boot]`, 168/168 horas encendidas.**

| Estado | Clasificación |
|---|---|
| `healthCheckPath` = `/api/docs` | **CONFIRMADO** |
| Los health checks llegan "cada pocos segundos" | **CONFIRMADO** (doc oficial) |
| Esos sondeos impiden el spin-down de 15 min | **PROBABLE (alta)** — la doc no lo dice literalmente; el mecanismo encaja con la evidencia |
| Los sondeos consumen cuota de instancia | **PROBABLE (alta)** — misma razón |

**Si se confirma, el hallazgo es mayor que todo lo anterior:** el cron `keep-alive.yml` (§16), el latido del frontend (A2, §21.6) y el tráfico de bots eran irrelevantes. **El verdadero keep-alive estaba en la configuración del propio Render**, y por eso nada de lo que desconectamos desde el código tuvo efecto.

**Prueba definitiva pendiente:** tras cambiar el health check, ver si aparece un nuevo `[boot]` en los logs tras 15 min de inactividad. Si el servicio por fin duerme, la hipótesis queda confirmada.

### 26.7 El tercer hallazgo: builds sin caché

```json
"buildPlan": "starter", "cache": { "profile": "no-cache" }
```

**Cada deploy reconstruye desde cero**: `npm ci`, `prisma generate`, `nest build`. Sin caché de capas Docker ni de dependencias. Eso infla los minutos de build (la otra cuota de Render, §2) y explica los builds de 4–5 min con memoria limitada.

**Recomendación:** activar la caché de build en *Settings → Build & Deploy*. Es una palanca directa sobre los minutos de pipeline, sin tocar código.

### 26.8 Corrección: lo que hay que cambiar en el panel

**Render → `nutrifit-api` → Settings → Health Checks → Edit**

| Campo | Antes | Después |
|---|---|---|
| Health Check Path | `/api/docs` | **`/api/health`** |

Luego **Save Changes**, y después **Manual Deploy → Deploy latest commit**.

**Por qué este orden y no el inverso:** si se despliega `f1ee815` con el health check aún en `/api/docs`, vuelve a fallar a los 15 minutos. Primero se corrige el vigilante, después se despliega.

**Verificación de seguridad:** `/api/health` responde **200 · 59 bytes · `{"status":"ok","db":"ok"}`** en la instancia **actual**. El cambio de path es seguro incluso antes de desplegar nada: Render empezará a sondear un endpoint que ya funciona.

### 26.9 Efecto esperado del cambio

| # | Efecto | Certeza |
|---|---|---|
| 1 | `f1ee815` se despliega por fin | Alta |
| 2 | `/api/docs` → **404** (Swagger cerrado) | Alta |
| 3 | `/api/docs-json` → **404** (95 rutas dejan de ser públicas) | Alta |
| 4 | Desaparece la causa de los deploys fallidos | Alta |
| 5 | El servicio empieza a dormir → menos horas consumidas | Media (depende de §26.6) |
| 6 | El health check pasa a costar 59 bytes en vez de 3.126 | CONFIRMADO por diseño |

### 26.10 Estado del arte tras este hallazgo

| Hipótesis de §25.6 | Veredicto |
|---|---|
| Deploy atascado que bloquea el disparo | **DESCARTADO** — el deploy se creó, arrancó y falló por health check |
| `RENDER_API_KEY` revocada | **DESCARTADO** — `ratelimit-remaining: 397/400`, HTTP 200 |
| Rate limit 429 | **DESCARTADO** — cuota casi intacta |
| `RENDER_SERVICE_ID` inexistente | **DESCARTADO** — devuelve el servicio correcto |
| **Health check fallando** | **CONFIRMADO** ✅ |

**Nota sobre el `RESP:` vacío del workflow (§25.4):** el deploy **sí se creó** (`createdAt 04:49:19`, `trigger: "api"`, justo cuando corrió el workflow). El `curl -f` falló al parsear la respuesta, no al crear el deploy. El workflow reportaba "no deploy id found" mientras el deploy ya estaba en cola y condenado a fallar. Dos errores superpuestos que se ocultaban mutuamente.

---

## 27. A4 APLICADO — Health check corregido y Swagger cerrado (28-10, 02:01 UTC)

**Cambio aplicado por el propietario en el panel de Render. Sin cambios de código.**

### 27.1 El cambio

| Campo | Antes | Después |
|---|---|---|
| `healthCheckPath` | `/api/docs` | **`/api/health`** |

Leído del objeto del servicio **después** del cambio (`GET /v1/services/{id}`, run `40618692563`):

```json
"healthCheckPath": "/api/health",
"plan": "free",
"suspended": "not_suspended",
"updatedAt": "2026-10-28T01:59:49.963552Z"
```

**Registrado a las 01:59:49 UTC.** El `updatedAt` del servicio confirma que la configuración se guardó.

### 27.2 Verificación del efecto

| Endpoint | Antes | Ahora | Cuerpo |
|---|---|---|---|
| `GET /api/docs` | 200 · 3.126 B | **404 · 109 B** | `Cannot GET /api/docs` |
| `GET /api/docs-json` | 200 · 22.151 B | **404 · 119 B** | `Cannot GET /api/docs-json` |
| `GET /api/health` | 200 · 59 B | **200 · 59 B** | `{"status":"ok","db":"ok"}` |

Probado en **ambos hosts**:

```
api.nutrifitsuplementos.cl/api/docs        → 404
api.nutrifitsuplementos.cl/api/health      → 200
nutrifit-api-635n.onrender.com/api/docs    → 404
nutrifit-api-635n.onrender.com/api/health  → 200
```

> **CONFIRMADO: el commit `f1ee815` está desplegado y vivo.** El Swagger ya no es público.
>
> **CONFIRMADO: la causa raíz de §26 era correcta.** Al corregir el health check, el deploy que llevaba 21 horas bloqueado pasó a `live`.

### 27.3 Lo que se cierra con esto

| # | Problema | Estado |
|---|---|---|
| 1 | Swagger público (95 rutas / 118 operaciones) | ✅ **CERRADO** |
| 2 | Canal de despliegue roto (`update_failed`) | ✅ **CERRADO** |
| 3 | `autoDeploy` condenado a fallar en cada push a `backend/**` | ✅ **CERRADO** |
| 4 | Health check caro (Swagger HTML, 3.126 B) | ✅ **Reemplazado** por 59 B |
| 5 | `NODE_ENV=production` | ⚠️ **Sigue sin definir** — ya no bloquea nada, pero las cookies quedan en `SameSite=Lax` |

### 27.4 Cronología del desbloqueo

```
01:59:49  guardado de healthCheckPath = /api/health   (updatedAt del servicio)
02:01:01  /api/docs responde 404                      (timestamp del cuerpo JSON)
          → 72 segundos
```

**72 segundos** entre el guardado y el efecto. Eso indica que el build ya estaba hecho y la instancia nueva estaba esperando pasar el health check: en cuanto el sondeo apuntó a `/api/health`, la instancia se marcó sana y Render enrutó el tráfico. **PROBABLE (alta)**, no se pudo leer el evento exacto del deploy.

### 27.5 La prueba que queda pendiente: ¿duerme ya el servicio?

Es la hipótesis de §26.6 y el objetivo original de toda la auditoría (las 750 h).

**Método:** dejar la API **sin ninguna petición durante 20–25 minutos** y medir la latencia de la primera llamada.

| Latencia de la primera llamada | Interpretación |
|---|---|
| ~0,9 s | **Sigue despierto.** El keep-alive no eran los health checks; hay otra fuente (§5) |
| ~25–40 s | **Durmió y despertó.** Hipótesis confirmada: los health checks eran el keep-alive |

**Importante:** durante la espera no hay que abrir el admin, el POS, la web ni ningún monitor. Cualquier petición reinicia el contador de 15 minutos.

Este mismo test mide de paso el **cold start** tras A3.1 (objetivo: < 30 s, contra los 1 min 59 s medidos antes).

### 27.5.1 Primer intento de medición: inválido (hay que registrarlo)

Primera medición, 28-10 a las 02:15:25 UTC (hora del servidor): **1.301 ms en la primera petición y 800 ms en la segunda** → lectura inicial: "no durmió".

**Pero el test no era válido.** Dos problemas:

**1. El reposo fue de 14 min 20 s, no de 20–25 min.**

La última petición antes del reposo fue a las ~02:00:55 UTC; la medición, a las 02:15:13 UTC. El umbral de Render es de **15 minutos exactos**: faltaron 40 segundos. Un test que se queda a 40 s del umbral no prueba nada.

**2. Desfase de reloj en el entorno de medición: +114 s.**

| Fuente | Hora |
|---|---|
| Reloj del entorno de trabajo | `02:17:19` |
| Header `date` de la respuesta | `02:15:25` |
| Campo `time` del cuerpo | `02:15:25.811` |

El entorno de medición va **113–114 segundos adelantado** respecto al servidor. Consecuencia práctica: toda ventana temporal calculada con el reloj local **sobreestima el reposo en ~2 minutos**. Es la causa de que el primer intento pareciera más largo de lo que fue.

**Lección para futuras mediciones:** usar siempre el header `date` de la respuesta como referencia temporal, nunca el reloj local.

**Descartado también:** no hay caché de por medio. `cf-cache-status: DYNAMIC` tanto con como sin cache-buster (`?cb=<epoch>`), y el campo `time` del cuerpo avanza en cada llamada. Las respuestas son reales y del origen.

**Test corregido en curso:** 22 minutos de silencio (margen de 7 min sobre el umbral) medidos contra la hora del servidor, con una sola petición de medición.

### 27.6 Estado consolidado

| Cambio | Commit / acción | Estado |
|---|---|---|
| A2 — latido del frontend eliminado | `16c2d00` | ✅ desplegado |
| A3.1 — seed por lotes + guarda de versión | `1546a4a` | ✅ desplegado |
| A3.2 — Todoist no bloqueante | `9fd7cdd` | ✅ desplegado |
| A3b — Swagger fail-closed | `f1ee815` | ✅ **desplegado** |
| A4 — health check → `/api/health` | panel de Render | ✅ **aplicado** |
| A3.3 — migraciones fuera del `CMD` | — | ⏸️ no aplicado (riesgo, ganancia ~23 s) |
| `render.yaml` | — | ⛔ no modificar (obsoleto, §24.3) |

---

*Última modificación aplicada: A4 (health check → `/api/health`) y despliegue de `f1ee815`, §26–§27. Anteriores: A3.1 (`1546a4a`) y A3.2 + A3b (`9fd7cdd`, §23), A2 (`16c2d00`, §21.6), `keep-alive.yml` deshabilitado (§16). Swagger **cerrado y verificado** (§27.2). Pendiente: prueba de spin-down (§27.5), `NODE_ENV`, caché de build (§26.7), parches P2002, `/api/auth/bootstrap`. A3.3 analizado y **no aplicado** (§23.4). `render.yaml` **no se modificó** (§24.3). Ningún cambio de esquema ni de datos.*
