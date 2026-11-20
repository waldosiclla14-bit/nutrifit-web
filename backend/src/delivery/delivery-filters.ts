import { BadRequestException } from '@nestjs/common';
import { DeliveryStatus, Prisma } from '@prisma/client';
import { startOfChileDay, todayChileISO } from '../common/date-range';
import { ESTADOS_PENDIENTES, ESTADOS_VISIBLES } from './delivery-rules';

/**
 * Filtros de logística. Una sola puerta de entrada: la usan la tabla y los
 * contadores, así no pueden volver a desincronizarse.
 *
 * Definiciones (las mismas que se muestran en la UI):
 * - Hoy:       deliveryDay = hoy (Chile), sin canceladas ni reprogramadas.
 * - Pendientes: de Hoy, estados no finales.
 * - Entregados: de Hoy, estado DELIVERED.
 * - Vencidos:  deliveryDay < hoy y estado no final. Nunca se suman a Pendientes.
 * - Semana:    deliveryDay entre lunes y domingo de la semana Chile.
 */
export type DeliveryScope = {
  /** Día exacto, YYYY-MM-DD. */
  day?: string;
  /** Rango inclusivo de días, YYYY-MM-DD. */
  from?: string;
  to?: string;
  status?: string;
  stationId?: string;
  line?: string;
  commune?: string;
  assignedTo?: string;
  /** Búsqueda libre: pedido, cliente, estación o código. */
  q?: string;
  /** Solo atrasadas (día anterior sin estado final). */
  vencidos?: boolean | string;
  /** Incluye canceladas y reprogramadas. */
  incluirCerrados?: boolean | string;
  page?: string | number;
  limit?: string | number;
};

const BARE_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Valida un día de calendario. Rechaza fechas ambiguas o con hora. */
export function parseDeliveryDay(value?: string | null): string | null {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const clean = String(value).trim();
  if (!BARE_DATE.test(clean)) {
    throw new BadRequestException('Día inválido (se espera YYYY-MM-DD)');
  }
  const [y, m, d] = clean.split('-').map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    throw new BadRequestException('Día inválido');
  }
  return clean;
}

/**
 * Resuelve el día y el instante de inicio para guardar una entrega.
 * Es el ÚNICO lugar donde una fecha de entrega se convierte a UTC.
 */
export function resolveDeliverySchedule(value?: string | null): {
  deliveryDay: string | null;
  deliveryDate: Date | null;
} {
  if (value === undefined || value === null || String(value).trim() === '') {
    return { deliveryDay: null, deliveryDate: null };
  }
  const raw = String(value).trim();
  const bare = BARE_DATE.test(raw);
  const parsed = new Date(raw);
  if (!bare && Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('Fecha de entrega inválida');
  }
  const day = bare ? raw : todayChileISO(parsed);
  return {
    deliveryDay: parseDeliveryDay(day),
    deliveryDate: startOfChileDay(day),
  };
}

function truthy(value: unknown): boolean {
  return value === true || value === 'true' || value === '1' || value === 1;
}

/**
 * Construye el `where` de Prisma para un scope de logística.
 * No hace consultas: se puede probar sin base de datos.
 */
export function buildDeliveryWhere(scope: DeliveryScope = {}): Prisma.DeliveryWhereInput {
  const where: Prisma.DeliveryWhereInput = {};
  const and: Prisma.DeliveryWhereInput[] = [];

  if (truthy(scope.vencidos)) {
    // Atrasadas: día anterior al de hoy, todavía sin estado final.
    and.push({ deliveryDay: { lt: todayChileISO() } });
    and.push({ status: { in: ESTADOS_PENDIENTES } });
  } else if (truthy(scope.incluirCerrados)) {
    // Sin recorte por fecha: histórico completo.
  } else if (scope.day) {
    and.push({ deliveryDay: parseDeliveryDay(scope.day)! });
  } else {
    const from = parseDeliveryDay(scope.from);
    const to = parseDeliveryDay(scope.to);
    if (from || to) {
      and.push({ deliveryDay: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } });
    }
  }

  if (scope.status) {
    and.push({ status: scope.status as DeliveryStatus });
  } else if (!truthy(scope.incluirCerrados)) {
    // Por defecto no se muestran canceladas ni reprogramadas.
    and.push({ status: { in: ESTADOS_VISIBLES } });
  }

  if (scope.stationId) and.push({ stationId: scope.stationId });
  if (scope.assignedTo) and.push({ assignedTo: scope.assignedTo });

  if (scope.line || scope.commune) {
    and.push({
      station: {
        ...(scope.line ? { line: scope.line } : {}),
        ...(scope.commune ? { commune: scope.commune } : {}),
      },
    });
  }

  const q = String(scope.q || '').trim();
  if (q) {
    and.push({
      OR: [
        { deliveryCode: { contains: q } },
        { order: { orderNumber: { contains: q, mode: 'insensitive' } } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { station: { name: { contains: q, mode: 'insensitive' } } },
      ],
    });
  }

  if (and.length) where.AND = and;
  return where;
}

/**
 * Orden de la ruta: estación (según su orden de recorrido) y luego la ventana
 * horaria. El código de entrega desempata para que la lista sea estable.
 */
export const DELIVERY_ORDER_BY: Prisma.DeliveryOrderByWithRelationInput[] = [
  { station: { sortOrder: 'asc' } },
  { windowStart: 'asc' },
  { deliveryCode: 'asc' },
];

export function resolvePagination(scope: DeliveryScope): { page: number; limit: number } {
  const page = Math.max(1, parseInt(String(scope.page ?? ''), 10) || 0);
  const limit = Math.min(200, Math.max(1, parseInt(String(scope.limit ?? ''), 10) || 50));
  return { page, limit };
}
