-- Fase 2 - RBAC del repartidor.
--
-- 1) `deliveries.assignedTo` pasa a ser una FK real a `users`. Antes era un
--    String suelto: no se podia listar "mis entregas" ni saber a quien se
--    asigno. Se limpian valores huerfanos antes de crear la restriccion para
--    que la migracion no falle en bases con datos legacy.
-- 2) PIN del repartidor: `pinHash` (bcrypt) + `pinLookup` (HMAC determinista
--    para localizar la cuenta sin recorrer usuarios). Unico, admite NULL.
-- 3) `failureReason` para cerrar una entrega sin exito con motivo.

-- PIN
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pinHash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pinLookup" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_pinLookup_key"
  ON "users" ("pinLookup");

-- FK de asignacion
UPDATE "deliveries" d
SET "assignedTo" = NULL
WHERE d."assignedTo" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = d."assignedTo");

ALTER TABLE "deliveries" DROP CONSTRAINT IF EXISTS "deliveries_assignedTo_fkey";
ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_assignedTo_fkey"
  FOREIGN KEY ("assignedTo") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Motivo de fallo
ALTER TABLE "deliveries" ADD COLUMN IF NOT EXISTS "failureReason" TEXT;
