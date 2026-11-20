import { draftToForm } from './productDraft';
import type { ProductDraft } from '@/types/productDraft';

const baseDraft: ProductDraft = {
  name: 'Whey Protein 1 kg',
  brand: 'FullEnergic',
  category: 'Proteína',
  flavors: ['Vainilla', 'Chocolate'],
  size: '1 kg',
  servings: 30,
  isp_number: 'ISP-12345',
  ingredients: 'Proteína de suero de leche',
  barcode: '7801234567890',
  description_short: 'Whey de rápida absorción',
  seo_title: 'Whey Protein 1 kg | FullEnergic',
  sku_suggested: 'PRO-WHEY1KG',
  confidence: { name: 0.9, servings: 0.6 },
  sources: [{ type: 'label', title: 'Etiqueta frontal', retrievedAt: '2026-11-18T12:00:00Z' }],
};

describe('draftToForm', () => {
  it('mapea la ficha y crea una variante por sabor', () => {
    const { form, variants } = draftToForm(baseDraft);

    expect(form).toMatchObject({
      name: 'Whey Protein 1 kg',
      sku: 'PRO-WHEY1KG',
      barcode: '7801234567890',
      category: 'Proteína',
      brand: 'FullEnergic',
      registroIsp: 'ISP-12345',
      size: '1 kg',
      servings: '30',
      ingredients: 'Proteína de suero de leche',
      descriptionShort: 'Whey de rápida absorción',
      seoTitle: 'Whey Protein 1 kg | FullEnergic',
    });
    expect(variants.map((v) => v.variantName)).toEqual(['Vainilla', 'Chocolate']);
    expect(variants.every((v) => v.stock === '' && v.barcode === '' && v.lowStockAlert === '5')).toBe(true);
  });

  it('tolera campos nulos y deja una variante vacía', () => {
    const { form, variants } = draftToForm({
      ...baseDraft,
      name: null,
      brand: null,
      category: null,
      flavors: [],
      size: null,
      servings: null,
      isp_number: null,
      ingredients: null,
      barcode: null,
      description_short: null,
      seo_title: null,
      sku_suggested: null,
    });

    expect(form.name).toBe('');
    expect(form.servings).toBe('');
    expect(form.barcode).toBe('');
    expect(variants).toHaveLength(1);
    expect(variants[0].variantName).toBe('');
  });

  it('ignora sabores vacíos y redondea porciones', () => {
    const { form, variants } = draftToForm({ ...baseDraft, flavors: ['', '  '], servings: 29.6 });
    expect(variants).toHaveLength(1);
    expect(form.servings).toBe('30');
  });
});
