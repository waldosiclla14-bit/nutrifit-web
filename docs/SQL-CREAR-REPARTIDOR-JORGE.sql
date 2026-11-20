-- Crear cuenta de repartidor Jorge Cisneros
-- Ejecutar en Supabase SQL Editor (o psql) sobre la base de producción.
-- El password es un hash bcrypt de "nutrifit123" (no se usa para login: el repartidor entra con PIN).
-- Después de crear, asigna el PIN desde el admin: PATCH /api/users/<id>/pin  { "pin": "1234" }
-- o desde el panel: Rentabilidad logística -> Crear repartidor (UI).

INSERT INTO "users" ("id", "email", "name", "role", "password", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'jorge@nutrifit.cl', 'Jorge Cisneros', 'DELIVERY',
       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad6546.LQJq3VqK',
       true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "users" WHERE "email" = 'jorge@nutrifit.cl');
