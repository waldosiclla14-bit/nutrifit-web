/**
 * Validación y normalización de SKU (Merchant Center + ERP).
 * Formato: NF-<CATEGORIA>-<PRODUCTO>-<TAMAÑO>, mayúsculas, sin espacios ni
 * tildes, 1-50 caracteres. Ver docs/SEO-MERCHANT.md.
 */

export const SKU_RE = /^[A-Z0-9-]{1,50}$/;

/** Normaliza un SKU ingresado: mayúsculas, sin tildes, espacios → guiones. */
export function normalizeSku(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** true si el SKU es válido (1-50 caracteres, mayúsculas, sin espacios). */
export function isValidSku(sku: string | null | undefined): sku is string {
  return !!sku && SKU_RE.test(sku);
}

/** Mensaje de error si el SKU no es válido, o null si está bien. */
export function skuError(sku: string | null | undefined): string | null {
  if (!sku || !sku.trim()) return 'El SKU es obligatorio.';
  const normalized = normalizeSku(sku);
  if (normalized.length > 50) return 'El SKU no puede superar los 50 caracteres.';
  if (normalized !== sku.trim()) {
    return 'El SKU solo admite letras mayúsculas, números y guiones (sin tildes ni espacios).';
  }
  if (!SKU_RE.test(normalized)) return 'El SKU solo admite letras mayúsculas, números y guiones.';
  return null;
}
