-- Verificación post-lockdown RLS. Ambas queries deben devolver 0 filas.
-- Ejecutar conectado como postgres en Supabase (SQL Editor).

-- 1. Tablas de public sin RLS
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity;

-- 2. Permisos residuales de anon/authenticated en public
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee IN ('anon', 'authenticated') AND table_schema = 'public';
