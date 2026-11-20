/**
 * Tipos del panel del repartidor. Reflejan lo que devuelve `/courier/*`:
 * solo datos operativos (sin email, RUT ni historial).
 */

export type CourierStation = {
  nombre: string;
  linea: string | null;
  lineaNombre: string | null;
  comuna: string | null;
};

export type CourierDelivery = {
  id: string;
  codigo: string;
  dia: string | null;
  ventana: { inicio: string | null; fin: string | null };
  estado: string;
  estacion: CourierStation | null;
  direccion: string | null;
  puntoEncuentro: string | null;
  notas: string | null;
  cliente: { nombre: string; telefono: string };
  pedido: { numero: string; total: number };
  cobro: { monto: number; estado: 'PAGADO' | 'POR_COBRAR'; metodo: string | null };
};

export type CourierRoute = {
  dia: string;
  resumen: {
    total: number;
    pendientes: number;
    entregadas: number;
    noEntregadas: number;
  };
  entregas: CourierDelivery[];
};

export type CourierConfig = {
  inactividadMinutos: number;
  mananaHabilitado: boolean;
};

export type MoneyBreakdown = {
  efectivo: number;
  transferencia: number;
  otros: number;
  total: number;
};

export type CourierCashShiftView = {
  id: string;
  estado: 'ABIERTA' | 'RENDIDA' | 'CONFIRMADA' | 'ANULADA';
  esperado: MoneyBreakdown;
  declarado: MoneyBreakdown & { total: number | null };
  diferencia: number | null;
  cerradaEn: string | null;
  confirmadaEn: string | null;
  notas: string | null;
};

export type CourierRendicion = {
  dia: string;
  entregadas: number;
  pendientes: number;
  noEntregadas: number;
  porRendir: MoneyBreakdown;
  cerrado: boolean;
  /** true solo para entregas históricas sin cobro registrado (Fase 3). */
  preliminar: boolean;
  turno: CourierCashShiftView | null;
};

export type CourierDeliveryDetail = CourierDelivery & {
  productos: Array<{ nombre: string; cantidad: number }>;
  notasPedido: string | null;
  cobroRegistrado: {
    monto: number;
    metodo: string;
    referencia: string | null;
    cobradoEn: string;
  } | null;
  evidencia: {
    codigo: string | null;
    receptor: string | null;
    conFoto: boolean;
    registradaEn: string;
  } | null;
};

export type CourierDeliverPayload = {
  amount: number;
  method: string;
  code?: string;
  photoDataUrl?: string | null;
  recipientName?: string;
  reference?: string;
  notes?: string;
};
