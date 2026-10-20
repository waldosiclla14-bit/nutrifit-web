/**
 * Fuente única de políticas comerciales (garantía y envío).
 * Cualquier texto, JSON-LD o cálculo que mencione plazos de devolución o
 * tarifas de envío debe leer de aquí. No escribir "30 días" ni tarifas a mano.
 */

/** Días de garantía de satisfacción (política de devoluciones). */
export const RETURN_DAYS = 10;

/** Tarifas de envío por zona (CLP). Coinciden con el checkout. */
export const SHIPPING_METRO_FEE = 1000;
export const SHIPPING_BLUE_FEE = 4000;
export const SHIPPING_STARKEN_FEE = 4000;

/** Texto reutilizable de la garantía. */
export const RETURN_POLICY_TEXT = `Garantía de satisfacción de ${RETURN_DAYS} días`;

export const RETURN_POLICY_TEXT_SHORT = `Garantía ${RETURN_DAYS} días`;
