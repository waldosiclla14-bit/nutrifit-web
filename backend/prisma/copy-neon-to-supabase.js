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

async function countAll(db) {
  const out = {};
  for (const t of TABLES) {
    out[t] = await db[t].count().catch(() => -1);
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
      // Guard: no pisar un destino con datos (solo en copia completa)
      const guard = await target.order.count().catch(() => -1);
      if (guard !== 0) {
        console.error(`Destino no vacío (orders=${guard}). Abortando por seguridad.`);
        process.exit(1);
      }
    }

    let total = 0;
    for (const t of tables) {
      let skip = 0;
      let moved = 0;
      for (;;) {
        const rows = await source[t].findMany({ skip, take: PAGE });
        if (rows.length === 0) break;
        if (merge) {
          // Omite por id las que ya existen en destino
          const ids = rows.map((r) => r.id);
          const existing = await target[t].findMany({
            where: { id: { in: ids } },
            select: { id: true },
          });
          const have = new Set(existing.map((e) => e.id));
          const fresh = rows.filter((r) => !have.has(r.id));
          if (fresh.length) await target[t].createMany({ data: fresh });
          moved += fresh.length;
        } else {
          // JSON-serializable tal cual (fechas/JSON/enums viajan bien)
          await target[t].createMany({ data: rows });
          moved += rows.length;
        }
        skip += rows.length;
      }
      total += moved;
      console.log(`  ${t}: ${moved}`);
    }
    console.log(`Total filas copiadas: ${total}`);

    // Verificación: conteos origen vs destino
    console.log('Verificando conteos...');
    const [src, dst] = await Promise.all([countAll(source), countAll(target)]);
    let ok = true;
    for (const t of tables) {
      if (merge) {
        // En merge: destino debe contener al menos todo el origen
        if ((dst[t] ?? -1) < src[t]) {
          ok = false;
          console.error(`  MISMATCH ${t}: origen=${src[t]} destino=${dst[t]}`);
        }
      } else if (src[t] !== dst[t]) {
        ok = false;
        console.error(`  MISMATCH ${t}: origen=${src[t]} destino=${dst[t]}`);
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
