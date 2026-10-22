/**
 * Cálculo de la talla de envío según las reglas de Blue Express.
 *
 * Fuente oficial: https://www.blue.cl/nosotros/centro-de-ayuda/tallas-envio
 * (consultada 2026-10-20) y tarifario PYME
 * https://www.blue.cl/docs/enviar/tarifario-pyme.pdf
 *
 * Reglas verificadas de Blue Express:
 *  - La talla depende del peso físico Y del volumen del paquete.
 *  - Peso volumétrico = (largo x ancho x alto en cm) / 4000.
 *  - Se cobra el MAYOR entre peso físico y peso volumétrico.
 *  - "Cuando un paquete supera el límite de peso o volumen de una talla, pasa de
 *    inmediato al siguiente tamaño" (Blue lo reclasifica y lo cobra así).
 *  - "Intenta siempre seleccionar la talla correcta para evitar la suspensión de
 *    tu cuenta" → la talla la debe elegir el local, no el cliente.
 *
 * LÍMITES POR TALLA
 * Los umbrales en kg son los publicados en la guía de tallas de Blue (imágenes
 * en la página oficial) y en su tarifario. La tabla oficial está en imágenes, no
 * en texto, por lo que deben contrastarse con la calculadora de app.bluex.cl
 * antes de confiar en ellos para productos de un volumen grande.
 */
import type { BlueSize } from '@/types';

/** Peso máximo (kg) por talla, y volumen máximo equivalente (cm³). */
export const BLUE_SIZE_LIMITS: Record<BlueSize, { maxKg: number; label: string }> = {
  S: { maxKg: 3, label: 'hasta 3 kg' },
  M: { maxKg: 6, label: 'hasta 6 kg' },
};

export const BLUE_SIZE_ORDER: BlueSize[] = ['S', 'M'];

/**
 * Talla por defecto mientras no se midan los productos. Se usa M a propósito:
 * una talla mayor de la real la absorbe el local; una menor la absorbe el
 * cliente. Ante la duda, la mayor.
 */
export const BLUE_DEFAULT_SIZE: BlueSize = 'M';

/** Medidas de la caja/embalaje del producto, en centímetros. */
export type PackageDims = { length: number; width: number; height: number };

/** Peso volumétrico de Blue Express: (largo x ancho x alto) / 4000. */
export function volumetricWeight(dims: PackageDims): number {
  return (dims.length * dims.width * dims.height) / 4000;
}

/**
 * Peso facturable de Blue Express: el mayor entre el físico y el volumétrico.
 *
 * Se redondea a 2 decimales: los acumulados de peso generan errores de coma
 * flotante (3 botes de 1,1 kg dan 3,3000000000000003) y en el límite exacto
 * de una talla eso clasificaría el paquete en la talla equivocada.
 */
export function billableWeight(weightKg: number, dims?: PackageDims): number {
  const physical = weightKg;
  if (!dims) return round2(physical);
  return round2(Math.max(physical, volumetricWeight(dims)));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Talla que corresponde a un peso facturable.
 *
 * `maxKg` es el peso hasta el que la talla aguanta. El peso facturable se
 * compara contra el límite de cada talla: si lo supera, la talla es la
 * siguiente.
 */
export function sizeForWeight(billableKg: number): BlueSize {
  for (const size of BLUE_SIZE_ORDER) {
    if (billableKg <= BLUE_SIZE_LIMITS[size].maxKg) return size;
  }
  // Supera el límite de la última talla ofrecida: se aplica la mayor.
  return BLUE_SIZE_ORDER[BLUE_SIZE_ORDER.length - 1];
}

/**
 * Talla de un producto concreto, si se conoce su peso y el volumen de su
 * embalaje. Devuelve `null` cuando no hay datos suficientes: el tamaño
 * desconocido no es "talla M", es "no sabemos".
 */
export function sizeForProduct(product: {
  weightKg?: number;
  packageDims?: PackageDims;
}): BlueSize | null {
  if (typeof product.weightKg !== 'number' || product.weightKg <= 0) {
    return null;
  }
  return sizeForWeight(billableWeight(product.weightKg, product.packageDims));
}

/** Holgura que se deja al embalar (cm) por lado, para no subestimar la caja. */
const PACKING_ALLOWANCE_CM = 2;

/**
 * Cajas de courier disponibles para los pedidos de varios productos.
 *
 * Blue Express mide el PAQUETE que recibe, así que la caja manda sobre el
 * producto. Práctica del local (2026-10-21): "suelto y en caja" — un solo
 * producto va suelto (el pote sellado, tal cual) y los pedidos de varios
 * productos van en caja.
 *
 * OJO: una caja de 30 x 25 x 20 da 3,75 kg volumétricos (divisor 4.000), así
 * que **todo lo que vaya en esa caja es talla M** ($4.800), aunque sea un
 * frasco de pastillas. Si el local tiene cajas más pequeñas, se agregan aquí y
 * el cálculo baja a talla S ($4.200) en los pedidos que quepan.
 *
 * PENDIENTE: cargar las cajas que el local realmente usa.
 */
export const COURIER_BOXES_CM: PackageDims[] = [
  { length: 20, width: 15, height: 10 },
  { length: 25, width: 20, height: 15 },
  { length: 30, width: 20, height: 15 },
  { length: 25, width: 20, height: 25 },
  { length: 30, width: 25, height: 20 },
  { length: 40, width: 30, height: 25 },
];

/**
 * Caja de courier fija para TODO el pedido, si se usara una sola.
 * `null` = cada pedido usa la caja más pequeña de `COURIER_BOXES_CM` que lo
 * contenga (o va suelto si es un solo producto).
 */
export const COURIER_BOX_CM: PackageDims | null = null;

export type OrderPackage = {
  /** Peso total del contenido y su envase (kg). */
  weightKg: number;
  /** Caja que envuelve todo el pedido (cm). */
  dims: PackageDims;
  /** Peso facturable de Blue: el mayor entre físico y volumétrico. */
  billableKg: number;
  /** Talla que corresponde a ese peso facturable. */
  size: BlueSize;
  /** `true` si el pedido va suelto (un solo producto, sin caja). */
  loose: boolean;
};

/** ¿Cabe un conjunto de dimensiones dentro de la caja? (admite girar el paquete) */
export function fitsInBox(dims: PackageDims, box: PackageDims): boolean {
  const a = [dims.length, dims.width, dims.height].sort((x, y) => x - y);
  const b = [box.length, box.width, box.height].sort((x, y) => x - y);
  return a[0] <= b[0] && a[1] <= b[1] && a[2] <= b[2];
}

/**
 * Calcula el peso y la caja de un pedido completo.
 *
 * - Un solo producto va **suelto**: se mide su propio envase (+ holgura).
 * - Varios productos van **en caja**: se usa la caja más pequeña de
 *   `COURIER_BOXES_CM` que los contenga. Si ninguna los contiene, se usa la
 *   caja ajustada al contenido (más alta), que es conservadora en volumen.
 * - Si `COURIER_BOX_CM` está configurado, esa caja manda siempre.
 *
 * Si algún producto no tiene peso/medidas conocidos se usa la talla por
 * defecto del local, que es la más conservadora.
 */
export function orderPackage(
  items: { productId: number; quantity: number }[],
  products: { id: number; weightKg?: number; packageDims?: PackageDims }[],
): OrderPackage {
  const byId = new Map(products.map((p) => [p.id, p]));
  let weightKg = 0;
  let rowLength = 0;
  let rowWidth = 0;
  let rowHeight = 0;
  let units = 0;
  let unknown = false;

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product || typeof product.weightKg !== 'number' || !product.packageDims) {
      unknown = true;
      continue;
    }
    const qty = Math.max(1, item.quantity);
    units += qty;
    weightKg += product.weightKg * qty;
    // Los productos van en una fila (uno al lado del otro), no apilados: es
    // como se embalan de verdad y evita inflar la altura de la caja.
    rowLength += product.packageDims.length * qty;
    rowWidth = Math.max(rowWidth, product.packageDims.width);
    rowHeight = Math.max(rowHeight, product.packageDims.height);
  }

  if (unknown || weightKg === 0) {
    return {
      weightKg: 0,
      dims: { length: 0, width: 0, height: 0 },
      billableKg: 0,
      size: BLUE_DEFAULT_SIZE,
      loose: units <= 1,
    };
  }

  const snug: PackageDims = {
    length: rowLength + PACKING_ALLOWANCE_CM,
    width: rowWidth + PACKING_ALLOWANCE_CM,
    height: rowHeight + PACKING_ALLOWANCE_CM,
  };

  // Un solo producto va suelto; varios, en caja.
  const loose = units <= 1;
  let dims = snug;
  if (!loose) {
    if (COURIER_BOX_CM) {
      dims = fitsInBox(snug, COURIER_BOX_CM) ? COURIER_BOX_CM : snug;
    } else {
      const box = [...COURIER_BOXES_CM]
        .sort(
          (a, b) =>
            a.length * a.width * a.height - b.length * b.width * b.height,
        )
        .find((b) => fitsInBox(snug, b));
      dims = box ?? snug;
    }
  }

  const billableKg = billableWeight(weightKg, dims);
  return {
    weightKg: round2(weightKg),
    dims,
    billableKg,
    size: sizeForWeight(billableKg),
    loose,
  };
}

/**
 * Talla de un pedido: la del paquete completo (caja con todo lo que se
 * envía), no la mayor de cada producto por separado, porque van juntos.
 */
export function sizeForOrder(
  items: { productId: number; quantity: number }[],
  products: { id: number; weightKg?: number; packageDims?: PackageDims }[],
): BlueSize {
  return orderPackage(items, products).size;
}
