/**
 * Tests de la opción de envío a domicilio con Blue Express.
 *
 * Las tarifas provienen de la tabla oficial de Blue Express (entrega a
 * domicilio, Santiago / Región Metropolitana), consultada 2026-10-20.
 * Ver src/lib/policies.ts.
 */
import { buildWhatsAppMessage } from './whatsapp';
import {
  BLUE_DOMICILIO_REFERENCE_SIZE,
  BLUE_DOMICILIO_SANTIAGO,
  SHIPPING_BLUE_FEE,
  SHIPPING_METRO_FEE,
} from './policies';
import { DEFAULT_SETTINGS } from './store';

describe('tarifas Blue Express (policies)', () => {
  it('expone talla S y M con las tarifas oficiales de domicilio en Santiago', () => {
    expect(BLUE_DOMICILIO_SANTIAGO.S).toBe(4200);
    expect(BLUE_DOMICILIO_SANTIAGO.M).toBe(4800);
  });

  it('la talla de referencia es una de las ofrecidas', () => {
    expect(['S', 'M']).toContain(BLUE_DOMICILIO_REFERENCE_SIZE);
  });

  it('la tarifa M es mayor que la S', () => {
    expect(BLUE_DOMICILIO_SANTIAGO.M).toBeGreaterThan(BLUE_DOMICILIO_SANTIAGO.S);
  });

  it('el JSON-LD declara la misma tarifa que el checkout (talla S)', () => {
    expect(SHIPPING_BLUE_FEE).toBe(BLUE_DOMICILIO_SANTIAGO.S);
  });

  it('el envío en metro conserva su tarifa', () => {
    expect(SHIPPING_METRO_FEE).toBe(DEFAULT_SETTINGS.shipping);
  });
});

describe('buildWhatsAppMessage con envío a domicilio', () => {
  const base = {
    name: 'Ana Pérez',
    phone: '912345678',
    items: [{ productId: 1, name: 'Whey 1kg', price: 16000, quantity: 1, image: '' }],
    subtotal: 16000,
    shipping: 4200,
    total: 20200,
  };

  it('incluye método, dirección, comuna y tamaño del paquete', () => {
    const msg = buildWhatsAppMessage({
      ...base,
      deliveryMethod: 'domicilio',
      address: 'Av. Siempre Viva 742',
      comuna: 'Ñuñoa',
      region: 'Región Metropolitana',
      blueSize: 'S',
    });

    expect(msg).toContain('Envío a domicilio (Blue Express)');
    expect(msg).toContain('Av. Siempre Viva 742');
    expect(msg).toContain('Ñuñoa');
    expect(msg).toContain('Tamaño del paquete:* S');
  });

  it('mantiene la entrega en metro cuando el método es metro', () => {
    const msg = buildWhatsAppMessage({
      ...base,
      deliveryMethod: 'metro',
      metroLine: '3',
      metroStation: 'Plaza de Bolsillo'.replace('Plaza de Bolsillo', 'Los Leones'),
    });

    expect(msg).toContain('Metro Los Leones — Línea 3');
    expect(msg).not.toContain('Blue Express');
  });

  it('declara el costo de envío y el total', () => {
    const msg = buildWhatsAppMessage({
      ...base,
      deliveryMethod: 'domicilio',
      address: 'Av. Siempre Viva 742',
      comuna: 'Ñuñoa',
      blueSize: 'S',
    });

    expect(msg).toContain('*Entrega:* $4.200');
    expect(msg).toContain('*TOTAL:* $20.200');
  });
});
