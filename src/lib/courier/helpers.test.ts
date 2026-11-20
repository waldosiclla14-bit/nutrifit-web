import {
  addDaysISO,
  courierActions,
  dayLabel,
  formatCLP,
  formatWindow,
  groupByStation,
  hasPodEvidence,
  isClosed,
  isValidPin,
  paymentMethodLabel,
  sanitizePin,
} from './helpers';
import type { CourierDelivery } from './types';

function entrega(overrides: Partial<CourierDelivery> = {}): CourierDelivery {
  return {
    id: 'd1',
    codigo: 'COD-1',
    dia: '2026-11-19',
    ventana: { inicio: '17:00', fin: '17:30' },
    estado: 'CONFIRMED',
    estacion: { nombre: 'Baquedano', linea: 'L1', lineaNombre: 'Línea 1', comuna: 'Santiago' },
    direccion: null,
    puntoEncuentro: 'Acceso principal',
    notas: null,
    cliente: { nombre: 'Ana', telefono: '+56911111111' },
    pedido: { numero: 'NF-1', total: 25000 },
    cobro: { monto: 25000, estado: 'POR_COBRAR', metodo: 'EFECTIVO' },
    ...overrides,
  };
}

describe('courierActions', () => {
  it('ofrece iniciar ruta desde un pedido preparado', () => {
    expect(courierActions('CONFIRMED')).toEqual([
      expect.objectContaining({ to: 'IN_ROUTE' }),
    ]);
  });

  it('en ruta permite llegar, entregar y cerrar con motivo', () => {
    const actions = courierActions('IN_ROUTE');
    expect(actions.map((a) => a.to)).toEqual([
      'ARRIVED',
      'DELIVERED',
      'NOT_DELIVERED',
      'CUSTOMER_UNAVAILABLE',
      'INCIDENT',
    ]);
    expect(actions.filter((a) => a.requiresReason).map((a) => a.to)).toEqual([
      'NOT_DELIVERED',
      'CUSTOMER_UNAVAILABLE',
      'INCIDENT',
    ]);
  });

  it('no ofrece acciones sobre una entrega ya cerrada', () => {
    expect(courierActions('DELIVERED')).toEqual([]);
    expect(courierActions('CANCELLED')).toEqual([]);
    expect(isClosed('INCIDENT')).toBe(true);
    expect(isClosed('IN_ROUTE')).toBe(false);
  });
});

describe('groupByStation', () => {
  it('agrupa conservando el orden del servidor', () => {
    const groups = groupByStation([
      entrega({ id: 'a', estacion: { nombre: 'Baquedano', linea: 'L1', lineaNombre: 'Línea 1', comuna: 'Santiago' } }),
      entrega({ id: 'b', estacion: { nombre: 'Baquedano', linea: 'L1', lineaNombre: 'Línea 1', comuna: 'Santiago' } }),
      entrega({ id: 'c', estacion: { nombre: 'Los Leones', linea: 'L1', lineaNombre: 'Línea 1', comuna: 'Providencia' } }),
    ]);

    expect(groups.map((g) => g.nombre)).toEqual(['Baquedano', 'Los Leones']);
    expect(groups[0].entregas.map((e) => e.id)).toEqual(['a', 'b']);
    expect(groups[1].comuna).toBe('Providencia');
  });

  it('junta las entregas sin estación en un grupo propio', () => {
    const groups = groupByStation([entrega({ estacion: null })]);
    expect(groups[0].nombre).toBe('Sin estación');
  });
});

describe('formato', () => {
  it('ventana tolera datos incompletos', () => {
    expect(formatWindow('17:00', '17:30')).toBe('17:00–17:30');
    expect(formatWindow('17:00', null)).toBe('17:00');
    expect(formatWindow(null, null)).toBe('Sin horario');
  });

  it('etiqueta hoy y mañana por string de calendario', () => {
    expect(dayLabel('2026-11-19', '2026-11-19', '2026-11-20')).toBe('Hoy');
    expect(dayLabel('2026-11-20', '2026-11-19', '2026-11-20')).toBe('Mañana');
    expect(dayLabel('2026-12-01', '2026-11-19', '2026-11-20')).toBe('01/12');
  });

  it('suma días sin corrimientos de zona horaria', () => {
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('muestra CLP sin decimales', () => {
    expect(formatCLP(25000).replace(/\s/g, '')).toContain('25.000');
  });
});

describe('PIN', () => {
  it('deja solo dígitos y corta en 6', () => {
    expect(sanitizePin('12-34 56 78')).toBe('123456');
    expect(sanitizePin('abcd')).toBe('');
  });

  it('exige entre 4 y 6 dígitos', () => {
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('1234567')).toBe(false);
  });
});

describe('POD y cobro', () => {
  it('acepta código o foto como evidencia', () => {
    expect(hasPodEvidence('5832', null)).toBe(true);
    expect(hasPodEvidence('', 'data:image/jpeg;base64,abc')).toBe(true);
    expect(hasPodEvidence('  ', '')).toBe(false);
  });

  it('etiqueta los métodos que vienen del pedido', () => {
    expect(paymentMethodLabel('EFECTIVO')).toBe('Efectivo');
    expect(paymentMethodLabel('transferencia')).toBe('Transferencia');
    expect(paymentMethodLabel('OTRO')).toBe('Otro medio');
  });
});
