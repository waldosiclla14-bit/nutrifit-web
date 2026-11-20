import { DraftModelSchema, normalizeDraft } from './product-draft.schema';

const model = (overrides: Record<string, unknown> = {}) =>
  DraftModelSchema.parse({ name: 'Whey 1 kg', ...overrides });

describe('normalizeDraft', () => {
  const now = new Date('2026-11-20T12:00:00.000Z');

  it('usa el barcode entregado por el admin aunque el modelo lo omita', () => {
    const result = normalizeDraft(model({ barcode: null }), {
      inputBarcode: '5901234123457',
      now,
    });

    expect(result.draft.barcode).toBe('5901234123457');
  });

  it('el barcode del admin manda sobre otro barcode válido del modelo', () => {
    const result = normalizeDraft(model({ barcode: '4006381333931' }), {
      inputBarcode: '5901234123457',
      now,
    });

    expect(result.draft.barcode).toBe('5901234123457');
    expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('otro barcode')]));
  });

  it('descarta un barcode del admin con dígito verificador inválido', () => {
    const result = normalizeDraft(model({ barcode: '5901234123457' }), {
      inputBarcode: '12345678',
      now,
    });

    expect(result.draft.barcode).toBeNull();
    expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('entregado no es válido')]));
  });

  it('una foto cualquiera no respalda ISP ni ingredientes inventados', () => {
    const result = normalizeDraft(
      model({
        isp_number: 'ISP 12345',
        ingredients: 'Proteína de suero',
        sources: [{ type: 'label', title: 'Etiqueta', field: 'name' }],
      }),
      { hasPhoto: true, now },
    );

    expect(result.draft.isp_number).toBeNull();
    expect(result.draft.ingredients).toBeNull();
  });

  it('acepta ISP e ingredientes cuando la fuente cita el campo exacto', () => {
    const result = normalizeDraft(
      model({
        isp_number: 'ISP 12345',
        ingredients: 'Proteína de suero',
        sources: [
          { type: 'label', title: 'Etiqueta', field: 'isp_number' },
          { type: 'label', title: 'Etiqueta', field: 'ingredients' },
        ],
      }),
      { hasPhoto: true, now },
    );

    expect(result.draft.isp_number).toBe('ISP 12345');
    expect(result.draft.ingredients).toBe('Proteína de suero');
  });

  it('conserva fuentes web sin título y fija retrievedAt en el servidor', () => {
    const result = normalizeDraft(
      model({
        ingredients: 'Proteína de suero',
        sources: [{ type: 'web', url: 'https://example.cl/whey', field: 'ingredients', retrievedAt: '1999-01-01' }],
      }),
      { now },
    );

    expect(result.draft.sources).toHaveLength(1);
    expect(result.draft.sources[0].title).toBe('https://example.cl/whey');
    expect(result.draft.sources[0].retrievedAt).toBe(now.toISOString());
    expect(result.draft.ingredients).toBe('Proteína de suero');
  });
});
