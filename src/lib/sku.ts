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

/**
 * Genera una propuesta de SKU legible: NF-<CAT3>-<NOMBRE>-<TAMAÑO>.
 * Solo es una sugerencia de UI; el backend sigue garantizando unicidad
 * (uniqueSku) y validando el formato final.
 */
export function generateSku(category: string, name: string, size?: string): string {
  const parts = [
    'NF',
    normalizeSku(category || 'GEN').slice(0, 3) || 'GEN',
    normalizeSku(name || 'PRODUCTO').slice(0, 28) || 'PRODUCTO',
  ];
  const sizePart = normalizeSku(size || '').slice(0, 8);
  if (sizePart) parts.push(sizePart);
  return parts.join('-').replace(/-+/g, '-').slice(0, 50).replace(/-+$/g, '');
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
