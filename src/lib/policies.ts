/**
 * Fuente única de políticas comerciales (garantía y envío).
 * Cualquier texto, JSON-LD o cálculo que mencione plazos de devolución o
 * tarifas de envío debe leer de aquí. No escribir "30 días" ni tarifas a mano.
 */

/** Días de garantía de satisfacción (política de devoluciones). */
export const RETURN_DAYS = 10;

/** Tarifas de envío por zona (CLP). Coinciden con el checkout. */
export const SHIPPING_METRO_FEE = 1000;
/** Tarifa Blue Express declarada en el JSON-LD: referencia talla S, Santiago. */
export const SHIPPING_BLUE_FEE = 4200;
export const SHIPPING_STARKEN_FEE = 4000;

/**
 * Tarifas Blue Express para entrega A DOMICILIO en Santiago (Región
 * Metropolitana), por talla del paquete (CLP, IVA incluido).
 *
 * Fuente: https://www.blue.cl/emprendedores/plataforma-emprendedores
 * (tabla "CON ENTREGA A DOMICILIO" · zona misma región). Consultada 2026-10-20.
 *
 * Fase inicial: solo Santiago y tallas S/M. Los packs de suplementos entran en
 * talla S (hasta 3 kg) o M (hasta 6 kg) según su peso real; hasta medir cada
 * producto, el cliente elige la talla en el carrito. No modificar sin
 * re-verificar la tarifa oficial.
 */
export const BLUE_DOMICILIO_REFERENCE_SIZE = 'S';

export const BLUE_DOMICILIO_SANTIAGO: Record<'S' | 'M', number> = {
  S: 4200,
  M: 4800,
};

/** Texto reutilizable de la garantía. */
export const RETURN_POLICY_TEXT = `Garantía de satisfacción de ${RETURN_DAYS} días`;

export const RETURN_POLICY_TEXT_SHORT = `Garantía ${RETURN_DAYS} días`;
