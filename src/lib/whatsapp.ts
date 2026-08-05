import type { OrderItem } from '@/types';
import { formatPrice } from '@/lib/utils';

type OrderPayload = {
  name: string;
  phone: string;
  metroLine?: string;
  metroStation?: string;
  payment?: string;
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
  lines.push(`*Pago:* ${order.payment ?? 'Contra entrega'}`);
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
  lines.push(
    `*Entrega:* ${order.shipping === 0 ? 'GRATIS EN METRO' : formatPrice(order.shipping)}`,
  );
  lines.push(`*TOTAL:* ${formatPrice(order.total)}`);
  lines.push('');
  lines.push('¡Gracias por entrenar con confianza! 💪');
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
  return lines.join('\n');
}

export function openWhatsApp(phone: string, message: string) {
  const clean = phone.replace(/[^\d]/g, '');
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
