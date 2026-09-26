import {
  normalizeChilePhone,
  supplierWhatsAppUrl,
  buildSupplierOrderMessage,
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
