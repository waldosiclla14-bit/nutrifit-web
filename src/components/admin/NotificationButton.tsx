'use client';

import { useState } from 'react';

type DeliveryData = {
  deliveryId: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  stationName?: string;
  lineName?: string;
  deliveryDate?: string | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  meetingPoint?: string | null;
  deliveryCode?: string;
  commune?: string | null;
  status?: string;
};

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Pedido recibido',
  PAYMENT_CONFIRMED: 'Pago confirmado',
  PREPARING: 'En preparación',
  READY: 'Listo para entrega',
  SCHEDULED: 'Entrega agendada',
  CONFIRMATION_PENDING: 'Confirmación pendiente',
  CONFIRMED: 'Entrega confirmada',
  IN_ROUTE: 'En camino',
  ARRIVED: 'Llegó a la estación',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  RESCHEDULED: 'Reagendado',
  CUSTOMER_UNAVAILABLE: 'Cliente no disponible',
  NOT_DELIVERED: 'No entregado',
  INCIDENT: 'Incidente',
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Por definir';
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}

function formatPrice(amount: number): string {
  return `$${amount.toLocaleString('es-CL')}`;
}

export function buildDeliveryStatusMessage(status: string, data: DeliveryData): string {
  const label = STATUS_LABELS[status] || status;
  const lines: string[] = [];

  lines.push('NUTRIFIT · ACTUALIZACIÓN DE ENTREGA');
  lines.push('─'.repeat(24));
  lines.push('');
  lines.push(`Hola ${data.customerName || 'Cliente'} 👋`);
  lines.push(`Tu pedido ${data.orderNumber || data.deliveryId.slice(0, 8)} ha cambiado de estado:`);
  lines.push('');
  lines.push(`*Estado:* ${label}`);

  if (data.deliveryDate) lines.push(`📅 ${formatDate(data.deliveryDate)}`);
  if (data.windowStart && data.windowEnd) lines.push(`⏰ ${data.windowStart} - ${data.windowEnd} hrs`);
  if (data.stationName) lines.push(`🚇 Metro ${data.stationName} · ${data.lineName || ''}`);
  if (data.meetingPoint) lines.push(`📍 ${data.meetingPoint}`);
  if (data.commune) lines.push(`🏘️ ${data.commune}`);

  switch (status) {
    case 'PAYMENT_CONFIRMED':
      lines.push('', 'Tu pago fue recibido correctamente. Prepararemos tu pedido pronto.');
      break;
    case 'PREPARING':
      lines.push('', 'Estamos preparando tu pedido. Te avisamos cuando esté listo.');
      break;
    case 'READY':
      lines.push('', '¡Tu pedido está listo! Próximamente te contactaremos.');
      break;
    case 'SCHEDULED':
    case 'CONFIRMED':
      lines.push('', `Te esperamos en *Metro ${data.stationName || 'la estación'}*.`);
      if (data.meetingPoint) lines.push(`Punto de encuentro: *${data.meetingPoint}*`);
      if (data.deliveryCode) lines.push(`Tu código de entrega: *${data.deliveryCode}*`);
      break;
    case 'IN_ROUTE':
      lines.push('', '¡Tu pedido va en camino!');
      if (data.deliveryCode) lines.push(`Código: *${data.deliveryCode}*`);
      break;
    case 'ARRIVED':
      lines.push('', '¡El repartidor llegó a la estación!');
      if (data.meetingPoint) lines.push(`Búscalo en: *${data.meetingPoint}*`);
      break;
    case 'DELIVERED':
      lines.push('', '¡Entregado exitosamente! ¡Gracias por entrenar con confianza! 💪');
      break;
    case 'CANCELLED':
      lines.push('', 'Tu entrega ha sido cancelada.');
      break;
    case 'RESCHEDULED':
      lines.push('', 'Tu entrega fue reagendada. Te contactaremos pronto.');
      break;
  }

  lines.push('', '─'.repeat(24), '🌐 nutrifit-web-nu.vercel.app');
  return lines.join('\n');
}

export default function NotificationButton({ delivery }: { delivery: DeliveryData }) {
  const [sending, setSending] = useState(false);

  const handleSend = () => {
    if (!delivery.customerPhone || !delivery.status) return;

    setSending(true);
    const message = buildDeliveryStatusMessage(delivery.status, delivery);
    let phone = delivery.customerPhone.replace(/[^\d]/g, '').replace(/^0+/, '');
    if (/^9\d{8}$/.test(phone)) phone = `56${phone}`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => setSending(false), 1500);
  };

  if (!delivery.customerPhone || !delivery.status) return null;

  return (
    <button
      onClick={handleSend}
      disabled={sending}
      className="text-xs px-2 py-1.5 rounded-lg bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366]/20 transition-colors min-h-[32px] flex items-center gap-1"
      title="Enviar actualización por WhatsApp"
    >
      {sending ? (
        <span className="h-3 w-3 border-2 border-[#25d366] border-t-transparent rounded-full animate-spin" />
      ) : (
        <span>💬</span>
      )}
      <span>WhatsApp</span>
    </button>
  );
}
