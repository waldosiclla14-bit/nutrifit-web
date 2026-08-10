# NutriFit ERP

Sistema completo ERP + POS + Ecommerce para NutriFit — tienda de suplementos deportivos en Chile.

## Arquitectura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Next.js    │────▶│  NestJS API │────▶│ PostgreSQL  │
│  (Frontend) │     │  (Backend)  │     │   (Prisma)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Módulos incluidos

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| Ecommerce | Catálogo, carrito, checkout | ✅ |
| Órdenes | Estados: Pendiente → Confirmada → Pagada → Entregada | ✅ |
| Stock | Reserva automática, alertas de stock bajo | ✅ |
| Clientes | CRM básico con historial de compras | ✅ |
| Panel Admin | Dashboard, órdenes, productos, clientes | ✅ |
| POS Táctil | Ventas presenciales con múltiples métodos de pago | ✅ |
| Caja diaria | Apertura, cierre, arqueo | ✅ |
| Facturación SII | Preparado para DTE (Fase 2) | 🚧 |
| WhatsApp API | Notificaciones automáticas (Fase 2) | 🚧 |

## Inicio rápido

### Requisitos
- Docker + Docker Compose
- Node.js 20+ (opcional, para desarrollo local)

### 1. Clonar y configurar
```bash
cd nutrifit-erp
cp .env.example .env
```

### 2. Levantar con Docker
```bash
docker-compose up --build
```

### 3. Seed de datos (primera vez)
```bash
docker exec -it nutrifit-api npx prisma db seed
```

## URLs de acceso

| Servicio | URL |
|----------|-----|
| Tienda (pública) | http://localhost:3000 |
| Panel Admin | http://localhost:3000/admin |
| POS Táctil | http://localhost:3000/pos |
| API REST | http://localhost:3001/api |
| Documentación API | Deshabilitada en producción |

## Credenciales iniciales

Define `ADMIN_PASSWORD` y `SELLER_PASSWORD` como secretos de entorno antes de ejecutar el seed. No se mantienen credenciales demo en el repositorio.

## Flujo de venta (sin pasarela integrada)

1. **Cliente** crea orden en la web → sistema reserva stock
2. **Admin** ve la orden en el panel → confirma disponibilidad
3. **Admin** envía datos de transferencia por WhatsApp
4. **Cliente** paga y envía comprobante
5. **Admin** confirma pago en el panel → stock se descuenta definitivamente
6. **Admin** coordina entrega en estación de metro

## Flujo POS (venta presencial)

1. Vendedor abre POS → busca producto o escanea
2. Agrega al carrito → ingresa datos del cliente
3. Selecciona método de pago (efectivo/transferencia/tarjeta)
4. Confirma → orden creada y pagada instantáneamente

## Stack tecnológico

### Frontend
- Next.js 14 (App Router)
- Tailwind CSS
- Zustand (estado global)
- Lucide React (iconos)

### Backend
- NestJS
- Prisma ORM
- JWT Auth
- Swagger/OpenAPI

### Base de datos
- PostgreSQL 16
- Schema: 14 tablas (usuarios, clientes, productos, variantes, lotes, órdenes, items, caja, auditoría)

### Infraestructura
- Docker + Docker Compose
- Hot reload en desarrollo

## Estructura del proyecto

```
nutrifit-erp/
├── backend/
│   ├── src/
│   │   ├── auth/           # JWT login
│   │   ├── users/          # Gestión de usuarios
│   │   ├── customers/      # Clientes CRM
│   │   ├── products/       # Productos y variantes
│   │   ├── orders/         # Órdenes y estados
│   │   ├── cash-register/  # Caja diaria
│   │   ├── audit/          # Logs de auditoría
│   │   └── prisma/         # Prisma service
│   ├── prisma/
│   │   ├── schema.prisma   # Modelo de datos
│   │   └── seed.ts         # Datos iniciales
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (shop)/     # Tienda pública
│   │   │   ├── admin/      # Panel admin
│   │   │   └── pos/        # Punto de venta
│   │   ├── store/          # Zustand stores
│   │   ├── lib/            # API client, utils
│   │   └── types/          # TypeScript types
│   ├── package.json
│   ├── tailwind.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Próximos pasos (Fase 2)

- [ ] Integrar Flow Chile / Webpay / MercadoPago
- [ ] WhatsApp Business API (notificaciones automáticas)
- [ ] Facturación electrónica SII (DTE)
- [ ] Reportes exportables (Excel/PDF)
- [ ] Programa de puntos y referidos
- [ ] IA para recomendaciones de productos

## Licencia

MIT — NutriFit Team
