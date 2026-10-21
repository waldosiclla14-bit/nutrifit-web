import type { OrderItem } from '@/types';
import { formatPrice, formatTime12 } from '@/lib/utils';
import { BRAND } from '@/data/seed';
import { SITE_URL } from '@/lib/site';

// Largo máximo seguro de la URL wa.me (límite práctico de api.whatsapp.com).
// Más allá de esto WhatsApp puede descartar el texto precargado.
const WA_URL_MAX = 1900;

export function webFooter() {
  return [
    '',
    '─'.repeat(24),
    '🌐 *Compra online con envío a todo Chile:*',
    SITE_URL,
    '🎁 *¡Tienes promociones exclusivas al comprar por nuestra página web!*',
  ].join('\n');
}

// Prueba social + ubicación para dar confianza (Maps e Instagram).
// URLs canónicas centralizadas en BRAND (sin parámetros de tracking).
export function trustFooter() {
  return [
    '',
    `📍 *Encuéntranos aquí:*`,
    BRAND.mapsUrl,
    `📸 *Síguenos en Instagram:*`,
    BRAND.instagramUrl,
  ].join('\n');
}

type OrderPayload = {
  name: string;
  phone: string;
  deliveryMethod?: 'metro' | 'domicilio';
  metroLine?: string;
  metroStation?: string;
  address?: string;
  comuna?: string;
  region?: string;
  blueSize?: string;
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
  if (order.deliveryMethod === 'domicilio') {
    lines.push(
      `*Entrega:* Envío a domicilio (Blue Express) — ${[order.address, order.comuna, order.region].filter(Boolean).join(', ')}`,
    );
    if (order.blueSize) lines.push(`*Tamaño del paquete:* ${order.blueSize}`);
  } else if (order.metroStation) {
    lines.push(`*Entrega:* Metro ${order.metroStation} — Línea ${order.metroLine}`);
  }
  lines.push(`*Pago:* Efectivo o transferencia (contra entrega)`);
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
    `*Entrega:* ${order.shipping === 0 ? 'SIN COSTO' : formatPrice(order.shipping)}`,
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
  shippingCost: number;
  total: number;
  paymentLabel: string;
  paymentReceived: boolean;
  metroLine: string;
  metroStation: string;
  deliveryDay: string;
  deliveryTime: string;
  deliveryTimeEnd?: string;
  meetingPoint?: string;
  deliveryCode?: string;
  scheduled?: boolean;
};

export function formatDeliveryDay(iso: string) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  // "Miércoles 7 de octubre" (sin coma, formato corto para WhatsApp/TickTick)
  const s = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
    .format(d)
    .replace(',', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function buildDeliveryOrderMessage(m: DeliverySaleMessage) {
  const lines: string[] = [];
  lines.push(`*NUTRIFIT · PEDIDO ${m.orderNumber}*`);
  lines.push(
    m.scheduled
      ? `Hola, ${m.name} 👋 ¡Tu pedido agendado es hoy!`
      : `Hola, ${m.name} 👋 ¡Tu pedido está confirmado!`,
  );
  lines.push('');
  lines.push('📦 *PRODUCTOS*');
  m.items.forEach((item) => {
    const name = `${item.productName}${item.variantName ? ` (${item.variantName})` : ''}`;
    lines.push(`• ${name} ×${item.quantity} — ${formatPrice(item.total)}`);
  });
  if (m.shippingCost > 0) {
    lines.push(`🛵 *Costo de entrega:* ${formatPrice(m.shippingCost)}`);
  }
  lines.push('');
  lines.push(`💰 *TOTAL: ${formatPrice(m.total)}*`);
  lines.push(`💵 *Pago:* ${m.paymentLabel}${m.paymentReceived ? ' · RECIBIDO' : ''}`);
  lines.push('');
  lines.push(`📅 *Entrega:* ${formatDeliveryDay(m.deliveryDay)}`);
  lines.push(`⏰ *Hora:* ${m.deliveryTime} h`);
  lines.push(`🚇 *Lugar:* Metro ${m.metroStation} · ${m.metroLine}`);
  lines.push(
    `📍 *Punto de encuentro:* Torniquetes o cambio de andén${m.meetingPoint ? ` (${m.meetingPoint})` : ''}.`,
  );
  lines.push('');
  lines.push('¡Gracias por comprar en *NutriFit*! 💪');
  lines.push('');
  lines.push('⭐ *Opiniones de nuestros clientes:*');
  lines.push('Conoce sus experiencias en Google Maps.');
  lines.push(BRAND.mapsUrl);
  lines.push('');
  lines.push('📸 *Síguenos en Instagram:*');
  lines.push(BRAND.instagramUrl);
  lines.push('');
  lines.push('🌐 *Compra online:*');
  lines.push(SITE_URL);
  lines.push('');
  lines.push('🎁 Descubre nuestras promociones exclusivas en la web.');
  lines.push('');
  lines.push('*NUTRIFIT · Suplementación para tu rendimiento.*');
  return lines.join('\n');
}

// Aviso de anulación/devolución total.
export function buildCancelOrderMessage(o: {
  orderNumber: string;
  name: string;
  items: SupplierOrderLine[];
  total: number;
  paymentLabel: string;
}): string {
  const lines: string[] = [];
  lines.push(`*NUTRIFIT · PEDIDO CANCELADO ${o.orderNumber}*`);
  lines.push(`Hola, ${o.name} 👋 Te avisamos que tu pedido fue anulado.`);
  lines.push('');
  lines.push('📦 *PRODUCTOS DEVUELTOS*');
  o.items.forEach((l) => {
    lines.push(`• ${l.name}${l.variant ? ` (${l.variant})` : ''} ×${l.quantity} — ${formatPrice((l.unitPrice ?? 0) * l.quantity)}`);
  });
  lines.push('');
  lines.push(`💰 *TOTAL DEVUELTO: ${formatPrice(o.total)}*`);
  lines.push(`💵 *Medio:* ${o.paymentLabel}`);
  lines.push('');
  lines.push('¡Gracias por tu comprensión! 💪');
  lines.push('');
  lines.push('📸 *Síguenos en Instagram:*');
  lines.push(BRAND.instagramUrl);
  lines.push('');
  lines.push('🌐 *Compra online:*');
  lines.push(SITE_URL);
  lines.push('');
  lines.push('*NUTRIFIT · Suplementación para tu rendimiento.*');
  return lines.join('\n');
}

// Línea de una sola pasada para TickTick (fecha y hora explícitas, sin frases):
// "NF-000137 · M.guti · Entrega Metro Plaza Quilicura · 7 octubre 18:00"
export function buildTickTickLine(o: {
  orderNumber: string;
  name: string;
  metroStation: string;
  deliveryDay: string;
  deliveryTime: string;
}): string {
  let day = o.deliveryDay;
  const d = new Date(`${o.deliveryDay}T00:00:00`);
  if (!Number.isNaN(d.getTime())) {
    day = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long' })
      .format(d)
      .replace(' de ', ' ');
  }
  return `${o.orderNumber} · ${o.name} · Entrega Metro ${o.metroStation} · ${day} ${o.deliveryTime}`;
}

export type OpenWhatsAppResult =
  | 'opened' // abrió con el texto precargado
  | 'opened_short' // texto muy largo: abrió sin texto (el mensaje quedó copiado)
  | 'invalid_phone' // teléfono inválido: no se abrió nada
  | 'blocked'; // el navegador bloqueó la pestaña y se usó el fallback ancla

export function waMeUrl(phone: string | null | undefined, message?: string): string | null {
  const clean = normalizeChilePhone(phone);
  if (!clean) return null;
  const base = `https://wa.me/${clean}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

// Abre WhatsApp con el mensaje precargado. Usa window.open dentro del gesto
// del usuario (el <a> programático + removeChild inmediato se perdía en
// Safari/iOS). Si el texto excede el largo seguro de wa.me, abre sin texto y
// lo copia al portapapeles para que el vendedor lo pegue.
export function openWhatsApp(
  phone: string,
  message: string,
  opts?: { copy?: boolean },
): OpenWhatsAppResult {
  const clean = normalizeChilePhone(phone);
  if (!clean) return 'invalid_phone';

  const full = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  const shortEnough = full.length <= WA_URL_MAX;
  const url = shortEnough ? full : `https://wa.me/${clean}`;

  // Copia de seguridad: si WhatsApp no precarga el texto, se puede pegar.
  if (opts?.copy && message && typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(message).catch(() => {});
  }

  let opened = false;
  try {
    opened = !!window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    opened = false;
  }
  if (!opened && typeof document !== 'undefined') {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
    return shortEnough ? 'opened' : 'opened_short';
  }
  return shortEnough ? 'opened' : 'opened_short';
}

// Normaliza teléfonos chilenos a formato wa.me (solo dígitos con código país).
// Acepta: 912345678, +56912345678, 56912345678, con espacios/guiones.
// Devuelve null si no es un número chileno reconocible.
export function normalizeChilePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const d = String(raw).replace(/[^\d]/g, '').replace(/^0+/, '');
  if (/^56\d{9}$/.test(d)) return d; // ya con código país
  if (/^9\d{8}$/.test(d)) return `56${d}`; // móvil sin código
  return null;
}

export function supplierWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  const clean = normalizeChilePhone(phone);
  if (!clean) return null;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export type SupplierOrderLine = {
  name: string;
  variant?: string | null;
  quantity: number;
  unitPrice?: number | null;
};

export function buildSupplierOrderMessage(
  supplierName: string,
  meta: { purchaseNumber?: string; date?: string },
  lines: SupplierOrderLine[],
  total?: number | null,
): string {
  const out: string[] = [];
  out.push(`Hola ${supplierName || 'proveedor'} 👋, habla el equipo NutriFit.`);
  out.push(`Quiero hacer un pedido${meta.purchaseNumber ? ` (ref: ${meta.purchaseNumber})` : ''}:`);
  out.push('');
  lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.name}${l.variant ? ` (${l.variant})` : ''} ×${l.quantity}`);
    if (l.unitPrice != null) out.push(`   Ref: ${formatPrice(l.unitPrice * l.quantity)}`);
  });
  out.push('');
  if (total != null) out.push(`*Total ref:* ${formatPrice(total)}`);
  if (meta.date) out.push(`Fecha: ${meta.date}`);
  out.push('');
  out.push('Quedo atento a confirmación y fecha de entrega. ¡Gracias!');
  return out.join('\n');
}
