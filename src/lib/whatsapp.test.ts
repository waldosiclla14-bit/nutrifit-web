import {
  normalizeChilePhone,
  supplierWhatsAppUrl,
  buildSupplierOrderMessage,
  buildDeliveryOrderMessage,
  buildTickTickLine,
} from './whatsapp';

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
    expect(msg).toContain('Hola M.guti');
    expect(msg).toContain('• Whey Chocolate 1 kg ×3 — $48.000');
    expect(msg).toContain('• Creatina 300 g ×1 — $13.500');
    expect(msg).toContain('Pago:* Transferencia al recibir'.replace('*', '*'));
    expect(msg).toContain('📅 Miércoles 7 de octubre');
    expect(msg).toContain('⏰ 18:00');
    expect(msg).toContain('🚇 Metro Plaza Quilicura · L3');
    expect(msg).toContain('torniquetes o cambio de andén');
    expect(msg).toContain('https://nutrifit-web-nu.vercel.app');
    // Nada del ejemplo queda fijo: sin meeting point no aparece el paréntesis
    expect(buildDeliveryOrderMessage({ ...base, meetingPoint: undefined })).not.toContain('(Acceso');
  });

  it('marks RECIBIDO when paid', () => {
    const msg = buildDeliveryOrderMessage({ ...base, paymentReceived: true });
    expect(msg).toContain('RECIBIDO');
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
