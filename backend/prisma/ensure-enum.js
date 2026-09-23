/**
 * Pre-migration enum patch.
 *
 * `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block, and
 * `prisma migrate deploy` wraps every migration.sql in one. So enum labels
 * that are NEW (didn't exist when the DB was baselined via `db push`) must
 * be added here first, outside any transaction. The matching block inside
 * migration.sql then becomes a no-op (guard sees the label already exists).
 *
 * Runs on every boot before `migrate deploy` (see Dockerfile CMD).
 * Idempotent: exits 0 whether the label existed or not.
 */
const { PrismaClient } = require('@prisma/client');

const REQUIRED_LABELS = [
  { type: 'OrderStatus', label: 'AGENDADO' },
];

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const { type, label } of REQUIRED_LABELS) {
      // Single statement, auto-committed: NOT inside a transaction block.
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM pg_type WHERE typname = '${type}') AND NOT EXISTS (
            SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = '${type}' AND e.enumlabel = '${label}'
          ) THEN
            ALTER TYPE "${type}" ADD VALUE '${label}';
          END IF;
        END $$;
      `);
      console.log(`[ensure-enum] ${type}.${label} ok`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('[ensure-enum] fatal:', e?.message || e);
  process.exit(1);
});
