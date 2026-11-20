import type { CourierDelivery } from './types';

/** Acción que el repartidor puede ejecutar desde la PWA. */
export type CourierAction = {
  to: string;
  label: string;
  kind: 'primary' | 'success' | 'danger';
  /** El backend exige un motivo escrito para cerrar sin éxito. */
  requiresReason?: boolean;
};

/**
 * Refleja `COURIER_TRANSITIONS` del backend. Si aquí se ofrece una transición
 * que el servidor no permite, el PATCH devuelve 400; si falta una permitida,
 * el repartidor se queda sin salida. Las dos listas deben moverse juntas.
 */
export function courierActions(status: string): CourierAction[] {
  switch (status) {
    case 'CREATED':
    case 'PAYMENT_CONFIRMED':
    case 'PREPARING':
    case 'READY':
    case 'SCHEDULED':
    case 'CONFIRMATION_PENDING':
    case 'CONFIRMED':
      return [{ to: 'IN_ROUTE', label: 'Iniciar ruta', kind: 'primary' }];
    case 'IN_ROUTE':
      return [
        { to: 'ARRIVED', label: 'Llegué', kind: 'primary' },
        { to: 'DELIVERED', label: 'Entregado', kind: 'success' },
        { to: 'NOT_DELIVERED', label: 'No entregado', kind: 'danger', requiresReason: true },
        { to: 'CUSTOMER_UNAVAILABLE', label: 'Cliente no disponible', kind: 'danger', requiresReason: true },
        { to: 'INCIDENT', label: 'Incidencia', kind: 'danger', requiresReason: true },
      ];
    case 'ARRIVED':
      return [
        { to: 'DELIVERED', label: 'Entregado', kind: 'success' },
        { to: 'NOT_DELIVERED', label: 'No entregado', kind: 'danger', requiresReason: true },
        { to: 'CUSTOMER_UNAVAILABLE', label: 'Cliente no disponible', kind: 'danger', requiresReason: true },
        { to: 'INCIDENT', label: 'Incidencia', kind: 'danger', requiresReason: true },
      ];
    default:
      return [];
  }
}

export function isClosed(status: string): boolean {
  return ['DELIVERED', 'NOT_DELIVERED', 'CUSTOMER_UNAVAILABLE', 'INCIDENT', 'CANCELLED', 'RESCHEDULED'].includes(status);
}

export type StationGroup = {
  key: string;
  nombre: string;
  linea: string | null;
  comuna: string | null;
  entregas: CourierDelivery[];
};

/**
 * Agrupa por estación conservando el orden que ya trae el backend
 * (estación → ventana). No reordena alfabéticamente ni inventa prioridades:
 * el orden de la ruta es una decisión del servidor.
 */
export function groupByStation(entregas: CourierDelivery[]): StationGroup[] {
  const groups = new Map<string, StationGroup>();
  for (const entrega of entregas) {
    const key = entrega.estacion?.nombre || 'Sin estación';
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        nombre: key,
        linea: entrega.estacion?.lineaNombre || entrega.estacion?.linea || null,
        comuna: entrega.estacion?.comuna || null,
        entregas: [],
      };
      groups.set(key, group);
    }
    group.entregas.push(entrega);
  }
  return Array.from(groups.values());
}

/** `17:00` + `17:30` → `17:00–17:30`; tolera tramos incompletos. */
export function formatWindow(inicio: string | null, fin: string | null): string {
  if (inicio && fin) return `${inicio}–${fin}`;
  return inicio || fin || 'Sin horario';
}

export function formatCLP(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

/** Etiqueta de día sin construir fechas: compara strings de calendario Chile. */
export function dayLabel(dia: string, hoy: string, manana: string): string {
  if (dia === hoy) return 'Hoy';
  if (dia === manana) return 'Mañana';
  const [y, m, d] = dia.split('-');
  return d && m && y ? `${d}/${m}` : dia;
}

/**
 * Día de hoy en el calendario de Chile, independiente del reloj del equipo.
 * El backend sigue siendo la autoridad del filtrado: esto solo rotula la UI.
 */
export function todayChileISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Dígitos del PIN, sin letras ni espacios, máximo 6. */
export function sanitizePin(value: string): string {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

/** El backend exige 4–6 dígitos para intentar el login. */
export function isValidPin(value: string): boolean {
  return /^\d{4,6}$/.test(String(value || '').trim());
}

/** Etiquetas de los `PaymentMethod` que ya existen en el pedido. */
export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  TARJETA_MANUAL: 'Tarjeta',
  MIXTO: 'Mixto',
  FLOW_MANUAL: 'Flow',
  MERCADOPAGO_MANUAL: 'Mercado Pago',
};

export function paymentMethodLabel(method: string | null | undefined): string {
  return PAYMENT_METHOD_LABEL[String(method || '').toUpperCase()] || 'Otro medio';
}

/** El servidor acepta código correcto O foto (o ambos). */
export function hasPodEvidence(code: string, photo: string | null | undefined): boolean {
  return String(code || '').trim().length > 0 || !!photo;
}

/**
 * Reduce la foto antes de subirla: se guarda como data URL en la BD, así que
 * hay que mantenerla bajo el límite del servidor. Sin dependencias nuevas.
 */
export function compressPhoto(file: File, maxEdge = 1280, quality = 0.72): Promise<string | null> {
  if (!file || typeof FileReader === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(null);
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width || 1, img.height || 1));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round((img.width || 1) * scale));
        canvas.height = Math.max(1, Math.round((img.height || 1) * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}
