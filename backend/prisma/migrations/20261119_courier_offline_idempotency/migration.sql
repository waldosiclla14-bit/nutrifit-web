-- Fase 5: idempotency receipts for queued courier actions.
-- Additive only. The client sends one stable key per action; the server stores
-- the first successful response and replays it for duplicates.

CREATE TABLE IF NOT EXISTS "courier_action_receipts" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "deliveryId" TEXT,
    "day" TEXT,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_action_receipts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "courier_action_receipts_courierId_createdAt_idx"
    ON "courier_action_receipts"("courierId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "courier_action_receipts" ADD CONSTRAINT "courier_action_receipts_courierId_fkey"
    FOREIGN KEY ("courierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
