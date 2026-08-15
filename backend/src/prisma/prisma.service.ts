import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL || '';
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    const p = u.searchParams;
    // Usar la URL de Neon tal cual (conexión directa, pool por defecto de
    // Prisma). Las transacciones interactivas ($transaction) requieren
    // conexión de sesión, por eso NO se usa pgbouncer/connection_limit bajos.
    // El keep-alive en /api/ping evita la pausa del compute free de Neon.
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
