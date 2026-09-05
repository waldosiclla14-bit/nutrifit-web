import { Injectable, Logger } from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';

export interface DeliveryNotificationData {
  deliveryId: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  stationName?: string;
  lineName?: string;
  deliveryDate?: Date | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  meetingPoint?: string | null;
  deliveryCode?: string;
  commune?: string | null;
  assignedToName?: string;
}

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

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  private formatPrice(amount: number): string {
    return `$${amount.toLocaleString('es-CL')}`;
  }

  private formatDate(date: Date | null): string {
    if (!date) return 'Por definir';
    return new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
  }

  buildDeliveryStatusMessage(status: DeliveryStatus, data: DeliveryNotificationData): string | null {
    const label = STATUS_LABELS[status] || status;
    const lines: string[] = [];

    lines.push('NUTRIFIT · ACTUALIZACIÓN DE ENTREGA');
    lines.push('─'.repeat(24));
    lines.push('');
    lines.push(`Hola ${data.customerName || 'Cliente'} 👋`);
    lines.push(`Tu pedido ${data.orderNumber || data.deliveryId.slice(0, 8)} ha cambiado de estado:`);
    lines.push('');
    lines.push(`*Estado:* ${label}`);

    if (data.deliveryDate) {
      lines.push(`📅 ${this.formatDate(data.deliveryDate)}`);
    }
    if (data.windowStart && data.windowEnd) {
      lines.push(`⏰ ${data.windowStart} - ${data.windowEnd} hrs`);
    }
    if (data.stationName) {
      lines.push(`🚇 Metro ${data.stationName} · ${data.lineName || ''}`);
    }
    if (data.meetingPoint) {
      lines.push(`📍 ${data.meetingPoint}`);
    }
    if (data.commune) {
      lines.push(`🏘️ ${data.commune}`);
    }

    switch (status) {
      case DeliveryStatus.PAYMENT_CONFIRMED:
        lines.push('');
        lines.push('Tu pago fue recibido correctamente. Prepararemos tu pedido pronto.');
        break;

      case DeliveryStatus.PREPARING:
        lines.push('');
        lines.push('Estamos preparando tu pedido con cariño. Te avisamos cuando esté listo.');
        break;

      case DeliveryStatus.READY:
        lines.push('');
        lines.push('¡Tu pedido está listo! Próximamente te contactaremos para coordinar la entrega.');
        break;

      case DeliveryStatus.SCHEDULED:
      case DeliveryStatus.CONFIRMED:
        lines.push('');
        lines.push(`Te esperamos en *Metro ${data.stationName || 'la estación'}*.`);
        if (data.meetingPoint) {
          lines.push(`Punto de encuentro: *${data.meetingPoint}*`);
        }
        if (data.deliveryCode) {
          lines.push(`Tu código de entrega: *${data.deliveryCode}*`);
          lines.push('(Muéstralo al repartidor al momento de recibir)');
        }
        break;

      case DeliveryStatus.IN_ROUTE:
        lines.push('');
        lines.push('¡Tu pedido va en camino! El repartidor llegará pronto a la estación.');
        if (data.deliveryCode) {
          lines.push(`Código de entrega: *${data.deliveryCode}*`);
        }
        break;

      case DeliveryStatus.ARRIVED:
        lines.push('');
        lines.push('¡El repartidor llegó a la estación!');
        if (data.meetingPoint) {
          lines.push(`Búscalo en: *${data.meetingPoint}*`);
        }
        if (data.deliveryCode) {
          lines.push(`Código: *${data.deliveryCode}*`);
        }
        break;

      case DeliveryStatus.DELIVERED:
        lines.push('');
        lines.push('¡Tu pedido fue entregado exitosamente!');
        lines.push('¡Gracias por entrenar con confianza! 💪');
        break;

      case DeliveryStatus.CANCELLED:
        lines.push('');
        lines.push('Tu entrega ha sido cancelada. Si tienes dudas, contáctanos.');
        break;

      case DeliveryStatus.RESCHEDULED:
        lines.push('');
        lines.push('Tu entrega fue reagendada. Te contactaremos pronto con la nueva fecha.');
        break;

      case DeliveryStatus.CUSTOMER_UNAVAILABLE:
        lines.push('');
        lines.push('No pudimos contactarte. Te llamaremos para reagendar la entrega.');
        break;

      case DeliveryStatus.INCIDENT:
        lines.push('');
        lines.push('Hubo un inconveniente con tu entrega. Te contactaremos para solucionarlo.');
        break;
    }

    lines.push('');
    lines.push('─'.repeat(24));
    lines.push('🌐 nutrifit-web-nu.vercel.app');

    return lines.join('\n');
  }

  getWhatsAppUrl(phone: string, message: string): string {
    let clean = phone.replace(/[^\d]/g, '').replace(/^0+/, '');
    if (/^9\d{8}$/.test(clean)) clean = `56${clean}`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  }

  logNotification(status: DeliveryStatus, deliveryId: string, channel: string) {
    this.logger.log(`Notificación [${channel}] enviada para entrega ${deliveryId}: ${status}`);
  }
}
