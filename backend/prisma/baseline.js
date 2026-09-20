/**
 * First-boot baseline for production databases created via `db push`
 * (tables exist but there is no _prisma_migrations history).
 *
 * Without this, `prisma migrate deploy` aborts with P3005
 * ("database schema is not empty") and the container exits status 1.
 *
 * Behavior:
 * - Fresh (empty) DB -> skip; `migrate deploy` creates the schema normally.
 * - DB with migration history -> skip; `migrate deploy` works normally.
 * - Non-empty DB without history -> mark local migrations as applied
 *   (`migrate resolve --applied`), then `migrate deploy` becomes a no-op.
 *
 * Safe to run on every boot: it only acts when history is missing.
 */
const { execSync } = require('child_process');

const BASELINE_MIGRATIONS = [
  '20260913_add_purchase_models',
  '20260918_metro_hours_9_to_22',
  '20260918_metro_hours_10_to_22',
  '20260918_metro_hours_8_to_22',
];

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
    if (historyRows > 0) {
      console.log('[baseline] migration history present, skipping');
      return;
    }
    const tables = await prisma.$queryRawUnsafe(
      "SELECT COUNT(*)::int AS c FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name NOT IN ('_prisma_migrations','spatial_ref_sys')",
    );
    if ((tables[0]?.c ?? 0) === 0) {
      console.log('[baseline] empty database, skipping (migrate deploy will create schema)');
      return;
    }
    console.log('[baseline] non-empty DB without history, marking migrations as applied...');
    for (const m of BASELINE_MIGRATIONS) {
      try {
        execSync(`npx prisma migrate resolve --applied "${m}"`, { stdio: 'inherit' });
      } catch {
        console.log(`[baseline] resolve ${m} failed (probably already applied), continuing`);
      }
    }
    console.log('[baseline] done');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('[baseline] fatal:', e?.message || e);
  process.exit(1);
});
