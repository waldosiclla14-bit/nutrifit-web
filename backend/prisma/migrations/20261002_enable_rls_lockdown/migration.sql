-- RLS lockdown: cierra PostgREST (anon/authenticated) en todo public.
-- El backend (Prisma como postgres/BYPASSRLS) no se ve afectado.
-- El frontend no usa la anon key (verificado): nada se rompe.
-- Idempotente y transaccional (sin ALTER TYPE ... ADD VALUE aquí).

-- 1. RLS activo en todas las tablas actuales de public
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- 2. Quitar permisos a los roles de la API (sin políticas = denegar todo)
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- 3. Tablas/secuencias/funciones FUTURAS nacen cerradas
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- 4. RLS automático en tablas nuevas (event trigger, corre como postgres)
CREATE OR REPLACE FUNCTION public.auto_enable_rls() RETURNS event_trigger
LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM pg_event_trigger_ddl_commands()
           WHERE command_tag = 'CREATE TABLE' AND schema_name = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', r.object_identity);
  END LOOP;
END $$;

DROP EVENT TRIGGER IF EXISTS enable_rls_on_create;
CREATE EVENT TRIGGER enable_rls_on_create ON ddl_command_end
WHEN TAG IN ('CREATE TABLE') EXECUTE FUNCTION public.auto_enable_rls();
