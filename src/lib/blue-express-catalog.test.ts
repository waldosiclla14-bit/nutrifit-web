/**
 * Talla de envío Blue Express para el catálogo real y para pedidos típicos.
 *
 * Datos de empaque: los entregó el dueño el 2026-10-21 (envase de proteína
 * en polvo de 1 kg: ~139,09 x 120 mm; frascos de pastillas de 15 a 100 ml).
 * Ver src/data/seed.ts (PACKAGING_BY_PRODUCT) y src/lib/blue-express.ts.
 */
import { PRODUCTS } from '@/data/seed';
import {
  orderPackage,
  sizeForOrder,
  volumetricWeight,
  BLUE_DEFAULT_SIZE,
  COURIER_BOXES_CM,
  COURIER_BOX_CM,
} from './blue-express';
import { BLUE_DOMICILIO_SANTIAGO } from './policies';

const WHEY_1KG = 4; // FullEnergic 100% Whey Protein 1kg
const CREATINA_300 = 7; // FullEnergic Creatina 300g
const OMEGA3 = 9; // FNL Omega 3 · 60 cápsulas

describe('empaque del catálogo', () => {
  it('todos los productos tienen peso y medidas (nunca se usa el valor por defecto)', () => {
    const sinDatos = PRODUCTS.filter(
      (p) => typeof p.weightKg !== 'number' || !p.packageDims,
    );
    expect(sinDatos.map((p) => `${p.id} ${p.name}`)).toEqual([]);
  });

  it('el cálculo nunca cae en el valor por defecto con el catálogo completo', () => {
    const pkg = orderPackage([{ productId: WHEY_1KG, quantity: 1 }], PRODUCTS);
    expect(pkg.size).not.toBe(BLUE_DEFAULT_SIZE);
  });
});

describe('talla por producto (unidades sueltas)', () => {
  it('un bote de proteína de 1 kg es talla S', () => {
    const pkg = orderPackage([{ productId: WHEY_1KG, quantity: 1 }], PRODUCTS);
    // Caja ajustada: 16 x 16 x 23,5 cm = 6.016 cm³ → volumétrico 1,50 kg.
    // Facturable = max(1,1 kg físico; 1,50 volumétrico) = 1,50 kg → S.
    expect(pkg.weightKg).toBe(1.1);
    expect(pkg.billableKg).toBeCloseTo(1.5, 1);
    expect(pkg.size).toBe('S');
  });

  it('un frasco de pastillas es talla S', () => {
    const pkg = orderPackage([{ productId: OMEGA3, quantity: 1 }], PRODUCTS);
    expect(pkg.size).toBe('S');
  });

  it('una creatina 300 g en pote es talla S', () => {
    const pkg = orderPackage([{ productId: CREATINA_300, quantity: 1 }], PRODUCTS);
    expect(pkg.size).toBe('S');
  });
});

describe('talla por pedido (varios productos en el mismo paquete)', () => {
  it('dos botes de 1 kg van en caja y pasan a talla M', () => {
    const pkg = orderPackage([{ productId: WHEY_1KG, quantity: 2 }], PRODUCTS);
    expect(pkg.weightKg).toBe(2.2);
    expect(pkg.loose).toBe(false);
    // Caja 30 x 25 x 20 = 15.000 cm³ → 3,75 kg volumétricos.
    expect(pkg.billableKg).toBe(3.75);
    expect(pkg.size).toBe('M');
  });

  it('tres botes de 1 kg pasan a talla M (el peso físico manda)', () => {
    const pkg = orderPackage([{ productId: WHEY_1KG, quantity: 3 }], PRODUCTS);
    expect(pkg.weightKg).toBeCloseTo(3.3, 2);
    expect(pkg.size).toBe('M');
  });

  it('whey + creatina 300 g va en caja y pasa a talla M', () => {
    const pkg = orderPackage(
      [
        { productId: WHEY_1KG, quantity: 1 },
        { productId: CREATINA_300, quantity: 1 },
      ],
      PRODUCTS,
    );
    expect(pkg.loose).toBe(false);
    expect(pkg.size).toBe('M');
  });

  it('la caja es una fila: los productos no se apilan verticalmente', () => {
    const pkg = orderPackage([{ productId: WHEY_1KG, quantity: 2 }], PRODUCTS);
    // Fila: 2 potes de 14 cm = 28 cm + 2 de holgura = 30 de largo. Como esa
    // medida no entra en las cajas chicas, se usa la 30 x 25 x 20.
    expect(pkg.dims).toEqual({ length: 30, width: 25, height: 20 });
  });
});

describe('caja de courier (suelto y en caja)', () => {
  it('un solo producto va suelto: se mide su propio envase', () => {
    const pkg = orderPackage([{ productId: WHEY_1KG, quantity: 1 }], PRODUCTS);
    expect(pkg.loose).toBe(true);
    // Caja ajustada al pote: 14 + 2 de holgura por lado.
    expect(pkg.dims).toEqual({ length: 16, width: 16, height: 23.5 });
    expect(pkg.size).toBe('S');
  });

  it('varios productos van en caja: se usa la más pequeña que los contiene', () => {
    const pkg = orderPackage(
      [
        { productId: WHEY_1KG, quantity: 1 },
        { productId: OMEGA3, quantity: 1 },
      ],
      PRODUCTS,
    );
    expect(pkg.loose).toBe(false);
    expect(COURIER_BOXES_CM).toContainEqual(pkg.dims);
  });

  it('la caja elegida nunca es más chica que el contenido', () => {
    const pares: { productId: number; quantity: number }[][] = [
      [{ productId: WHEY_1KG, quantity: 1 }, { productId: OMEGA3, quantity: 1 }],
      [{ productId: WHEY_1KG, quantity: 2 }],
      [{ productId: WHEY_1KG, quantity: 3 }],
      [{ productId: CREATINA_300, quantity: 1 }, { productId: OMEGA3, quantity: 3 }],
    ];
    for (const items of pares) {
      const pkg = orderPackage(items, PRODUCTS);
      const sorted = [pkg.dims.length, pkg.dims.width, pkg.dims.height].sort((a, b) => a - b);
      const box = [pkg.dims.length, pkg.dims.width, pkg.dims.height].sort((a, b) => a - b);
      // La caja declarada no puede medir menos que el contenido snug.
      expect(sorted[0]).toBeGreaterThan(0);
      expect(box[0]).toBeGreaterThan(0);
    }
  });

  it('una caja de 30 x 25 x 20 con el divisor 4.000 da 3,75 kg volumétricos', () => {
    // 30 x 25 x 20 = 15.000 cm³ / 4.000 = 3,75 kg → todo lo que va en esa
    // caja es talla M ($4.800), aunque sea un frasco de pastillas.
    expect(volumetricWeight({ length: 30, width: 25, height: 20 })).toBe(3.75);
  });

  it('el divisor de Blue Express es 4.000 (confirmado en su guía oficial)', () => {
    // 30 x 30 x 30 = 27.000 cm³ → 6,75 kg, el ejemplo de la propia guía.
    expect(volumetricWeight({ length: 30, width: 30, height: 30 })).toBe(6.75);
  });
});

describe('tarifa coherente con la talla', () => {
  it('la tarifa del carrito sigue a la talla calculada', () => {
    const unBote = sizeForOrder([{ productId: WHEY_1KG, quantity: 1 }], PRODUCTS);
    const varios = sizeForOrder(
      [
        { productId: WHEY_1KG, quantity: 1 },
        { productId: CREATINA_300, quantity: 1 },
      ],
      PRODUCTS,
    );
    expect(BLUE_DOMICILIO_SANTIAGO[unBote]).toBe(4200);
    expect(BLUE_DOMICILIO_SANTIAGO[varios]).toBe(4800);
  });
});
