/**
 * Cálculo de la talla de envío según las reglas de Blue Express.
 *
 * Fuente: https://www.blue.cl/nosotros/centro-de-ayuda/tallas-envio
 * (consultada 2026-10-20). Peso volumétrico = (largo x ancho x alto) / 4000 y
 * se cobra el mayor entre peso físico y volumétrico.
 */
import {
  BLUE_DEFAULT_SIZE,
  billableWeight,
  sizeForOrder,
  sizeForProduct,
  sizeForWeight,
  volumetricWeight,
} from './blue-express';

describe('volumetricWeight', () => {
  it('usa la fórmula de Blue: (largo x ancho x alto) / 4000', () => {
    expect(volumetricWeight({ length: 30, width: 30, height: 30 })).toBe(6.75);
    expect(volumetricWeight({ length: 20, width: 20, height: 20 })).toBe(2);
  });
});

describe('billableWeight', () => {
  it('usa el peso físico si no hay medidas', () => {
    expect(billableWeight(1.2)).toBe(1.2);
  });

  it('usa el mayor entre físico y volumétrico', () => {
    // Ejemplo de Blue: 1 kg en caja de 30x30x30 → volumétrico 6,75.
    expect(billableWeight(1, { length: 30, width: 30, height: 30 })).toBe(6.75);
  });

  it('usa el peso físico cuando es mayor que el volumétrico', () => {
    expect(billableWeight(5, { length: 20, width: 20, height: 20 })).toBe(5);
  });
});

describe('sizeForWeight', () => {
  it('clasifica por el peso facturable', () => {
    expect(sizeForWeight(0.4)).toBe('S');
    expect(sizeForWeight(2)).toBe('S');
    expect(sizeForWeight(3)).toBe('S');
    expect(sizeForWeight(3.1)).toBe('M');
    expect(sizeForWeight(6)).toBe('M');
  });

  it('nunca devuelve una talla mayor a la máxima ofrecida', () => {
    expect(sizeForWeight(50)).toBe('M');
  });
});

describe('sizeForProduct', () => {
  it('devuelve null si no hay peso conocido (no es "talla M", es "no sabemos")', () => {
    expect(sizeForProduct({})).toBeNull();
  });

  it('calcula la talla con peso y medidas', () => {
    // 1 kg en caja de 30x30x30 → volumétrico 6,75 → talla M (la mayor ofrecida).
    expect(
      sizeForProduct({ weightKg: 1, packageDims: { length: 30, width: 30, height: 30 } }),
    ).toBe('M');
    // 1 kg en caja pequeña → volumétrico bajo → talla S.
    expect(
      sizeForProduct({ weightKg: 1, packageDims: { length: 20, width: 15, height: 10 } }),
    ).toBe('S');
  });
});

describe('sizeForOrder', () => {
  it('toma la talla mayor de todos los productos del pedido', () => {
    const products = [
      { id: 1, weightKg: 0.5, packageDims: { length: 15, width: 10, height: 5 } },
      { id: 2, weightKg: 4, packageDims: { length: 25, width: 20, height: 15 } },
    ];
    expect(sizeForOrder([{ productId: 1, quantity: 1 }], products)).toBe('S');
    expect(
      sizeForOrder(
        [
          { productId: 1, quantity: 1 },
          { productId: 2, quantity: 1 },
        ],
        products,
      ),
    ).toBe('M');
  });

  it('usa la talla por defecto si ningún producto tiene medidas', () => {
    expect(sizeForOrder([{ productId: 99, quantity: 1 }], [])).toBe(BLUE_DEFAULT_SIZE);
  });
});
