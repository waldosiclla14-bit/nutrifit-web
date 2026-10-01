/**
 * Copia de datos Neon -> Supabase (una vez).
 *
 * Uso copia completa (destino vacío):
 *   SOURCE_DATABASE_URL="postgresql://..." TARGET_DATABASE_URL="postgresql://..." node prisma/copy-neon-to-supabase.js
 *
 * Uso merge solo-historial (destino en uso: trae órdenes+clientes viejos
 * sin tocar stock, catálogo ni contadores; omite lo que ya existe):
 *   MERGE=true SOURCE_DATABASE_URL="..." TARGET_DATABASE_URL="..." node prisma/copy-neon-to-supabase.js
 *
 * Requisitos previos:
 *   1. En Supabase ya corrió `prisma db push` + `migrate resolve --applied` (schema + historial).
 *   2. El destino está VACÍO (aborta si tiene órdenes: no pisa nada).
 *   3. Neon responde (cupo vigente o mes pago).
 *
 * Estrategia: lee por páginas y re-crea con los mismos UUIDs (createMany en
 * lotes), en orden de dependencias para no violar FKs. Al final verifica
 * conteos tabla por tabla. Las claves NUNCA se guardan: van por env vars.
 */
const { PrismaClient } = require('@prisma/client');

// Padres primero (sin FKs salientes), hijos después.
const TABLES = [
  'user',
  'customer',
  'supplier',
  'category',
  'brand',
  'metroStation',
  'config',
  'review',
  'orderCounter',
  'expenseCategory',
  'deliverySettings',
  'reminder',
  'address',
  'coupon',
  'product',
  'expense',
  'productVariant',
  'purchase',
  'order',
  'cashRegister',
  'auditLog',
  'batch',
  'orderItem',
  'purchaseItem',
  'goodsReceipt',
  'purchaseDocument',
  'productCostHistory',
  'cashMovement',
  'stockAdjustment',
  'inventoryMovement',
  'delivery',
  'goodsReceiptItem',
  'deliveryAuditLog',
  'pushSubscription',
];

// Modo MERGE=true: solo historial (órdenes+clientes+direcciones), sin pisar.
// Omite filas que ya existen (por id) y NO toca stock, catálogo ni contadores.
// Uso: MERGE=true SOURCE_... TARGET_... node prisma/copy-neon-to-supabase.js
const MERGE_TABLES = ['customer', 'address', 'coupon', 'order', 'orderItem'];

const PAGE = 200;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Reintento con backoff: el pooler/serverless puede cerrar conexiones
// en corridas largas. Todo es idempotente (skipDuplicates), reintentar es seguro.
async function withRetry(fn, label) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt === 5) throw e;
      const wait = Math.min(5000 * attempt, 30000);
      console.log(`  reintento ${attempt}/5 ${label} en ${wait}ms (${String(e.message || e).split('\n')[0]})`);
      await sleep(wait);
    }
  }
}

async function countAll(db, distinctMetro) {
  const out = {};
  for (const t of TABLES) {
    if (t === 'metroStation' && distinctMetro) {
      const r = await db.$queryRawUnsafe(
        'SELECT COUNT(*)::int AS c FROM (SELECT DISTINCT name, line FROM "metro_stations") s',
      );
      out[t] = r[0].c;
    } else {
      out[t] = await db[t].count().catch(() => -1);
    }
  }
  return out;
}

async function main() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.TARGET_DATABASE_URL;
  if (!sourceUrl || !targetUrl) {
    console.error('Faltan SOURCE_DATABASE_URL y/o TARGET_DATABASE_URL');
    process.exit(1);
  }
  const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
  const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });
  const merge = process.env.MERGE === 'true';
  const tables = merge ? MERGE_TABLES : TABLES;

  try {
    if (merge) {
      console.log('Modo MERGE: solo historial, se omiten filas existentes.');
    } else {
      // Guard: no pisar un destino con datos (solo en copia completa).
      // RESUME=true lo salta para continuar una copia interrumpida
      // (skipDuplicates hace idempotente cada tabla).
      const guard = await target.order.count().catch(() => -1);
      if (guard !== 0 && process.env.RESUME !== 'true') {
        console.error(`Destino no vacío (orders=${guard}). Abortando por seguridad.`);
        process.exit(1);
      }
      if (guard !== 0) console.log('RESUME: continuando copia interrumpida...');
    }

    let total = 0;
    // Estaciones: la base vieja duplicó (name,line) sin unique y distintas
    // corridas conservaron duplicados distintos. Fuente de verdad: lo que YA
    // hay en destino. Remapeo por (name,line) contra destino.
    const dstStations = await target.metroStation
      .findMany({ select: { id: true, name: true, line: true } })
      .catch(() => []);
    const dstStationByKey = new Map(dstStations.map((s) => [s.name + '|' + s.line, s.id]));
    const dstStationIds = new Set(dstStations.map((s) => s.id));
    const stationRows = await source.metroStation
      .findMany({ orderBy: { id: 'asc' } })
      .catch(() => []);
    const stationKept = new Map();
    for (const s of stationRows) {
      const k = s.name + '|' + s.line;
      if (!stationKept.has(k)) stationKept.set(k, s.id);
    }
    for (const t of tables) {
      let skip = 0;
      let moved = 0;
      for (;;) {
        let rows = await withRetry(
          () => source[t].findMany({ skip, take: PAGE, orderBy: { id: 'asc' } }),
          `${t} lectura`,
        );
        if (rows.length === 0) break;
        if (t === 'metroStation') {
          rows = rows.filter((r) => stationKept.get(r.name + '|' + r.line) === r.id);
          if (rows.length === 0) {
            skip += PAGE;
            continue;
          }
        }
        if (t === 'delivery') {
          rows = rows.map((r) => {
            if (!r.stationId) return r;
            if (dstStationIds.has(r.stationId)) return r;
            // Apunta a un dupe no copiado: buscar el equivalente en destino
            const src = stationRows.find((s) => s.id === r.stationId);
            const kept = src ? dstStationByKey.get(src.name + '|' + src.line) : null;
            return { ...r, stationId: kept || null };
          });
        }
        if (merge) {
          // Omite por id las que ya existen en destino
          const ids = rows.map((r) => r.id);
          const existing = await withRetry(
            () => target[t].findMany({ where: { id: { in: ids } }, select: { id: true } }),
            `${t} verificar`,
          );
          const have = new Set(existing.map((e) => e.id));
          const fresh = rows.filter((r) => !have.has(r.id));
          if (fresh.length) await withRetry(() => target[t].createMany({ data: fresh }), `${t} escritura`);
          moved += fresh.length;
        } else {
          // JSON-serializable tal cual (fechas/JSON/enums viajan bien).
          // skipDuplicates: re-ejecuciones seguras (misma fuente, mismos ids).
          const batch = rows;
          await withRetry(() => target[t].createMany({ data: batch, skipDuplicates: true }), `${t} escritura`);
          moved += rows.length;
        }
        skip += rows.length;
      }
      total += moved;
      console.log(`  ${t}: ${moved}`);
    }
    console.log(`Total filas copiadas: ${total}`);

    // Verificación: destino debe contener al menos todo el origen.
    // (Mayor es aviso, no error: filas creadas nativamente en destino.)
    console.log('Verificando conteos...');
    const [src, dst] = await Promise.all([countAll(source, true), countAll(target, false)]);
    let ok = true;
    for (const t of tables) {
      if ((dst[t] ?? -1) < src[t]) {
        ok = false;
        console.error(`  MISMATCH ${t}: origen=${src[t]} destino=${dst[t]}`);
      } else if (dst[t] !== src[t]) {
        console.log(`  (aviso) ${t}: destino tiene ${dst[t] - src[t]} fila(s) extra`);
      }
    }
    if (!ok) {
      console.error('VERIFICACIÓN FALLIDA: revisar tablas con mismatch.');
      process.exit(1);
    }
    console.log('VERIFICACIÓN OK: todas las tablas coinciden.');
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

main().catch((e) => {
  console.error('Fatal:', e?.message || e);
  process.exit(1);
});
