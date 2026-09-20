/**
 * First-boot baseline for production databases created via `db push`
 * (tables exist but there is no _prisma_migrations history).
 *
 * Without this, `prisma migrate deploy` aborts with P3005
 * ("database schema is not empty") and the container exits status 1.
 *
 * Only the pure settings UPDATE migrations are marked as applied: their
 * effect is guaranteed separately (seed upsert on every boot).
 * 20260913_add_purchase_models is deliberately NOT marked — it must RUN
 * (it is idempotent: IF NOT EXISTS / duplicate_object guards) to create
 * the columns/tables missing in db-pushed databases (e.g. suppliers.rut).
 *
 * Safe to run on every boot: it only acts when history is missing.
 */
const { execSync } = require('child_process');

const BASELINE_MIGRATIONS = [
  '20260918_metro_hours_9_to_22',
  '20260918_metro_hours_10_to_22',
  '20260918_metro_hours_8_to_22',
];

// 20260913 must EXECUTE (idempotent SQL creates whatever is missing).
// Exception: an earlier baseline revision wrongly recorded it as applied
// without running it. Detect that state via the suppliers.rut column and,
// if missing, roll it back in history so `migrate deploy` executes it.
const RERUNNABLE_MIGRATION = '20260913_add_purchase_models';
const RERUNNABLE_COLUMN_CHECK = `
  SELECT COUNT(*)::int AS c FROM information_schema.columns
  WHERE table_schema='public' AND table_name='suppliers' AND column_name='rut'
`;

async function main() {
  let PrismaClient;
  try {
    PrismaClient = require('@prisma/client').PrismaClient;
  } catch (e) {
    console.error('[baseline] @prisma/client not available, aborting boot');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    let historyRows = -1;
    try {
      const r = await prisma.$queryRaw`SELECT COUNT(*)::int AS c FROM _prisma_migrations`;
      historyRows = r[0].c;
    } catch {
      historyRows = -1; // history table missing
    }
    if (historyRows === 0 || historyRows === -1) {
      const tables = await prisma.$queryRawUnsafe(
        "SELECT COUNT(*)::int AS c FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name NOT IN ('_prisma_migrations','spatial_ref_sys')",
      );
      if ((tables[0]?.c ?? 0) === 0) {
        console.log('[baseline] empty database, skipping (migrate deploy will create schema)');
      } else if (historyRows === -1) {
        console.log('[baseline] non-empty DB without history, marking migrations as applied...');
        for (const m of BASELINE_MIGRATIONS) {
          try {
            execSync(`npx prisma migrate resolve --applied "${m}"`, { stdio: 'inherit' });
          } catch {
            console.log(`[baseline] resolve ${m} failed (probably already applied), continuing`);
          }
        }
        console.log('[baseline] done');
      }
    } else {
      console.log('[baseline] migration history present');
    }

    // Always: make sure a wrongly-recorded 20260913 gets re-executed
    // instead of failing checksum drift detection.
    await ensureRerunnable(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function ensureRerunnable(prisma) {
  const { execSync: exec } = require('child_process');
  try {
    const rows = await prisma.$queryRawUnsafe(RERUNNABLE_COLUMN_CHECK);
    if ((rows[0]?.c ?? 1) > 0) return; // schema already has it
    console.log(`[baseline] ${RERUNNABLE_MIGRATION} recorded but not executed; rolling back in history so it re-runs...`);
    exec(`npx prisma migrate resolve --rolled-back "${RERUNNABLE_MIGRATION}"`, { stdio: 'inherit' });
    console.log('[baseline] rolled back in history; migrate deploy will execute it');
  } catch (e) {
    console.log(`[baseline] rerunnable check skipped: ${e?.message || e}`);
  }
}

main().catch((e) => {
  console.error('[baseline] fatal:', e?.message || e);
  process.exit(1);
});
