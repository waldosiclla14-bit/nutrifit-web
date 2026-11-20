/**
 * Borrador de ficha de producto producido por el asistente (IA).
 * Todos los campos son opcionales: un borrador nunca bloquea el guardado.
 * `sources` y `confidence` existen para trazabilidad y revisión humana.
 */

export type ProductDraftSourceType = 'label' | 'web' | 'catalog';

export type ProductDraftSource = {
  type: ProductDraftSourceType;
  title: string;
  url?: string;
  field?: string;
  retrievedAt: string;
};

export type ProductDraft = {
  name: string | null;
  brand: string | null;
  category: string | null;
  flavors: string[];
  size: string | null;
  servings: number | null;
  isp_number: string | null;
  ingredients: string | null;
  barcode: string | null;
  description_short: string | null;
  seo_title: string | null;
  sku_suggested: string | null;
  confidence: Record<string, number>;
  sources: ProductDraftSource[];
};
