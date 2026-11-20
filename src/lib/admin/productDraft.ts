import type { ProductDraft } from '@/types/productDraft';

/** Campos de texto del formulario de producto que un borrador puede rellenar. */
export type DraftFormFields = {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  description: string;
  registroIsp: string;
  size: string;
  servings: string;
  ingredients: string;
  descriptionShort: string;
  seoTitle: string;
};

export type DraftVariant = {
  variantName: string;
  sku: string;
  barcode: string;
  price: string;
  costPrice: string;
  stock: string;
  lowStockAlert: string;
};

export type DraftForm = {
  form: DraftFormFields;
  variants: DraftVariant[];
};

const text = (value: string | null | undefined) => (value ? value.trim() : '');
const integer = (value: number | null | undefined) =>
  value != null && Number.isFinite(value) && value > 0 ? String(Math.round(value)) : '';

export const emptyDraftVariant = (): DraftVariant => ({
  variantName: '',
  sku: '',
  barcode: '',
  price: '',
  costPrice: '',
  stock: '',
  lowStockAlert: '5',
});

/**
 * Convierte un borrador del asistente al shape del formulario de Productos.
 * No escribe nada: solo prepara los valores para que el admin los revise.
 * Un sabor del borrador se traduce en una variante con stock 0 (sin inventario).
 */
export function draftToForm(draft: ProductDraft): DraftForm {
  const form: DraftFormFields = {
    name: text(draft.name),
    sku: text(draft.sku_suggested),
    barcode: text(draft.barcode),
    category: text(draft.category),
    brand: text(draft.brand),
    description: '',
    registroIsp: text(draft.isp_number),
    size: text(draft.size),
    servings: integer(draft.servings),
    ingredients: text(draft.ingredients),
    descriptionShort: text(draft.description_short),
    seoTitle: text(draft.seo_title),
  };

  const flavors = (draft.flavors || []).map((flavor) => flavor.trim()).filter(Boolean);
  const variants =
    flavors.length > 0
      ? flavors.map((flavor) => ({ ...emptyDraftVariant(), variantName: flavor }))
      : [emptyDraftVariant()];

  return { form, variants };
}
