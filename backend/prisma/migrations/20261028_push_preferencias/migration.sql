-- Push PWA fase 6A: flag de suscripción activa y preferencias de notificación.
--
-- Contexto: el esquema se actualizó el 22-oct sin migración. `db-push` no se
-- ejecuta desde el 12-ago, así que la base de producción no tenía ni la
-- columna ni las tablas. Sin este archivo, `push.service.ts` fallaba al
-- consultar `notificaciones_enviadas` y `delivery.service.ts` rompía el
-- cambio de estado de entrega (llama a `push.broadcast` sin try/catch).
--
-- Convención del repo: totalmente idempotente. El baseline de arranque
-- (prisma/baseline.js) solo marca como aplicadas las 3 migraciones de
-- ajustes de horario; el resto se RE-EJECUTA en cada boot sobre bases
-- creadas con `db push`. Por eso todo usa IF NOT EXISTS / guardas.
--
-- RLS: la event trigger `enable_rls_on_create` (20261002) activa RLS
-- automáticamente en las tablas nuevas de public. No hace falta aquí.

-- 1. Columna `activa` en push_subscriptions (tabla creada en 20260926).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'push_subscriptions'
  ) THEN
    ALTER TABLE "push_subscriptions"
      ADD COLUMN IF NOT EXISTS "activa" BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- 2. Preferencias de notificación (una fila por usuario).
CREATE TABLE IF NOT EXISTS "preferencias_notificacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nuevaVenta" BOOLEAN NOT NULL DEFAULT true,
    "pagoRecibido" BOOLEAN NOT NULL DEFAULT true,
    "pedidoAgendado" BOOLEAN NOT NULL DEFAULT true,
    "recordatorioAgendados" BOOLEAN NOT NULL DEFAULT true,
    "stockBajo" BOOLEAN NOT NULL DEFAULT true,
    "resumenDiario" BOOLEAN NOT NULL DEFAULT true,
    "silencioDesde" TEXT,
    "silencioHasta" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preferencias_notificacion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "preferencias_notificacion_usuarioId_key"
    ON "preferencias_notificacion"("usuarioId");

-- Redundante con el índice único de arriba, pero está declarado en el
-- esquema (@@index) y se mantiene para que no haya deriva schema/migración.
CREATE INDEX IF NOT EXISTS "preferencias_notificacion_usuarioId_idx"
    ON "preferencias_notificacion"("usuarioId");

-- 3. Registro anti-duplicado de notificaciones enviadas (tipo + referencia).
CREATE TABLE IF NOT EXISTS "notificaciones_enviadas" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "enviadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_enviadas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "notificaciones_enviadas_tipo_referencia_key"
    ON "notificaciones_enviadas"("tipo", "referencia");
