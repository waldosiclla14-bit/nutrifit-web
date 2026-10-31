import {
  normalizeChilePhone,
  openWhatsApp,
  supplierWhatsAppUrl,
  buildSupplierOrderMessage,
  buildDeliveryOrderMessage,
  buildTickTickLine,
  buildCancelOrderMessage,
  buildWhatsAppMessage,
  paymentLabel,
  trustFooter,
  waMeUrl,
} from './whatsapp';
import { BRAND } from '@/data/seed';

describe('normalizeChilePhone', () => {
  it('accepts local mobile and adds country code', () => {
    expect(normalizeChilePhone('912345678')).toBe('56912345678');
    expect(normalizeChilePhone('+56 9 1234 5678')).toBe('56912345678');
    expect(normalizeChilePhone('56912345678')).toBe('56912345678');
  });

  it('rejects empties and non-Chilean formats', () => {
    expect(normalizeChilePhone('')).toBeNull();
    expect(normalizeChilePhone(null)).toBeNull();
    expect(normalizeChilePhone(undefined)).toBeNull();
    expect(normalizeChilePhone('12345')).toBeNull();
    expect(normalizeChilePhone('no-es-numero')).toBeNull();
  });
});

describe('supplierWhatsAppUrl', () => {
  it('builds wa.me link with encoded message', () => {
    const url = supplierWhatsAppUrl('912345678', 'Hola proveedor');
    expect(url).toBe(`https://wa.me/56912345678?text=${encodeURIComponent('Hola proveedor')}`);
  });

  it('returns null without valid phone', () => {
    expect(supplierWhatsAppUrl('abc', 'Hola')).toBeNull();
    expect(supplierWhatsAppUrl(null, 'Hola')).toBeNull();
  });
});

describe('buildDeliveryOrderMessage', () => {
  const base = {
    name: 'M.guti',
    phone: '912345678',
    orderNumber: 'NF-000137',
    items: [
      { productName: 'Whey Chocolate 1 kg', quantity: 3, total: 48000 },
      { productName: 'Whey Frutilla 1 kg', quantity: 2, total: 32000 },
      { productName: 'Creatina 300 g', quantity: 1, total: 13500 },
    ],
    subtotal: 93500,
    discount: 5500,
    shippingCost: 0,
    total: 88000,
    paymentLabel: 'Transferencia al recibir',
    paymentReceived: false,
    metroLine: 'L3',
    metroStation: 'Plaza Quilicura',
    deliveryDay: '2026-10-07',
    deliveryTime: '18:00',
    meetingPoint: 'Acceso principal',
    deliveryCode: '1234',
  };

  it('matches the spec template with dynamic data', () => {
    const msg = buildDeliveryOrderMessage(base);

    expect(msg).toContain('NUTRIFIT · PEDIDO NF-000137');
    expect(msg).toContain('Hola, M.guti');
    expect(msg).toContain('• Whey Chocolate 1 kg ×3 — $48.000');
    expect(msg).toContain('• Creatina 300 g ×1 — $13.500');
    expect(msg).toContain('Pago:* Transferencia al recibir'.replace('*', '*'));
    expect(msg).toContain('📅 *Entrega:* Miércoles 7 de octubre');
    expect(msg).toContain('⏰ *Hora:* 18:00 h');
    expect(msg).toContain('🚇 *Lugar:* Metro Plaza Quilicura · L3');
    expect(msg).toContain('Torniquetes o cambio de andén (Acceso principal).');
    expect(msg).toContain('Opiniones de nuestros clientes');
    expect(msg).toContain('https://nutrifitsuplementos.cl');
    expect(msg).toContain('Suplementación para tu rendimiento');
    // Nada del ejemplo queda fijo: sin meeting point no aparece el paréntesis
    expect(buildDeliveryOrderMessage({ ...base, meetingPoint: undefined })).not.toContain('(Acceso');
  });

  it('shows delivery cost only when greater than zero', () => {
    expect(buildDeliveryOrderMessage(base)).not.toContain('Costo de entrega');
    const msg = buildDeliveryOrderMessage({ ...base, shippingCost: 1000 });
    expect(msg).toContain('🛵 *Costo de entrega:* $1.000');
  });

  it('marks RECIBIDO when paid', () => {
    const msg = buildDeliveryOrderMessage({ ...base, paymentReceived: true });
    expect(msg).toContain('RECIBIDO');
  });

  it('includes trust links (Maps + Instagram, no tracking params)', () => {
    const msg = buildDeliveryOrderMessage(base);
    expect(msg).toContain(BRAND.mapsUrl);
    expect(msg).toContain(BRAND.instagramUrl);
    expect(msg).not.toContain('mdxt=');
    expect(msg).not.toContain('utm_source=');
    expect(trustFooter()).toContain('maps.app.goo.gl');
    expect(trustFooter()).toContain('instagram.com/nutrifitsuplementos_cl');
  });
});

describe('buildTickTickLine', () => {
  it('formats the one-liner with explicit date and time', () => {
    expect(
      buildTickTickLine({
        orderNumber: 'NF-000137',
        name: 'M.guti',
        metroStation: 'Plaza Quilicura',
        deliveryDay: '2026-10-07',
        deliveryTime: '18:00',
      }),
    ).toBe('NF-000137 · M.guti · Entrega Metro Plaza Quilicura · 7 octubre 18:00');
  });

  it('falls back to raw day when unparseable', () => {
    expect(
      buildTickTickLine({
        orderNumber: 'NF-1',
        name: 'X',
        metroStation: 'Y',
        deliveryDay: 'cualquiera',
        deliveryTime: '10:00',
      }),
    ).toContain('cualquiera 10:00');
  });
});
describe('buildSupplierOrderMessage', () => {
  it('lists lines with quantities and reference total', () => {
    const msg = buildSupplierOrderMessage(
      'Bio Natur',
      { purchaseNumber: 'COMP-000001', date: '2026-09-25' },
      [
        { name: 'Proteina Whey 1kg', variant: 'Vainilla 1kg', quantity: 3, unitPrice: 10000 },
        { name: 'Creatina 300g', quantity: 2 },
      ],
      50000,
    );

    expect(msg).toContain('Hola Bio Natur');
    expect(msg).toContain('COMP-000001');
    expect(msg).toContain('Proteina Whey 1kg (Vainilla 1kg) ×3');
    expect(msg).toContain('Creatina 300g ×2');
    expect(msg).toContain('$50.000');
  });
});

describe('buildCancelOrderMessage', () => {
  it('renders cancel notice with returned lines', () => {
    const msg = buildCancelOrderMessage({
      orderNumber: 'NF-000153',
      name: 'Mostrador',
      items: [{ name: 'Proteína Whey 1 kg', variant: 'Cookies & Cream', quantity: 1, unitPrice: 16000 }],
      total: 17000,
      paymentLabel: 'Efectivo',
    });

    expect(msg).toContain('PEDIDO CANCELADO NF-000153');
    expect(msg).toContain('• Proteína Whey 1 kg (Cookies & Cream) ×1 — $16.000');
    expect(msg).toContain('TOTAL DEVUELTO: $17.000');
    expect(msg).toContain('Medio:* Efectivo'.replace('*', '*'));
    expect(msg).toContain('instagram.com/nutrifitsuplementos_cl');
  });
});

describe('buildDeliveryOrderMessage scheduled', () => {
  it('greets as today when scheduled', () => {
    const msg = buildDeliveryOrderMessage({
      name: 'M.guti',
      phone: '912345678',
      orderNumber: 'NF-000137',
      items: [{ productName: 'Whey', quantity: 1, total: 16000 }],
      subtotal: 16000,
      discount: 0,
      shippingCost: 0,
      total: 16000,
      paymentLabel: 'Efectivo',
      paymentReceived: false,
      metroLine: 'L3',
      metroStation: 'Plaza Quilicura',
      deliveryDay: '2026-10-07',
      deliveryTime: '18:00',
      scheduled: true,
    });

    expect(msg).toContain('¡Tu pedido agendado es hoy!');
  });
});

describe('buildWhatsAppMessage', () => {
  const order = {
    name: 'Ana Pérez',
    phone: '9 1234 5678',
    metroLine: '3',
    metroStation: 'Plaza Quilicura',
    paymentMethod: 'transferencia' as const,
    items: [
      { productId: 4, name: 'Whey 1kg', price: 16000, quantity: 2, image: '/img/x.webp' },
      { productId: 7, name: 'Creatina 300g', price: 15000, quantity: 1, image: '/img/y.webp' },
    ],
    subtotal: 47000,
    shipping: 1000,
    total: 48000,
  };

  it('arma el pedido con productos, entrega, pago y total', () => {
    const msg = buildWhatsAppMessage(order);

    expect(msg).toContain('*Nombre:* Ana Pérez');
    expect(msg).toContain('*Teléfono:* 9 1234 5678');
    expect(msg).toContain('*Entrega:* Metro Plaza Quilicura — Línea 3');
    expect(msg).toContain('*Pago:* Transferencia bancaria');
    expect(msg).toContain('1. Whey 1kg');
    expect(msg).toContain('Cantidad: 2');
    expect(msg).toContain('$32.000');
    expect(msg).toContain('*Subtotal:* $47.000');
    expect(msg).toContain('*Entrega:* $1.000');
    expect(msg).toContain('*TOTAL:* $48.000');
  });

  it('asume efectivo cuando no se eligió medio de pago', () => {
    const msg = buildWhatsAppMessage({ ...order, paymentMethod: undefined });

    expect(msg).toContain('*Pago:* Efectivo contra entrega');
    expect(paymentLabel(undefined)).toBe('Efectivo contra entrega');
    expect(paymentLabel('efectivo')).toBe('Efectivo contra entrega');
    expect(paymentLabel('transferencia')).toBe('Transferencia bancaria');
  });

  it('omite la línea de entrega si no hay estación de Metro', () => {
    const msg = buildWhatsAppMessage({
      ...order,
      metroLine: undefined,
      metroStation: undefined,
    });

    expect(msg).not.toContain('*Entrega:* Metro');
    expect(msg).not.toContain('undefined');
  });

  it('el enlace wa.me escapa saltos de línea y acentos', () => {
    const msg = buildWhatsAppMessage(order);
    const url = waMeUrl('912345678', msg);

    expect(url).not.toBeNull();
    expect(url).not.toContain('\n');
    expect(url).not.toContain(' ');
    expect(url).toContain('%0A');
    expect(url).toContain(encodeURIComponent('Ana Pérez'));
  });
});

describe('waMeUrl', () => {
  it('normaliza el teléfono sin duplicar el código país', () => {
    expect(waMeUrl('912345678', 'Hola')).toBe(
      `https://wa.me/56912345678?text=${encodeURIComponent('Hola')}`,
    );
    expect(waMeUrl('56912345678', 'Hola')).toBe(
      `https://wa.me/56912345678?text=${encodeURIComponent('Hola')}`,
    );
    expect(waMeUrl('+56 9 1234 5678', 'Hola')).toBe(
      `https://wa.me/56912345678?text=${encodeURIComponent('Hola')}`,
    );
  });

  it('returns base link without message and null on invalid phone', () => {
    expect(waMeUrl('912345678')).toBe('https://wa.me/56912345678');
    expect(waMeUrl('000000', 'Hola')).toBeNull();
    expect(waMeUrl('', 'Hola')).toBeNull();
    expect(waMeUrl(null, 'Hola')).toBeNull();
  });
});

describe('openWhatsApp', () => {
  let openSpy: jest.SpyInstance;
  let writeText: jest.Mock;

  beforeEach(() => {
    writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    openSpy = jest.spyOn(window, 'open').mockReturnValue({} as Window);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('opens wa.me with encoded text and copies the message as a safety net', () => {
    const result = openWhatsApp('912345678', 'Hola cliente', { copy: true });

    expect(result).toBe('opened');
    const [url] = openSpy.mock.calls[0];
    expect(url).toBe(`https://wa.me/56912345678?text=${encodeURIComponent('Hola cliente')}`);
    expect(writeText).toHaveBeenCalledWith('Hola cliente');
  });

  it('fails loudly on invalid phone instead of opening nothing', () => {
    const result = openWhatsApp('000000', 'Hola cliente', { copy: true });

    expect(result).toBe('invalid_phone');
    expect(openSpy).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('opens without text when the URL is too long and still copies the message', () => {
    const huge = 'Mensaje muy largo '.repeat(200);

    const result = openWhatsApp('912345678', huge, { copy: true });

    expect(result).toBe('opened_short');
    const [url] = openSpy.mock.calls[0];
    expect(url).toBe('https://wa.me/56912345678');
    expect(writeText).toHaveBeenCalledWith(huge);
  });

  it('falls back to an anchor when the popup is blocked', () => {
    openSpy.mockReturnValue(null);
    const clickSpy = jest.fn();
    const createSpy = jest
      .spyOn(document, 'createElement')
      .mockReturnValue({ click: clickSpy } as unknown as HTMLElement);

    const result = openWhatsApp('912345678', 'Hola');

    expect(result).toBe('opened');
    expect(clickSpy).toHaveBeenCalled();
    createSpy.mockRestore();
  });
});
