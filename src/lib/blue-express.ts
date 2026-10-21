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

export type OrderPackage = {
  /** Peso total del contenido y su envase (kg). */
  weightKg: number;
  /** Caja que envuelve todo el pedido (cm). */
  dims: PackageDims;
  /** Peso facturable de Blue: el mayor entre físico y volumétrico. */
  billableKg: number;
  /** Talla que corresponde a ese peso facturable. */
  size: BlueSize;
};

/**
 * Calcula el peso y la caja de un pedido completo.
 *
 * La caja se estima con la base más grande (largo x ancho máximos) y la altura
 * acumulada de los productos, más una holgura de embalaje. El volumen
 * resultante es equivalente al de una caja real con esos productos, y el peso
 * físico suele dominar: es el que decide la talla en la mayoría de los casos.
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
  let length = 0;
  let width = 0;
  let height = 0;
  let unknown = false;

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product || typeof product.weightKg !== 'number' || !product.packageDims) {
      unknown = true;
      continue;
    }
    const qty = Math.max(1, item.quantity);
    weightKg += product.weightKg * qty;
    length = Math.max(length, product.packageDims.length);
    width = Math.max(width, product.packageDims.width);
    height += product.packageDims.height * qty;
  }

  if (unknown || weightKg === 0) {
    return {
      weightKg: 0,
      dims: { length: 0, width: 0, height: 0 },
      billableKg: 0,
      size: BLUE_DEFAULT_SIZE,
    };
  }

  const dims: PackageDims = {
    length: length + PACKING_ALLOWANCE_CM,
    width: width + PACKING_ALLOWANCE_CM,
    height: height + PACKING_ALLOWANCE_CM,
  };
  const billableKg = billableWeight(weightKg, dims);
  return { weightKg, dims, billableKg, size: sizeForWeight(billableKg) };
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
