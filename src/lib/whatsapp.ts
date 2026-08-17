import type { OrderItem } from '@/types';
import { formatPrice } from '@/lib/utils';

const SITE_URL = 'https://nutrifit-web-nu.vercel.app';

export function webFooter() {
  return [
    '',
    '─'.repeat(24),
    '🌐 *Compra online con envío a todo Chile:*',
    SITE_URL,
    '🎁 *¡Tienes promociones exclusivas al comprar por nuestra página web!*',
  ].join('\n');
}

type OrderPayload = {
  name: string;
  phone: string;
  metroLine?: string;
  metroStation?: string;
  couponCode?: string;
  items: OrderItem[];
  subtotal: number;
  discount?: number;
  shipping: number;
  total: number;
};

export function buildWhatsAppMessage(order: OrderPayload) {
  const lines: string[] = [];
  lines.push('HOLA NUTRIFIT');
  lines.push('NUEVO PEDIDO');
  lines.push('─'.repeat(24));
  lines.push('');
  lines.push(`*Nombre:* ${order.name}`);
  lines.push(`*Teléfono:* ${order.phone}`);
  if (order.metroStation) {
    lines.push(`*Entrega:* Metro ${order.metroStation} — Línea ${order.metroLine}`);
  }
  lines.push(`*Pago:* Contra entrega`);
  lines.push('');
  lines.push('*PRODUCTOS:*');
  order.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name}`);
    lines.push(`   Cantidad: ${item.quantity}`);
    lines.push(`   Precio: ${formatPrice(item.price * item.quantity)}`);
  });
  lines.push('');
  lines.push('─'.repeat(24));
  lines.push(`*Subtotal:* ${formatPrice(order.subtotal)}`);
  if (order.discount) {
    lines.push(`*Descuento:* -${formatPrice(order.discount)}`);
  }
  if (order.couponCode) {
    lines.push(`*Cupón:* ${order.couponCode}`);
  }
  lines.push(
    `*Entrega:* ${order.shipping === 0 ? 'GRATIS EN METRO' : formatPrice(order.shipping)}`,
  );
  lines.push(`*TOTAL:* ${formatPrice(order.total)}`);
  lines.push('');
  lines.push('¡Gracias por entrenar con confianza! 💪');
  lines.push(webFooter());
  return lines.join('\n');
}

export function buildComboMessage(combo: {
  name: string;
  desc: string;
  items: string[];
  price: number;
}) {
  const lines: string[] = [];
  lines.push('HOLA NUTRIFIT');
  lines.push('QUIERO EL COMBO');
  lines.push('─'.repeat(24));
  lines.push('');
  lines.push(`*Combo:* ${combo.name}`);
  lines.push(combo.desc);
  lines.push('');
  lines.push('*Incluye:*');
  combo.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item}`);
  });
  lines.push('');
  lines.push('─'.repeat(24));
  lines.push(`*Precio combo:* ${formatPrice(combo.price)}`);
  lines.push('');
  lines.push('¿Está disponible? Quiero coordinar mi entrega en metro.');
  lines.push(webFooter());
  return lines.join('\n');
}

export type DeliverySaleMessage = {
  name: string;
  phone: string;
  orderNumber: string;
  items: { productName: string; variantName?: string; quantity: number; total: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentLabel: string;
  paymentReceived: boolean;
  metroLine: string;
  metroStation: string;
  deliveryDay: string;
  deliveryTime: string;
};

export function formatDeliveryDay(iso: string) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const s = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function buildDeliveryOrderMessage(m: DeliverySaleMessage) {
  const lines: string[] = [];
  lines.push('NUTRIFIT · TU PEDIDO CONFIRMADO');
  lines.push('─'.repeat(24));
  lines.push('');
  lines.push(`Hola ${m.name} 👋`);
  lines.push(`Tu pedido ${m.orderNumber} quedó registrado con entrega agendada.`);
  lines.push('');
  lines.push('*PRODUCTOS:*');
  m.items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.productName}${item.variantName ? ` (${item.variantName})` : ''} ×${item.quantity}`,
    );
    lines.push(`   ${formatPrice(item.total)}`);
  });
  lines.push('');
  lines.push('─'.repeat(24));
  lines.push(`*Total:* ${formatPrice(m.total)}`);
  lines.push(`*Pago:* ${m.paymentLabel}${m.paymentReceived ? ' · RECIBIDO' : ' · CONTRA ENTREGA'}`);
  lines.push('');
  lines.push('*ENTREGA AGENDADA:*');
  lines.push(`📅 ${formatDeliveryDay(m.deliveryDay)}`);
  lines.push(`⏰ ${m.deliveryTime} hrs`);
  lines.push(`🚇 Metro ${m.metroStation} · Línea ${m.metroLine}`);
  lines.push('');
  lines.push('¡Te esperamos! Gracias por entrenar con confianza 💪');
  lines.push(webFooter());
  return lines.join('\n');
}

export function openWhatsApp(phone: string, message: string) {
  let clean = phone.replace(/[^\d]/g, '').replace(/^0+/, '');
  if (/^9\d{8}$/.test(clean)) clean = `56${clean}`;
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
