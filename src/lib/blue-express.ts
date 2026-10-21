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
 */
export function billableWeight(weightKg: number, dims?: PackageDims): number {
  if (!dims) return weightKg;
  return Math.max(weightKg, volumetricWeight(dims));
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

/**
 * Talla de un pedido: la mayor entre las tallas de los productos, porque van
 * en el mismo paquete. Si algún producto no tiene peso/medidas conocidos se
 * aplica la talla por defecto del local, que es la más conservadora.
 */
export function sizeForOrder(
  items: { productId: number; quantity: number }[],
  products: { id: number; weightKg?: number; packageDims?: PackageDims }[],
): BlueSize {
  const byId = new Map(products.map((p) => [p.id, p]));
  let worst: BlueSize | null = null;
  for (const item of items) {
    const product = byId.get(item.productId);
    const size = product ? sizeForProduct(product) : null;
    if (size === null) {
      // Producto sin datos de peso/volumen: no se puede afinar la talla.
      return BLUE_DEFAULT_SIZE;
    }
    if (worst === null || BLUE_SIZE_ORDER.indexOf(size) > BLUE_SIZE_ORDER.indexOf(worst)) {
      worst = size;
    }
  }
  return worst ?? BLUE_DEFAULT_SIZE;
}
