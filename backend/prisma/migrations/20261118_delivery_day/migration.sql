-- Día de entrega como calendario Chile (YYYY-MM-DD).
--
-- Problema que corrige: `deliveryDate` se escribía con `new Date('YYYY-MM-DD')`,
-- es decir 00:00 UTC. Los rangos de día Chile empiezan a las 03:00Z (verano) o
-- 04:00Z (invierno), así que toda entrega quedaba un día corrida: el filtro del
-- 16-11 devolvía 0 filas habiendo 2, y "Hoy" nunca contaba lo de hoy.
--
-- `deliveryDay` guarda el día tal como lo eligió el usuario. No hay aritmética
-- de zonas horarias: comparar strings es exacto y no depende del horario de
-- verano.
--
-- Backfill: el valor actual está en UTC-medianoche y ese día UTC ES el día que
-- se eligió al agendar, así que basta con recortarlo. Es idempotente.

ALTER TABLE "deliveries" ADD COLUMN IF NOT EXISTS "deliveryDay" TEXT;

UPDATE "deliveries"
SET "deliveryDay" = to_char("deliveryDate" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
WHERE "deliveryDay" IS NULL
  AND "deliveryDate" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "deliveries_deliveryDay_windowStart_idx"
  ON "deliveries" ("deliveryDay", "windowStart");

CREATE INDEX IF NOT EXISTS "deliveries_deliveryDay_status_idx"
  ON "deliveries" ("deliveryDay", "status");
