import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL || '';
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    const p = u.searchParams;
    // Enrutar por el endpoint POOLED de Neon (-pooler) con pgbouncer: la
    // conexión directa es inalcanzable/reliable desde este entorno (502s,
    // hangs), mientras el pooler mantiene las consultas rápidas y vivas.
    // connection_limit bajo evita conexiones idle muertas; el keep-alive en
    // /api/ping mantiene el compute despierto. NOTA: las transacciones
    // interactivas no son compatibles con pgbouncer (transaction mode), por
    // eso orders.service usa transacciones NO interactivas.
    if (!u.hostname.includes('-pooler')) {
      const dot = u.hostname.indexOf('.');
      if (dot > 0) {
        u.hostname = `${u.hostname.slice(0, dot)}-pooler${u.hostname.slice(dot)}`;
      }
    }
    if (!p.has('pgbouncer')) p.set('pgbouncer', 'true');
    if (!p.has('connection_limit')) p.set('connection_limit', '5');
    if (!p.has('sslmode')) p.set('sslmode', 'require');
    return u.toString();
  } catch {
    return raw;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ datasources: { db: { url: resolveDatabaseUrl() } } });
  }

  async onModuleInit() {
    // Conexión LAZY: no bloquear el arranque esperando $connect.
    // Prisma 5 conecta en el primer query; si la DB no responde lo ideal,
    // el boot no se cuelga y el health check pasa. Errores -> por request.
    this.logger.log('Prisma: modo lazy (sin $connect en arranque)');
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {
      /* ignore */
    }
  }

  async ensureConnected(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Prisma: conexión al DB establecida');
    } catch (err) {
      this.logger.warn(
        `Prisma: $connect falló (la app sigue sin conexión eager; se reintentará por query): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
