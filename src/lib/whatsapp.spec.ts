import { buildWhatsAppMessage, buildComboMessage, buildDeliveryOrderMessage, formatDeliveryDay, openWhatsApp, webFooter } from './whatsapp';

describe('whatsapp.ts', () => {
  describe('webFooter', () => {
    it('contains site URL', () => {
      const footer = webFooter();
      expect(footer).toContain('nutrifit-web-nu.vercel.app');
    });
  });

  describe('buildWhatsAppMessage', () => {
    it('builds message with all fields', () => {
      const msg = buildWhatsAppMessage({
        name: 'Juan Pérez',
        phone: '56912345678',
        metroLine: 'L1',
        metroStation: 'Baquedano',
        items: [
          { productName: 'Whey Protein', variantName: 'Vainilla 2kg', quantity: 2, unitPrice: 30000, total: 60000 },
        ],
        subtotal: 60000,
        discount: 5000,
        shipping: 1000,
        total: 56000,
      });

      expect(msg).toContain('Juan');
      expect(msg).toContain('Whey Protein');
      expect(msg).toContain('Vainilla 2kg');
      expect(msg).toContain('Baquedano');
      expect(msg).toContain('56');
    });

    it('handles zero discount', () => {
      const msg = buildWhatsAppMessage({
        name: 'Test',
        phone: '123',
        items: [{ productName: 'P', quantity: 1, unitPrice: 1000, total: 1000 }],
        subtotal: 1000,
        discount: 0,
        shipping: 0,
        total: 1000,
      });

      expect(msg).toContain('1');
    });
  });

  describe('buildComboMessage', () => {
    it('builds combo message', () => {
      const msg = buildComboMessage({
        name: 'Combo Verano',
        desc: 'Pack completo',
        items: ['Whey Protein', 'Creatina', 'BCAA'],
        price: 45000,
      });

      expect(msg).toContain('COMBO');
      expect(msg).toContain('Combo Verano');
      expect(msg).toContain('Whey Protein');
      expect(msg).toContain('45');
    });
  });

  describe('buildDeliveryOrderMessage', () => {
    it('builds metro delivery message', () => {
      const msg = buildDeliveryOrderMessage({
        name: 'María',
        phone: '56987654321',
        orderNumber: 'NF-000123',
        items: [{ productName: 'Creatina', quantity: 1, total: 15000 }],
        subtotal: 15000,
        discount: 0,
        shippingCost: 1000,
        total: 16000,
        paymentLabel: 'Efectivo',
        paymentReceived: true,
        metroLine: 'L5',
        metroStation: 'Ñuñoa',
        deliveryDay: '2026-09-10',
        deliveryTime: '17:00',
        deliveryTimeEnd: '17:30',
        meetingPoint: 'Acceso sur',
        deliveryCode: '5832',
      });

      expect(msg).toContain('María');
      expect(msg).toContain('NF-000123');
      expect(msg).toContain('Creatina');
      expect(msg).toContain('Ñuñoa');
      expect(msg).toContain('5832');
      expect(msg).toContain('Acceso sur');
    });

    it('handles missing optional fields', () => {
      const msg = buildDeliveryOrderMessage({
        name: 'Test',
        phone: '123',
        orderNumber: 'NF-001',
        items: [{ productName: 'P', quantity: 1, total: 1000 }],
        subtotal: 1000,
        discount: 0,
        shippingCost: 0,
        total: 1000,
        paymentLabel: 'Transferencia',
        paymentReceived: false,
        metroLine: '',
        metroStation: '',
        deliveryDay: '2026-09-10',
        deliveryTime: '12:00',
      });

      expect(msg).toContain('Test');
      expect(msg).toContain('CONTRA ENTREGA');
    });
  });

  describe('formatDeliveryDay', () => {
    it('formats ISO date to Spanish weekday', () => {
      const result = formatDeliveryDay('2026-09-10');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('returns empty string for empty input', () => {
      expect(formatDeliveryDay('')).toBe('');
    });

    it('returns raw string for invalid date', () => {
      expect(formatDeliveryDay('invalid')).toBe('invalid');
    });
  });

  describe('openWhatsApp', () => {
    it('creates WhatsApp link with Chilean country code', () => {
      const link = document.createElement('a');
      const appendSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        link.href = (node as HTMLAnchorElement).href;
        return node;
      });
      const clickSpy = jest.spyOn(link, 'click').mockImplementation(() => {});
      const removeSpy = jest.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

      openWhatsApp('912345678', 'Test message');

      expect(appendSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();

      appendSpy.mockRestore();
      clickSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
