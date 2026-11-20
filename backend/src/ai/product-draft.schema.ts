import { z } from 'zod';

/** Campos que el modelo puede devolver y que se expuestos en `confidence`. */
export const DRAFT_FIELDS = [
  'name',
  'brand',
  'category',
  'flavors',
  'size',
  'servings',
  'isp_number',
  'ingredients',
  'barcode',
  'description_short',
  'seo_title',
  'sku_suggested',
] as const;

export type DraftField = (typeof DRAFT_FIELDS)[number];

const nullableText = (max: number) => z.string().trim().max(max).nullable().catch(null);

const nullableInt = (min: number, max: number) =>
  z
    .preprocess(
      (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value),
      z.number().int().min(min).max(max).nullable(),
    )
    .catch(null);

const isHttpUrl = (value: string) => /^https?:\/\/\S+$/i.test(value);

export const DraftSourceSchema = z.object({
  type: z.enum(['label', 'web', 'catalog']),
  // El modelo suele omitir el título de fuentes web: no por eso se pierden todas.
  title: z.string().trim().max(200).optional().catch(undefined),
  url: z.string().trim().max(500).refine(isHttpUrl, 'URL inválida').optional().catch(undefined),
  field: z.string().trim().max(50).optional().catch(undefined),
  retrievedAt: z.string().trim().min(1).optional().catch(undefined),
});

export const DraftModelSchema = z.object({
  name: nullableText(120),
  brand: nullableText(80),
  category: nullableText(80),
  flavors: z.array(z.string().trim().min(1).max(40).catch('')).max(12).catch([]),
  size: nullableText(40),
  servings: nullableInt(1, 1000),
  isp_number: nullableText(40),
  ingredients: nullableText(2000),
  barcode: nullableText(20),
  description_short: nullableText(300),
  seo_title: nullableText(120),
  sku_suggested: nullableText(50),
  confidence: z.record(z.string(), z.number().min(0).max(1).catch(0)).catch({}),
  sources: z.array(DraftSourceSchema).max(10).catch([]),
});

export type DraftModel = z.infer<typeof DraftModelSchema>;

export type DraftSource = Omit<z.infer<typeof DraftSourceSchema>, 'retrievedAt' | 'title'> & {
  title: string;
  retrievedAt: string;
};

export type NormalizedDraft = {
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
  sources: DraftSource[];
};

export type NormalizeResult = {
  draft: NormalizedDraft;
  confidence: Record<string, number>;
  warnings: string[];
};

export type NormalizeContext = {
  /** Texto pegado por el usuario, barcode o URL (no es OCR de la foto). */
  ocrText?: string;
  /** Código escrito/escaneado por el admin: manda sobre lo que diga el modelo. */
  inputBarcode?: string;
  hasPhoto?: boolean;
  now?: Date;
};

const CLAIMS = [
  /\bcura\b/i,
  /\btrata\b/i,
  /\bpreviene\b/i,
  /\badelgaza\b/i,
  /quema grasa/i,
  /mejora la salud/i,
  /elimina la grasa/i,
];

const SKU_RE = /^[A-Z0-9-]{1,50}$/;

/**
 * Sanea la respuesta del modelo antes de devolverla al cliente.
 * Nunca "inventa" nada: si un dato no se puede verificar, se anula y se avisa.
 */
export function normalizeDraft(raw: DraftModel, ctx: NormalizeContext = {}): NormalizeResult {
  const warnings: string[] = [];
  const nowIso = (ctx.now ?? new Date()).toISOString();
  const ocrText = String(ctx.ocrText || '');

  const sources: DraftSource[] = (raw.sources || [])
    .filter((s) => !s.url || isHttpUrl(s.url))
    // El modelo no debe inventar la fecha de consulta: siempre la pone el servidor.
    .map((s) => ({
      ...s,
      title: s.title || s.url || 'Etiqueta del producto',
      retrievedAt: nowIso,
    }))
    .slice(0, 10);

  const hasTextSource = !!ocrText.trim();
  // Adjuntar cualquier foto NO basta: la fuente debe citar el campo concreto.
  const backedBySourceFor = (field: string) =>
    sources.some(
      (s) =>
        (s.type === 'label' && s.field === field) ||
        (s.type === 'web' && !!s.url && (!s.field || s.field === field)),
    );

  const draft: NormalizedDraft = {
    name: sanitizeText(raw.name, 120, 'name', warnings),
    brand: sanitizeText(raw.brand, 80, 'brand', warnings),
    category: sanitizeText(raw.category, 80, 'category', warnings),
    flavors: dedupeFlavors(raw.flavors || []),
    size: sanitizeText(raw.size, 40, 'size', warnings),
    servings: raw.servings ?? null,
    isp_number: sanitizeText(raw.isp_number, 40, 'isp_number', warnings),
    ingredients: sanitizeText(raw.ingredients, 2000, 'ingredients', warnings),
    barcode: sanitizeText(raw.barcode, 20, 'barcode', warnings),
    description_short: sanitizeText(raw.description_short, 300, 'description_short', warnings),
    seo_title: sanitizeText(raw.seo_title, 120, 'seo_title', warnings),
    sku_suggested: sanitizeText(raw.sku_suggested, 50, 'sku_suggested', warnings),
    sources,
  };

  // Barcode: solo dígitos y dígito verificador válido.
  if (draft.barcode) {
    const digits = draft.barcode.replace(/\D/g, '');
    if (!isValidBarcode(digits)) {
      draft.barcode = null;
      warnings.push('Código de barras inválido: se descartó.');
    } else {
      draft.barcode = digits;
    }
  }

  // El código que el admin escribió o escaneó es la fuente autoritativa.
  const inputBarcode = String(ctx.inputBarcode || '').replace(/\D/g, '');
  if (inputBarcode) {
    if (!isValidBarcode(inputBarcode)) {
      draft.barcode = null;
      warnings.push('El código de barras entregado no es válido: se descartó.');
    } else if (draft.barcode !== inputBarcode) {
      if (draft.barcode) warnings.push('El modelo devolvió otro barcode: se usó el código entregado por ti.');
      draft.barcode = inputBarcode;
    }
  }

  // ISP: solo si aparece en el texto o una fuente cita explícitamente el campo.
  if (draft.isp_number) {
    const digits = draft.isp_number.replace(/\D/g, '');
    const foundInText = !!digits && ocrText.replace(/\D/g, '').includes(digits);
    if (!digits || (!foundInText && !backedBySourceFor('isp_number'))) {
      draft.isp_number = null;
      warnings.push('Registro ISP sin respaldo verificable: no se guardó.');
    }
  }

  // Ingredientes: solo si vienen del texto o una fuente cita explícitamente el campo.
  if (draft.ingredients && !(hasTextSource || backedBySourceFor('ingredients'))) {
    draft.ingredients = null;
    warnings.push('Ingredientes sin fuente verificable: no se guardaron.');
  }

  // SKU sugerido: el cliente igual genera uno, pero no aceptamos basura.
  if (draft.sku_suggested) {
    draft.sku_suggested = draft.sku_suggested.toUpperCase();
    if (!SKU_RE.test(draft.sku_suggested)) {
      draft.sku_suggested = null;
      warnings.push('SKU sugerido inválido: lo generará el sistema.');
    }
  }

  // Claims médicos en textos comerciales.
  for (const field of ['description_short', 'seo_title'] as const) {
    const value = draft[field];
    if (!value) continue;
    if (!CLAIMS.some((r) => r.test(value))) continue;
    const cleaned = value
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => !CLAIMS.some((r) => r.test(sentence)))
      .join(' ')
      .trim();
    draft[field] = cleaned || null;
    warnings.push(`Se quitaron afirmaciones médicas de ${field}.`);
  }

  const confidence: Record<string, number> = {};
  for (const field of DRAFT_FIELDS) {
    const value = raw.confidence?.[field];
    confidence[field] = typeof value === 'number' && value >= 0 && value <= 1 ? value : 0;
  }

  return { draft, confidence, warnings };
}

/** Valida EAN-8, UPC-A, EAN-13 y GTIN-14 con el dígito verificador módulo 10. */
export function isValidBarcode(value: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(value)) return false;
  const digits = value.split('').map(Number);
  const check = digits.pop() as number;
  let sum = 0;
  digits.reverse().forEach((digit, i) => {
    sum += digit * (i % 2 === 0 ? 3 : 1);
  });
  return (10 - (sum % 10)) % 10 === check;
}

function sanitizeText(
  value: string | null,
  max: number,
  field: string,
  warnings: string[],
): string | null {
  if (!value) return null;
  const clean = value.replace(/<[^>]*>/g, '').trim();
  if (clean !== value) warnings.push(`Se quitó HTML de ${field}.`);
  if (!clean) return null;
  return clean.slice(0, max);
}

function dedupeFlavors(flavors: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const flavor of flavors) {
    const clean = flavor.replace(/<[^>]*>/g, '').trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean.slice(0, 40));
    if (result.length >= 12) break;
  }
  return result;
}
