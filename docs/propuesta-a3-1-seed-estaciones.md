# Propuesta A3.1 — Seed de estaciones batcheado

> **Estado: ✅ APLICADO** el 27-10-2026 en el commit `1546a4a74ce0277d029ecc4a634a1ce47c6269da`.
> Ver §10 al final para el resultado y la verificación pendiente.
>
> Base: `waldosiclla14-bit/nutrifit-web` @ `1546a4a`
> Archivo afectado: `backend/src/delivery/delivery-seed.service.ts` (1 archivo)
> Riesgo: bajo · Sin migraciones · Sin cambios de esquema · Reversible con `git revert`

---

## 1. Problema

`DeliverySeedService.onModuleInit()` se ejecuta en **cada arranque del contenedor** y hace
**143 `upsert` secuenciales**, uno por estación de metro, sin batching ni paralelismo.

Consecuencia medida: **96 segundos** entre el mapeo de rutas y la apertura del puerto
(§22 del informe de auditoría). Es el 80 % del cold start de 1 min 59 s.

```
96 s ÷ 143 upserts ≈ 0,67 s por round trip
```

---

## 2. Solución propuesta

Dos cambios complementarios, ambos dentro del mismo archivo:

### 2.1 Guarda de versión (el ahorro principal)

Se guarda un registro `metro_seed_version` en la tabla `config` (que ya existe:
`key String @unique`, `value String`). En cada arranque:

| Situación | Consultas | Tiempo |
|---|---|---|
| Versión coincide **y** hay 143 estaciones | **2** (`findUnique` + `count`) | ~1 s |
| Versión distinta **o** faltan estaciones | 2 + sincronización completa | ~5 s |

El caso normal pasa de **143 round trips a 2**.

La verificación incluye `count()` por una razón: si alguien borra estaciones desde el
admin, el contador deja de cuadrar y el seed se repara solo en el arranque siguiente.
No depende únicamente de la versión.

### 2.2 Upserts en lotes de 10

Cuando la sincronización **sí** hace falta, los 143 `upsert` se agrupan en lotes de 10
ejecutados en paralelo: **15 round trips en vez de 143**.

Se conserva el `try/catch` individual: una estación que falle se registra y el resto continúa.
No se usa `$transaction` a propósito, porque un solo error abortaría el lote completo y
cambiaría el comportamiento actual.

### 2.3 Lo que **no** se toca

- `seedSettings()` — ya sale temprano con un `count()`.
- `syncScheduleWindow()` — solo 2 `upsert` fijos, coste despreciable.
- Los `delete` individuales de estaciones obsoletas — normalmente son 0, y así se conserva
  la tolerancia actual a fallos por clave foránea (`Delivery` referencia `MetroStation`).
- La firma pública del servicio y su registro en el módulo.

---

## 3. Contenido completo del archivo propuesto

Ruta: `backend/src/delivery/delivery-seed.service.ts`

```ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { METRO_STATIONS } from './data/metro-stations.seed';

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const DEFAULT_SETTINGS = [
  { key: 'delivery_enabled', value: true },
  { key: 'metro_enabled', value: true },
  { key: 'home_delivery_enabled', value: true },
  { key: 'pickup_enabled', value: true },
  { key: 'minimum_notice_minutes', value: 60 },
  { key: 'default_delivery_duration', value: 30 },
  { key: 'maximum_orders_per_slot', value: 10 },
  { key: 'delivery_start_time', value: '08:00' },
  { key: 'delivery_end_time', value: '22:00' },
  { key: 'slot_interval_minutes', value: 30 },
  { key: 'reminder_before_minutes', value: 60 },
];

/**
 * Versión del seed de estaciones de metro.
 *
 * SUBIR ESTA CADENA cada vez que cambie METRO_STATIONS (agregar, quitar o
 * corregir una estación). Es lo único que dispara la resincronización.
 *
 * Si NO se sube, el arranque asume que la tabla está al día y no la toca.
 */
const METRO_SEED_VERSION = '2026-10-27.1';
const METRO_SEED_VERSION_KEY = 'metro_seed_version';

/** Upserts en paralelo por lote. 10 mantiene el pool (connection_limit=5) cómodo. */
const UPSERT_CHUNK = 10;

@Injectable()
export class DeliverySeedService implements OnModuleInit {
  private readonly logger = new Logger(DeliverySeedService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedStationsIfNeeded();
    await this.seedSettings();
    await this.syncScheduleWindow();
  }

  // ─────────────────────────── estaciones ───────────────────────────

  /**
   * Solo sincroniza si la versión del seed cambió o si el número de
   * estaciones en la tabla no cuadra con el seed.
   *
   * Antes: 143 upserts secuenciales en CADA arranque (~96 s).
   * Ahora: 2 consultas cuando no hay cambios (~1 s).
   */
  private async seedStationsIfNeeded() {
    const esperado = METRO_STATIONS.length;
    let versionGuardada: string | null = null;
    let enTabla = 0;

    try {
      const [row, count] = await Promise.all([
        this.prisma.config.findUnique({ where: { key: METRO_SEED_VERSION_KEY } }),
        this.prisma.metroStation.count(),
      ]);
      versionGuardada = row?.value ?? null;
      enTabla = count;
    } catch (e: any) {
      // Si la verificación falla, se sincroniza: es más seguro que quedarse corto.
      this.logger.warn(
        `No se pudo verificar el seed de estaciones, se sincroniza por precaución: ${e?.message ?? e}`,
      );
    }

    if (versionGuardada === METRO_SEED_VERSION && enTabla === esperado) {
      this.logger.log(
        `Metro stations al día (v${METRO_SEED_VERSION}, ${enTabla} estaciones) — sin sincronizar`,
      );
      return;
    }

    this.logger.log(
      `Metro stations sync requerido: versión ${versionGuardada ?? 'ninguna'} → ${METRO_SEED_VERSION}, ` +
        `en tabla ${enTabla}/${esperado}`,
    );

    await this.seedStations();
    await this.saveSeedVersion();
  }

  private async saveSeedVersion() {
    try {
      await this.prisma.config.upsert({
        where: { key: METRO_SEED_VERSION_KEY },
        update: { value: METRO_SEED_VERSION },
        create: { key: METRO_SEED_VERSION_KEY, value: METRO_SEED_VERSION },
      });
    } catch (e: any) {
      this.logger.warn(`No se pudo guardar metro_seed_version: ${e?.message ?? e}`);
    }
  }

  private async seedStations() {
    this.logger.log(`Syncing metro stations with seed data (${METRO_STATIONS.length})...`);

    // Build set of valid station keys from seed
    const validKeys = new Set(METRO_STATIONS.map((s) => `${s.name}|${s.line}`));

    // Remove stations not in seed (old/wrong data)
    const existing = await this.prisma.metroStation.findMany({
      select: { id: true, name: true, line: true },
    });
    let removed = 0;
    for (const station of existing) {
      if (!validKeys.has(`${station.name}|${station.line}`)) {
        // Individual y tolerante a fallos: Delivery referencia MetroStation,
        // así que una estación con entregas no se puede borrar y debe seguir.
        await this.prisma.metroStation
          .delete({ where: { id: station.id } })
          .catch(() => {});
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.log(`Removed ${removed} obsolete stations`);
    }

    // Upsert all stations from seed, en lotes paralelos
    let upserted = 0;
    let failed = 0;

    for (let i = 0; i < METRO_STATIONS.length; i += UPSERT_CHUNK) {
      const lote = METRO_STATIONS.slice(i, i + UPSERT_CHUNK);

      const resultados = await Promise.all(
        lote.map((station) =>
          this.prisma.metroStation
            .upsert({
              where: { name_line: { name: station.name, line: station.line } },
              update: {
                lineName: station.lineName,
                commune: station.commune,
                latitude: station.latitude,
                longitude: station.longitude,
                defaultMeetingPoint: station.defaultMeetingPoint || 'Acceso principal',
                notes: station.notes || null,
                sortOrder: station.sortOrder,
                normalizedName: normalize(station.name),
                active: true,
                deliveryEnabled: true,
              },
              create: {
                name: station.name,
                normalizedName: normalize(station.name),
                line: station.line,
                lineName: station.lineName,
                commune: station.commune,
                latitude: station.latitude,
                longitude: station.longitude,
                active: true,
                deliveryEnabled: true,
                defaultMeetingPoint: station.defaultMeetingPoint || 'Acceso principal',
                notes: station.notes || null,
                sortOrder: station.sortOrder,
              },
            })
            .then(() => true)
            .catch((e: any) => {
              failed++;
              this.logger.warn(
                `Failed to upsert station ${station.name} (${station.line}): ${e?.message}`,
              );
              return false;
            }),
        ),
      );

      upserted += resultados.filter(Boolean).length;
    }

    this.logger.log(
      `Metro stations synced: ${upserted} upserted, ${removed} removed` +
        (failed > 0 ? `, ${failed} fallidas` : ''),
    );
  }

  // ─────────────────────────── settings ───────────────────────────

  private async seedSettings() {
    const count = await this.prisma.deliverySettings.count();
    if (count > 0) {
      this.logger.log(`Delivery settings already seeded (${count})`);
      return;
    }

    this.logger.log('Seeding delivery settings...');
    let created = 0;

    for (const setting of DEFAULT_SETTINGS) {
      try {
        await this.prisma.deliverySettings.create({
          data: { key: setting.key, value: setting.value as any },
        });
        created++;
      } catch {
        // skip duplicates
      }
    }

    this.logger.log(`Delivery settings seeded: ${created} created`);
  }

  /**
   * Canonical metro delivery window (spec 4.7.1: fixed 30-min blocks 8 AM - 10 PM).
   * Upserted on every boot so the window is guaranteed even on databases
   * baselined without running the settings UPDATE migrations.
   * There is no admin UI for these keys; code owns the values.
   */
  private async syncScheduleWindow() {
    const canonical: Record<string, string> = {
      delivery_start_time: '08:00',
      delivery_end_time: '22:00',
    };
    for (const [key, value] of Object.entries(canonical)) {
      try {
        await this.prisma.deliverySettings.upsert({
          where: { key },
          update: { value: value as any },
          create: { key, value: value as any },
        });
      } catch (e: any) {
        this.logger.warn(`Could not sync setting ${key}: ${e?.message}`);
      }
    }
    this.logger.log('Delivery window synced: 08:00-22:00');
  }
}
```

---

## 4. Diff resumido

```diff
+const METRO_SEED_VERSION = '2026-10-27.1';
+const METRO_SEED_VERSION_KEY = 'metro_seed_version';
+const UPSERT_CHUNK = 10;

 async onModuleInit() {
-  await this.seedStations();
+  await this.seedStationsIfNeeded();
   await this.seedSettings();
   await this.syncScheduleWindow();
 }

+private async seedStationsIfNeeded() {
+  // 2 consultas → si versión y conteo coinciden, sale sin tocar la tabla
+}
+
+private async saveSeedVersion() { /* upsert en config */ }
+
 private async seedStations() {
-  for (const station of METRO_STATIONS) {
-    await this.prisma.metroStation.upsert({ ... });
-  }
+  for (let i = 0; i < METRO_STATIONS.length; i += UPSERT_CHUNK) {
+    await Promise.all(lote.map(...));  // 10 en paralelo
+  }
 }
```

**Líneas:** ~+70 / ~−5. Un solo archivo.

---

## 5. Impacto esperado

| Escenario | Consultas al arrancar | Tiempo estimado |
|---|---|---|
| **Hoy** | ~150 (143 upserts + resto) | **96 s** |
| A3.1, arranque normal | **~5** | **~1–3 s** |
| A3.1, primer arranque tras subir versión | ~25 | ~5 s |

Cold start total tras A3.1: **23 s (migraciones) + ~1 s + ~3 s ≈ 27 s**.
Con A3.3 aplicado también: **~15–20 s**.

---

## 6. Cómo se verifica después de aplicar

1. Render → Events → confirmar el nuevo deploy.
2. Render → Logs, sin filtro. Al arrancar debe aparecer:
   ```
   [DeliverySeedService] Metro stations al día (v2026-10-27.1, 143 estaciones) — sin sincronizar
   ```
   **y NO** debe aparecer `Syncing metro stations with seed data`.
3. Comparar la hora de `[boot] intento 1` con `Listening on ...`. Debe ser **< 30 s**.
4. En el admin, abrir la lista de estaciones de metro: deben seguir las 143, con líneas y comunas correctas.
5. **Primer arranque tras el cambio**: como la versión no existe aún, sincronizará una vez
   (~25 consultas), guardará la versión, y los siguientes arranques ya serán instantáneos.

---

## 7. Cómo se actualiza el seed en el futuro

Cuando se modifique `METRO_STATIONS`:

1. Cambiar `METRO_SEED_VERSION` a la fecha del cambio (p. ej. `2026-11-15.1`).
2. Commit y deploy.
3. El arranque siguiente resincroniza una vez y vuelve al modo rápido.

Si se olvida subir la versión, la nueva estación **no** se creará. Por eso la constante
lleva el comentario en mayúsculas: es el único punto de atención del diseño.

---

## 8. Reversión

```bash
git revert <sha>
```

Sin migraciones, sin cambios de esquema, sin datos nuevos salvo la fila
`config.metro_seed_version`, que es inofensiva si el código vuelve atrás.

---

## 9. Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Se olvida subir la versión tras editar el seed | Media | Comentario explícito + verificación por `count()` que detecta faltantes |
| Un `upsert` falla y la versión se guarda igual | Baja | Se registra `X fallidas` en el log; el `count()` del arranque siguiente lo detecta y reintenta |
| El pool de conexiones se satura con 10 en paralelo | Baja | `connection_limit=5`; 10 en paralelo sobre pgbouncer se encola, no falla |
| Colisión con el deploy de Render | Nula | El servicio reinicia una vez; es el comportamiento esperado |

---

## 10. Resultado de la aplicación (27-10-2026)

**Commit:** `1546a4a74ce0277d029ecc4a634a1ce47c6269da`
**Mensaje:** `perf(boot): sincronizar estaciones de metro solo si cambia el seed (143 upserts por arranque -> 2 consultas)`

### 10.1 Verificación del contenido subido

| Comprobación | Resultado |
|---|---|
| Archivo en `main` | 151 → **244 líneas** |
| `METRO_SEED_VERSION = '2026-10-27.1'` | ✅ presente |
| `UPSERT_CHUNK = 10` | ✅ presente |
| `seedStationsIfNeeded()` en `onModuleInit` | ✅ presente |
| Llamada a `seedStations()` desde el arranque | ✅ eliminada del hook (solo se invoca dentro de la guarda) |
| Workflows | CI ✅ · Deploy API a Render ✅ |

### 10.2 Diferencia con lo revisado en este documento

El código aplicado elimina los acentos de los comentarios nuevos (`Version`, `estacion`, `precaucion`) para evitar problemas de codificación en el pipeline. **La lógica es idéntica** a la de §3; solo cambian tres comentarios.

### 10.3 Primer arranque esperado

Como `config.metro_seed_version` no existe todavía, el **primer** arranque ejecutará la sincronización completa (~25 consultas), guardará la versión y registrará:

```
Metro stations sync requerido: version ninguna -> 2026-10-27.1, en tabla 143/143
Metro stations synced: 143 upserted, 0 removed
```

Del **segundo** arranque en adelante:

```
Metro stations al dia (v2026-10-27.1, 143 estaciones) - sin sincronizar
```

### 10.4 Medición pendiente

No se ha podido leer el tiempo real de arranque (requiere el panel de Render). Lo que hay que observar en el próximo reinicio:

| Marca | Antes | Esperado ahora |
|---|---|---|
| `[boot] intento 1` → `Listening on ...` | 1 min 59 s | **~25–30 s** |
| Tramo `Mapped` → `Listening` | 96 s | **~1–3 s** |

### 10.5 Riesgo residual

El diseño depende de subir `METRO_SEED_VERSION`. Está documentado en §7, y la comprobación por `count()` cubre el caso de estaciones faltantes aunque se olvide la versión.
