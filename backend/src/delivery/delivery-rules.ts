import { DeliveryStatus } from '@prisma/client';

/**
 * Estados de entrega y su significado operativo.
 *
 * Única definición de "qué cuenta como pendiente". Cualquier contador, filtro o
 * pantalla debe usar estos helpers en vez de repetir listas de estados.
 */
export const ESTADOS_FINALES: DeliveryStatus[] = [
  DeliveryStatus.DELIVERED,
  DeliveryStatus.NOT_DELIVERED,
  DeliveryStatus.CUSTOMER_UNAVAILABLE,
  DeliveryStatus.INCIDENT,
  DeliveryStatus.CANCELLED,
];

/**
 * `RESCHEDULED` cierra el intento del día: la entrega se movió a otra fecha.
 * No es final (puede volver a SCHEDULED), pero tampoco es trabajo pendiente de
 * hoy. Sin esta distinción el backlog crece para siempre.
 */
export const ESTADOS_CERRADOS_SIN_ENTREGA: DeliveryStatus[] = [
  DeliveryStatus.CANCELLED,
  DeliveryStatus.RESCHEDULED,
];

const TODOS = Object.values(DeliveryStatus) as DeliveryStatus[];

/** Estados que todavía esperan una acción del repartidor o del admin. */
export const ESTADOS_PENDIENTES: DeliveryStatus[] = TODOS.filter(
  (s) => !ESTADOS_FINALES.includes(s) && !ESTADOS_CERRADOS_SIN_ENTREGA.includes(s),
);

/** Estados que la logística muestra por defecto (todo menos cancelado y reprogramado). */
export const ESTADOS_VISIBLES: DeliveryStatus[] = TODOS.filter(
  (s) => !ESTADOS_CERRADOS_SIN_ENTREGA.includes(s),
);

export function esFinal(status: DeliveryStatus | string): boolean {
  return ESTADOS_FINALES.includes(status as DeliveryStatus);
}

export function esPendiente(status: DeliveryStatus | string): boolean {
  return ESTADOS_PENDIENTES.includes(status as DeliveryStatus);
}

/** Cuenta como trabajo del día: ni cancelada ni movida a otra fecha. */
export function esActivoHoy(status: DeliveryStatus | string): boolean {
  return !ESTADOS_CERRADOS_SIN_ENTREGA.includes(status as DeliveryStatus);
}

export function esEntregado(status: DeliveryStatus | string): boolean {
  return status === DeliveryStatus.DELIVERED;
}
