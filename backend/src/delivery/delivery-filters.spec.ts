import { DeliveryStatus } from '@prisma/client';
import {
  DELIVERY_ORDER_BY,
  buildDeliveryWhere,
  parseDeliveryDay,
  resolveDeliverySchedule,
  resolvePagination,
} from './delivery-filters';
import { ESTADOS_PENDIENTES, ESTADOS_VISIBLES, esActivoHoy, esFinal, esPendiente } from './delivery-rules';
import { addDaysISO, chileWeekRange, todayChileISO } from '../common/date-range';

describe('delivery-rules', () => {
  it('clasifica los estados como pendiente, final o cerrado sin entrega', () => {
    expect(esPendiente(DeliveryStatus.SCHEDULED)).toBe(true);
    expect(esPendiente(DeliveryStatus.IN_ROUTE)).toBe(true);
    expect(esPendiente(DeliveryStatus.DELIVERED)).toBe(false);
    expect(esPendiente(DeliveryStatus.CANCELLED)).toBe(false);
    // Reprogramado no es trabajo de hoy ni pendiente eterno.
    expect(esPendiente(DeliveryStatus.RESCHEDULED)).toBe(false);

    expect(esFinal(DeliveryStatus.DELIVERED)).toBe(true);
    expect(esFinal(DeliveryStatus.NOT_DELIVERED)).toBe(true);
    expect(esFinal(DeliveryStatus.IN_ROUTE)).toBe(false);

    expect(esActivoHoy(DeliveryStatus.CANCELLED)).toBe(false);
    expect(esActivoHoy(DeliveryStatus.RESCHEDULED)).toBe(false);
    expect(esActivoHoy(DeliveryStatus.DELIVERED)).toBe(true);
  });

  it('los tres conjuntos no se solapan', () => {
    for (const estado of ESTADOS_PENDIENTES) {
      expect(ESTADOS_VISIBLES).toContain(estado);
      expect(esFinal(estado)).toBe(false);
    }
    expect(ESTADOS_VISIBLES).not.toContain(DeliveryStatus.CANCELLED);
    expect(ESTADOS_VISIBLES).not.toContain(DeliveryStatus.RESCHEDULED);
  });
});

describe('parseDeliveryDay', () => {
  it('acepta un día de calendario', () => {
    expect(parseDeliveryDay('2026-11-18')).toBe('2026-11-18');
    expect(parseDeliveryDay('')).toBeNull();
    expect(parseDeliveryDay(null)).toBeNull();
  });

  it('rechaza fechas con hora o imposibles', () => {
    expect(() => parseDeliveryDay('2026-11-18T10:00:00Z')).toThrow('Día inválido');
    expect(() => parseDeliveryDay('2026-02-30')).toThrow('Día inválido');
    expect(() => parseDeliveryDay('18-11-2026')).toThrow('Día inválido');
  });
});

describe('resolveDeliverySchedule', () => {
  it('guarda el día tal cual y el inicio del día Chile (verano = 03:00Z)', () => {
    const r = resolveDeliverySchedule('2026-11-18');
    expect(r.deliveryDay).toBe('2026-11-18');
    expect(r.deliveryDate?.toISOString()).toBe('2026-11-18T03:00:00.000Z');
  });

  it('usa 04:00Z en invierno', () => {
    const r = resolveDeliverySchedule('2026-07-15');
    expect(r.deliveryDay).toBe('2026-07-15');
    expect(r.deliveryDate?.toISOString()).toBe('2026-07-15T04:00:00.000Z');
  });

  it('borde de medianoche: 23:30 Chile del 18 sigue siendo el 18', () => {
    // 2026-11-19T02:30Z = 23:30 del 18 en Chile (UTC-3)
    const r = resolveDeliverySchedule('2026-11-19T02:30:00.000Z');
    expect(r.deliveryDay).toBe('2026-11-18');
    expect(r.deliveryDate?.toISOString()).toBe('2026-11-18T03:00:00.000Z');
  });

  it('borde de medianoche: 00:30 Chile del 19 ya es el 19', () => {
    const r = resolveDeliverySchedule('2026-11-19T03:30:00.000Z');
    expect(r.deliveryDay).toBe('2026-11-19');
  });

  it('cambio de horario de verano (2026-09-06: día de 23 horas)', () => {
    const r = resolveDeliverySchedule('2026-09-06');
    expect(r.deliveryDay).toBe('2026-09-06');
    // El día local arranca 04:00Z (UTC-4) y termina 03:00Z del día siguiente.
    expect(r.deliveryDate?.toISOString()).toBe('2026-09-06T04:00:00.000Z');
  });

  it('cambio de horario de invierno (2026-04-05)', () => {
    const r = resolveDeliverySchedule('2026-04-05');
    expect(r.deliveryDay).toBe('2026-04-05');
    expect(r.deliveryDate?.toISOString()).toBe('2026-04-05T04:00:00.000Z');
  });

  it('sin fecha devuelve nulls', () => {
    expect(resolveDeliverySchedule(null)).toEqual({ deliveryDay: null, deliveryDate: null });
    expect(resolveDeliverySchedule('')).toEqual({ deliveryDay: null, deliveryDate: null });
  });
});

describe('buildDeliveryWhere', () => {
  it('por defecto excluye canceladas y reprogramadas y no filtra por fecha', () => {
    const where = buildDeliveryWhere({});
    expect(where.AND).toEqual([{ status: { in: ESTADOS_VISIBLES } }]);
  });

  it('un día exacto compara strings: sin zonas horarias de por medio', () => {
    const where = buildDeliveryWhere({ day: '2026-11-18' }) as any;
    expect(where.AND).toContainEqual({ deliveryDay: '2026-11-18' });
    expect(where.AND).toContainEqual({ status: { in: ESTADOS_VISIBLES } });
  });

  it('un rango usa gte/lte sobre el mismo campo de día', () => {
    const where = buildDeliveryWhere({ from: '2026-11-16', to: '2026-11-22' }) as any;
    expect(where.AND).toContainEqual({ deliveryDay: { gte: '2026-11-16', lte: '2026-11-22' } });
  });

  it('vencidos: solo días anteriores y estados no finales', () => {
    const where = buildDeliveryWhere({ vencidos: '1' }) as any;
    const hoy = todayChileISO();
    expect(where.AND).toContainEqual({ deliveryDay: { lt: hoy } });
    expect(where.AND).toContainEqual({ status: { in: ESTADOS_PENDIENTES } });
    expect(ESTADOS_PENDIENTES).not.toContain(DeliveryStatus.DELIVERED);
    expect(ESTADOS_PENDIENTES).not.toContain(DeliveryStatus.CANCELLED);
  });

  it('incluirCerrados no recorta estados ni fechas', () => {
    const where = buildDeliveryWhere({ incluirCerrados: true });
    expect(where.AND).toBeUndefined();
  });

  it('un estado explícito manda sobre la lista por defecto', () => {
    const where = buildDeliveryWhere({ status: DeliveryStatus.CANCELLED, day: '2026-11-18' }) as any;
    expect(where.AND).toContainEqual({ status: DeliveryStatus.CANCELLED });
    expect(where.AND).not.toContainEqual({ status: { in: ESTADOS_VISIBLES } });
  });

  it('ordena por estación y luego por ventana', () => {
    expect(DELIVERY_ORDER_BY[0]).toEqual({ station: { sortOrder: 'asc' } });
    expect(DELIVERY_ORDER_BY[1]).toEqual({ windowStart: 'asc' });
  });
});

describe('resolvePagination', () => {
  it('acota page y limit', () => {
    expect(resolvePagination({ page: '2', limit: '50' })).toEqual({ page: 2, limit: 50 });
    expect(resolvePagination({ page: '0', limit: '9999' })).toEqual({ page: 1, limit: 200 });
    expect(resolvePagination({})).toEqual({ page: 1, limit: 50 });
  });
});

describe('semana Chile', () => {
  it('lunes a domingo aunque el día sea domingo', () => {
    // 2026-11-22 es domingo.
    expect(chileWeekRange('2026-11-22')).toEqual({ from: '2026-11-16', to: '2026-11-22' });
    expect(chileWeekRange('2026-11-16')).toEqual({ from: '2026-11-16', to: '2026-11-22' });
  });

  it('addDaysISO cruza fin de mes y año', () => {
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28');
  });
});
