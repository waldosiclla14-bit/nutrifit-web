/**
 * Talla de envío Blue Express para el catálogo real y para pedidos típicos.
 *
 * Datos de empaque: los entregó el dueño el 2026-10-21 (envase de proteína
 * en polvo de 1 kg: ~139,09 x 120 mm; frascos de pastillas de 15 a 100 ml).
 * Ver src/data/seed.ts (PACKAGING_BY_PRODUCT) y src/lib/blue-express.ts.
 */
import { PRODUCTS } from '@/data/seed';
import { orderPackage, sizeForOrder, BLUE_DEFAULT_SIZE } from './blue-express';
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
    // Peso volumétrico: 15,9 x 15,9 x 14 = 3,38 kg / 4000 = 0,84 kg.
    // Facturable = max(1,1 kg físico; 0,84 volumétrico) = 1,1 kg → S.
    expect(pkg.weightKg).toBe(1.1);
    expect(pkg.billableKg).toBe(1.1);
    expect(pkg.size).toBe('S');
  });

  it('un frasco de pastillas es talla S', () => {
    const pkg = orderPackage([{ productId: OMEGA3, quantity: 1 }], PRODUCTS);
    expect(pkg.size).toBe('S');
  });
});

describe('talla por pedido (varios productos en el mismo paquete)', () => {
  it('dos botes de 1 kg siguen en talla S', () => {
    const pkg = orderPackage([{ productId: WHEY_1KG, quantity: 2 }], PRODUCTS);
    expect(pkg.weightKg).toBe(2.2);
    expect(pkg.size).toBe('S');
  });

  it('tres botes de 1 kg pasan a talla M (el peso físico manda)', () => {
    const pkg = orderPackage([{ productId: WHEY_1KG, quantity: 3 }], PRODUCTS);
    expect(pkg.weightKg).toBeCloseTo(3.3, 2);
    expect(pkg.size).toBe('M');
  });

  it('whey + creatina 300 g sigue en talla S', () => {
    const pkg = orderPackage(
      [
        { productId: WHEY_1KG, quantity: 1 },
        { productId: CREATINA_300, quantity: 1 },
      ],
      PRODUCTS,
    );
    expect(pkg.size).toBe('S');
  });

  it('la altura de la caja acumula los productos', () => {
    const pkg = orderPackage([{ productId: WHEY_1KG, quantity: 2 }], PRODUCTS);
    // 2 bystanders de 12 cm + 2 cm de holgura.
    expect(pkg.dims.height).toBe(26);
  });
});

describe('tarifa coherente con la talla', () => {
  it('la tarifa del carrito sigue a la talla calculada', () => {
    const unBote = sizeForOrder([{ productId: WHEY_1KG, quantity: 1 }], PRODUCTS);
    const tresBotes = sizeForOrder([{ productId: WHEY_1KG, quantity: 3 }], PRODUCTS);
    expect(BLUE_DOMICILIO_SANTIAGO[unBote]).toBe(4200);
    expect(BLUE_DOMICILIO_SANTIAGO[tresBotes]).toBe(4800);
  });
});
