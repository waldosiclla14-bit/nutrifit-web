import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ChatHistoryItem = { role: 'user' | 'model'; text: string };

const MODEL = 'gemini-3.5-flash';

function fmtCLP(n: number): string {
  try {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `$${n}`;
  }
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private prisma: PrismaService) {}

  isReady(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  private async buildSnapshot(): Promise<string> {
    const lines: string[] = [];
    const today = new Date().toISOString().slice(0, 10);
    lines.push(`Fecha actual: ${today} (zona America/Santiago)`);
    lines.push('Negocio: NutriFit Chile, suplementos con entrega en Metro de Santiago. Moneda CLP.');

    try {
      const low = await this.prisma.productVariant.findMany({
        where: { isActive: true, physicalStock: { lte: 10 } },
        select: {
          variantName: true,
          sku: true,
          physicalStock: true,
          lowStockAlert: true,
          product: { select: { name: true } },
        },
        orderBy: { physicalStock: 'asc' },
        take: 12,
      });
      if (low.length === 0) {
        lines.push('Stock: sin variantes con 10 o menos unidades.');
      } else {
        lines.push(
          'Stock bajo (variante | sku | stock | alerta): ' +
            low
              .map((v: any) => `${v.product?.name || ''} ${v.variantName} | ${v.sku} | ${v.physicalStock}u | alerta ${v.lowStockAlert}`)
              .join(' ; '),
        );
      }
    } catch (e: any) {
      lines.push('Stock: no disponible.');
      this.logger.warn(`snapshot lowStock: ${e?.message}`);
    }

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const [month, pending] = await Promise.all([
        this.prisma.order.aggregate({
          _sum: { total: true },
          _count: true,
          where: { createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
        }),
        this.prisma.order.count({ where: { status: 'PENDING' } }),
      ]);
      lines.push(`Ventas del mes: ${month._count} ordenes por ${fmtCLP(month._sum.total || 0)}.`);
      lines.push(`Ordenes pendientes (PENDING): ${pending}.`);
    } catch (e: any) {
      lines.push('Ventas: no disponible.');
      this.logger.warn(`snapshot sales: ${e?.message}`);
    }

    try {
      const days30 = new Date();
      days30.setDate(days30.getDate() - 30);
      const top = await this.prisma.orderItem.groupBy({
        by: ['productName'],
        _sum: { total: true, quantity: true },
        where: { order: { createdAt: { gte: days30 }, status: { not: 'CANCELLED' } } },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      });
      if (top.length > 0) {
        lines.push(
          'Top productos 30 dias (producto | uds | total): ' +
            top.map((t: any) => `${t.productName} | ${t._sum.quantity}u | ${fmtCLP(t._sum.total || 0)}`).join(' ; '),
        );
      }
    } catch (e: any) {
      this.logger.warn(`snapshot top products: ${e?.message}`);
    }

    return lines.join('\n');
  }

  async chat(message: string, history: ChatHistoryItem[] = []): Promise<{ reply: string }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('IA no configurada (falta GEMINI_API_KEY)');
    }
    const clean = String(message || '').trim().slice(0, 1000);
    if (!clean) throw new ServiceUnavailableException('Mensaje vacío');

    const snapshot = await this.buildSnapshot();
    const systemPrompt = `Eres el Copiloto operativo de NutriFit Chile (tienda de suplementos con entrega en Metro de Santiago).
Respondes en español chileno neutro, breve y accionable (maximo 150 palabras).
Usa SOLO los datos reales del contexto. Si algo no esta en los datos, dilo y sugiere donde verlo en el panel.
Formato: texto plano con saltos de linea, puedes usar 1-2 emojis. Nada de markdown complejo ni tablas.

CONTEXTO REAL DEL NEGOCIO:
${snapshot}`;

    const contents: any[] = [{ parts: [{ text: `${systemPrompt}\n\nHistorial:\n${history.slice(-8).map((h) => `${h.role === 'user' ? 'Vendedor' : 'Copiloto'}: ${h.text}`.slice(0, 500)).join('\n')}\n\nVendedor: ${clean}\nCopiloto:` }] }];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: { maxOutputTokens: 1024 },
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        const err = await response.text().catch(() => '');
        this.logger.error(`Gemini chat error ${response.status}: ${err.slice(0, 200)}`);
        throw new ServiceUnavailableException('La IA no respondió, intenta de nuevo.');
      }
      const data = await response.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text.trim()) throw new ServiceUnavailableException('La IA no respondió, intenta de nuevo.');
      return { reply: text.trim().slice(0, 2000) };
    } catch (e: any) {
      if (e instanceof ServiceUnavailableException) throw e;
      this.logger.error(`Gemini chat failed: ${e?.message}`);
      throw new ServiceUnavailableException('La IA no respondió, intenta de nuevo.');
    } finally {
      clearTimeout(timer);
    }
  }
}
