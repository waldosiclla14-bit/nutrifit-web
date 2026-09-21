'use client';

// Single source of truth for delivery status labels + colors.
// Used by Entregas (pills) and Calendario (dots + legend).

export const DELIVERY_STATUS_LABEL: Record<string, string> = {
  CREATED: 'Creado',
  PAYMENT_CONFIRMED: 'Pago confirmado',
  PREPARING: 'Preparando',
  READY: 'Listo',
  SCHEDULED: 'Programado',
  CONFIRMATION_PENDING: 'Pendiente confirmación',
  CONFIRMED: 'Confirmado',
  IN_ROUTE: 'En ruta',
  ARRIVED: 'Llegó',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  RESCHEDULED: 'Reprogramado',
  CUSTOMER_UNAVAILABLE: 'Cliente no disponible',
  NOT_DELIVERED: 'No entregado',
  INCIDENT: 'Incidencia',
};

export const DELIVERY_STATUS_PILL: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-700',
  PAYMENT_CONFIRMED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-yellow-100 text-yellow-700',
  READY: 'bg-orange-100 text-orange-700',
  SCHEDULED: 'bg-purple-100 text-purple-700',
  CONFIRMATION_PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  IN_ROUTE: 'bg-cyan-100 text-cyan-700',
  ARRIVED: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RESCHEDULED: 'bg-orange-100 text-orange-700',
  CUSTOMER_UNAVAILABLE: 'bg-rose-100 text-rose-700',
  NOT_DELIVERED: 'bg-red-100 text-red-700',
  INCIDENT: 'bg-red-100 text-red-700',
};

export const DELIVERY_STATUS_DOT: Record<string, string> = {
  CREATED: 'bg-gray-400',
  PAYMENT_CONFIRMED: 'bg-blue-400',
  PREPARING: 'bg-yellow-400',
  READY: 'bg-orange-400',
  SCHEDULED: 'bg-purple-400',
  CONFIRMATION_PENDING: 'bg-amber-400',
  CONFIRMED: 'bg-emerald-400',
  IN_ROUTE: 'bg-cyan-400',
  ARRIVED: 'bg-indigo-400',
  DELIVERED: 'bg-green-500',
  CANCELLED: 'bg-red-400',
  RESCHEDULED: 'bg-violet-400',
  CUSTOMER_UNAVAILABLE: 'bg-orange-300',
  NOT_DELIVERED: 'bg-red-300',
  INCIDENT: 'bg-red-500',
};

export type DeliveryActionKind = 'primary' | 'danger' | 'warn';

export type DeliveryAction = {
  to: string;
  label: string;
  kind: DeliveryActionKind;
};

const CANCEL_ACTION: DeliveryAction = { to: 'CANCELLED', label: 'Cancelar', kind: 'danger' };

// Single-PATCH valid next states, mirroring the backend state machine
// (DeliveryService.updateStatus validTransitions). Using anything else
// returns 400 "No se puede cambiar de X a Y".
export function deliveryNextActions(status: string): DeliveryAction[] {
  switch (status) {
    case 'CREATED':
      return [
        { to: 'PAYMENT_CONFIRMED', label: 'Pago confirmado', kind: 'primary' },
        { ...CANCEL_ACTION },
      ];
    case 'PAYMENT_CONFIRMED':
      return [
        { to: 'PREPARING', label: 'Preparar', kind: 'primary' },
        { ...CANCEL_ACTION },
      ];
    case 'PREPARING':
      return [
        { to: 'READY', label: 'Listo', kind: 'primary' },
        { ...CANCEL_ACTION },
      ];
    case 'READY':
      return [
        { to: 'SCHEDULED', label: 'Programar', kind: 'primary' },
        { ...CANCEL_ACTION },
      ];
    case 'SCHEDULED':
      return [
        { to: 'CONFIRMATION_PENDING', label: 'Pedir confirmación', kind: 'primary' },
        { ...CANCEL_ACTION },
      ];
    case 'CONFIRMATION_PENDING':
      return [
        { to: 'CONFIRMED', label: 'Confirmar', kind: 'primary' },
        { to: 'CUSTOMER_UNAVAILABLE', label: 'Cliente ausente', kind: 'warn' },
        { ...CANCEL_ACTION },
      ];
    case 'CONFIRMED':
      return [
        { to: 'IN_ROUTE', label: 'En ruta', kind: 'primary' },
        { ...CANCEL_ACTION },
      ];
    case 'IN_ROUTE':
      return [
        { to: 'ARRIVED', label: 'Llegó', kind: 'primary' },
        { to: 'CUSTOMER_UNAVAILABLE', label: 'Cliente ausente', kind: 'warn' },
        { to: 'INCIDENT', label: 'Incidencia', kind: 'danger' },
      ];
    case 'ARRIVED':
      return [
        { to: 'DELIVERED', label: 'Entregar', kind: 'primary' },
        { to: 'CUSTOMER_UNAVAILABLE', label: 'Cliente ausente', kind: 'warn' },
        { to: 'NOT_DELIVERED', label: 'No entregado', kind: 'warn' },
        { to: 'INCIDENT', label: 'Incidencia', kind: 'danger' },
      ];
    case 'RESCHEDULED':
      return [{ to: 'SCHEDULED', label: 'Programar', kind: 'primary' }];
    case 'CUSTOMER_UNAVAILABLE':
    case 'NOT_DELIVERED':
    case 'INCIDENT':
      // Reprogramar con nueva fecha/hora requiere formulario dedicado
      return [{ ...CANCEL_ACTION }];
    default:
      return [];
  }
}
