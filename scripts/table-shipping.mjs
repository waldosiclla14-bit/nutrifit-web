/**
 * Tabla de precios de envío a domicilio según el formato del pedido.
 * Escenario configurado: un producto va suelto, varios van en caja.
 *
 * Uso: npx tsx scripts/table-shipping.mjs
 */
import { PRODUCTS } from '../src/data/seed.ts';
import { orderPackage, COURIER_BOXES_CM } from '../src/lib/blue-express.ts';

const RATES = { S: 4200, M: 4800 };
const money = (n) => `$${n.toLocaleString('es-CL')}`;

const CASES = [
  { nombre: '1 whey 1 kg', items: [{ productId: 4, quantity: 1 }] },
  { nombre: '1 frasco de pastillas', items: [{ productId: 9, quantity: 1 }] },
  { nombre: '1 creatina 300 g', items: [{ productId: 7, quantity: 1 }] },
  { nombre: '1 batidora 700 ml', items: [{ productId: 35, quantity: 1 }] },
  { nombre: 'whey + 1 frasco', items: [{ productId: 4, quantity: 1 }, { productId: 9, quantity: 1 }] },
  { nombre: 'whey + creatina', items: [{ productId: 4, quantity: 1 }, { productId: 7, quantity: 1 }] },
  { nombre: 'whey + 3 frascos', items: [{ productId: 4, quantity: 1 }, { productId: 9, quantity: 3 }] },
  { nombre: '2 whey 1 kg', items: [{ productId: 4, quantity: 2 }] },
  { nombre: '3 whey 1 kg', items: [{ productId: 4, quantity: 3 }] },
  { nombre: '4 whey 1 kg', items: [{ productId: 4, quantity: 4 }] },
];

console.log('Cajas configuradas:', COURIER_BOXES_CM.map((b) => `${b.length}x${b.width}x${b.height}`).join(', '), '\n');
console.log('Formato del pedido'.padEnd(22) + 'Peso    Caja            Facturable  Talla  Envío');
console.log('-'.repeat(78));
for (const c of CASES) {
  const pkg = orderPackage(c.items, PRODUCTS);
  const d = `${pkg.dims.length}x${pkg.dims.width}x${pkg.dims.height}`;
  console.log(
    c.nombre.padEnd(22) +
      `${String(pkg.weightKg).padStart(5)} kg ` +
      `${d.padEnd(16)}` +
      `${pkg.billableKg.toFixed(2).padStart(6)} kg  ` +
      `${pkg.size.padEnd(6)}` +
      `${money(RATES[pkg.size])}` +
      (pkg.loose ? '  (suelto)' : '  (en caja)'),
  );
}
