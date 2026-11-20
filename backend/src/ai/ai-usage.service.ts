import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export type QuotaUsage = { used: number; limit: number; resetAt: string };

@Injectable()
export class AiUsageService {
  constructor(private prisma: PrismaService) {}

  get limit(): number {
    return Math.max(1, Number(process.env.AI_DRAFT_DAILY_LIMIT) || 60);
  }

  /**
   * Descuenta una llamada de la cuota diaria. Incremento atómico con
   * INSERT ... ON CONFLICT para evitar carreras y transacciones interactivas
   * (pgbouncer). Si el límite está agotado no devuelve fila y respondemos 429.
   */
  async consume(userId: string): Promise<QuotaUsage> {
    const limit = this.limit;
    const rows = await this.prisma.$queryRaw<{ calls: number; resetAt: Date }[]>`
      INSERT INTO "ai_usage_daily" ("id","userId","day","calls","tokens","updatedAt")
      VALUES (${randomUUID()}, ${userId}, CURRENT_DATE, 1, 0, NOW())
      ON CONFLICT ("userId","day") DO UPDATE
        SET "calls" = "ai_usage_daily"."calls" + 1, "updatedAt" = NOW()
        WHERE "ai_usage_daily"."calls" < ${limit}
      RETURNING "calls", (CURRENT_DATE + INTERVAL '1 day')::date AS "resetAt"`;

    if (rows.length === 0) {
      throw new HttpException(
        `Cuota diaria agotada (${limit} borradores). Intenta mañana.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return { used: Number(rows[0].calls), limit, resetAt: toDay(rows[0].resetAt) };
  }

  /** Devuelve la llamada cuando Gemini falla: un outage no debe quemar la cuota. */
  async refund(userId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "ai_usage_daily"
      SET "calls" = GREATEST("calls" - 1, 0), "updatedAt" = NOW()
      WHERE "userId" = ${userId} AND "day" = CURRENT_DATE`;
  }

  /** Solo lectura: para mostrar la cuota y precalentar el servicio sin gastar una llamada. */
  async peek(userId: string): Promise<QuotaUsage> {
    const rows = await this.prisma.$queryRaw<{ calls: number; resetAt: Date }[]>`
      SELECT "calls", (CURRENT_DATE + INTERVAL '1 day')::date AS "resetAt"
      FROM "ai_usage_daily"
      WHERE "userId" = ${userId} AND "day" = CURRENT_DATE
      LIMIT 1`;

    return {
      used: Number(rows[0]?.calls || 0),
      limit: this.limit,
      resetAt: toDay(rows[0]?.resetAt),
    };
  }

  async addTokens(userId: string, tokens: number): Promise<void> {
    if (!Number.isFinite(tokens) || tokens <= 0) return;
    await this.prisma.$executeRaw`
      UPDATE "ai_usage_daily"
      SET "tokens" = "tokens" + ${Math.round(tokens)}, "updatedAt" = NOW()
      WHERE "userId" = ${userId} AND "day" = CURRENT_DATE`;
  }
}

function toDay(value?: Date | string): string {
  if (value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
