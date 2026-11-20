import { HttpException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { ProductDraftService } from './product-draft.service';

const usageMock = {
  consume: jest.fn(),
  addTokens: jest.fn(),
  limit: 60,
};

const productsMock = {
  findDuplicates: jest.fn(),
};

function geminiReply(payload: unknown, extra: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: typeof payload === 'string' ? payload : JSON.stringify(payload) }] } }],
      usageMetadata: { totalTokenCount: 123 },
      ...extra,
    }),
  };
}

function draft(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Whey Protein 1 kg',
    brand: 'FullEnergic',
    category: 'Proteína',
    flavors: ['Vainilla', 'Chocolate', 'vainilla'],
    size: '1 kg',
    servings: 30,
    isp_number: 'ISP 12345',
    ingredients: 'Proteína de suero de leche',
    barcode: '5901234123457',
    description_short: 'Whey de rápida absorción.',
    seo_title: 'Whey 1 kg',
    sku_suggested: 'pro-whey1kg',
    confidence: { name: 0.9, servings: 0.7, invented: 0.5 },
    sources: [{ type: 'label', title: 'Etiqueta frontal', field: 'name' }],
    ...overrides,
  };
}

describe('ProductDraftService', () => {
  const OLD_KEY = process.env.GEMINI_API_KEY;
  let service: ProductDraftService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    (global as any).fetch = jest.fn();
    usageMock.consume.mockResolvedValue({ used: 1, limit: 60, resetAt: '2026-11-21' });
    usageMock.addTokens.mockResolvedValue(undefined);
    productsMock.findDuplicates.mockResolvedValue({ exact: [], similar: [] });
    service = new ProductDraftService(usageMock as any, productsMock as any);
  });

  afterAll(() => {
    process.env.GEMINI_API_KEY = OLD_KEY;
    jest.restoreAllMocks();
  });

  it('normaliza el borrador y devuelve confianza, fuentes y cuota', async () => {
    (global as any).fetch.mockResolvedValue(geminiReply(draft()));

    const result = await service.generate('u1', { mode: 'text', text: 'Whey 1 kg' });

    expect(result.name).toBe('Whey Protein 1 kg');
    expect(result.flavors).toEqual(['Vainilla', 'Chocolate']);
    expect(result.sku_suggested).toBe('PRO-WHEY1KG');
    expect(result.barcode).toBe('5901234123457');
    expect(result.sources[0]).toMatchObject({ type: 'label', title: 'Etiqueta frontal' });
    expect(result.sources[0].retrievedAt).toBeTruthy();
    expect(result.confidence.name).toBe(0.9);
    expect(result.confidence.invented).toBeUndefined();
    expect(result.confidence.brand).toBe(0);
    expect(result.meta).toMatchObject({ webSearchUsed: false, quota: { used: 1, limit: 60 } });
    expect(result.meta.latencyMs).toBeGreaterThanOrEqual(0);
    expect(usageMock.addTokens).toHaveBeenCalledWith('u1', 123);
  });

  it('devuelve 503 sin GEMINI_API_KEY y no consume cuota', async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(service.generate('u1', { mode: 'text', text: 'hola' })).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(usageMock.consume).not.toHaveBeenCalled();
  });

  it('exige al menos una fuente de entrada', async () => {
    await expect(service.generate('u1', { mode: 'text' })).rejects.toThrow(HttpException);
    expect(usageMock.consume).not.toHaveBeenCalled();
  });

  it('descarta un barcode con dígito verificador inválido', async () => {
    (global as any).fetch.mockResolvedValue(geminiReply(draft({ barcode: '7801234567890' })));

    const result = await service.generate('u1', { mode: 'text', text: 'Whey 1 kg' });

    expect(result.barcode).toBeNull();
    expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('Código de barras inválido')]));
  });

  it('anula el ISP cuando no tiene respaldo', async () => {
    (global as any).fetch.mockResolvedValue(
      geminiReply(draft({ isp_number: 'ISP 99999', sources: [], ingredients: null })),
    );

    const result = await service.generate('u1', { mode: 'text', text: 'Whey 1 kg' });

    expect(result.isp_number).toBeNull();
    expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('ISP sin respaldo')]));
  });

  it('acepta ISP cuando los dígitos aparecen en el texto', async () => {
    (global as any).fetch.mockResolvedValue(geminiReply(draft({ sources: [] })));

    const result = await service.generate('u1', { mode: 'text', text: 'Registro ISP 12345' });

    expect(result.isp_number).toBe('ISP 12345');
  });

  it('propaga 429 cuando la cuota está agotada', async () => {
    usageMock.consume.mockRejectedValue(new HttpException('Cuota diaria agotada', 429));

    await expect(service.generate('u1', { mode: 'text', text: 'Whey' })).rejects.toMatchObject({
      status: 429,
    });
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  it('usa el siguiente modelo si el primero falla', async () => {
    (global as any).fetch
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'overloaded' })
      .mockResolvedValueOnce(geminiReply(draft()));

    const result = await service.generate('u1', { mode: 'text', text: 'Whey' });

    expect(result.meta.model).toBe('gemini-3.5-flash');
    expect((global as any).fetch).toHaveBeenCalledTimes(2);
  });

  it('devuelve 422 si todos los modelos responden JSON inválido', async () => {
    (global as any).fetch.mockResolvedValue(geminiReply('esto no es json'));

    await expect(service.generate('u1', { mode: 'text', text: 'Whey' })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('acepta JSON envuelto en bloques markdown', async () => {
    (global as any).fetch.mockResolvedValue(geminiReply('```json\n' + JSON.stringify(draft()) + '\n```'));

    const result = await service.generate('u1', { mode: 'text', text: 'Whey' });
    expect(result.name).toBe('Whey Protein 1 kg');
  });

  it('envía las imágenes como inlineData', async () => {
    (global as any).fetch.mockResolvedValue(geminiReply(draft()));

    await service.generate('u1', {
      mode: 'photo',
      images: [{ mimeType: 'image/jpeg', dataBase64: 'abc123' }],
    });

    const [, options] = (global as any).fetch.mock.calls[0];
    const parts = JSON.parse(options.body).contents[0].parts;
    expect(parts).toEqual(
      expect.arrayContaining([{ inlineData: { mimeType: 'image/jpeg', data: 'abc123' } }]),
    );
  });

  it('activa grounding y agrega fuentes web cuando webSearch está activo', async () => {
    (global as any).fetch.mockResolvedValue(
      geminiReply(
        draft({ sources: [] }),
        {
          candidates: [
            {
              content: { parts: [{ text: JSON.stringify(draft({ sources: [] })) }] },
              groundingMetadata: {
                groundingChunks: [{ web: { uri: 'https://example.cl/whey', title: 'Tienda oficial' } }],
              },
            },
          ],
        },
      ),
    );

    const result = await service.generate('u1', {
      mode: 'text',
      text: 'Whey',
      webSearch: true,
    });

    const [, options] = (global as any).fetch.mock.calls[0];
    expect(JSON.parse(options.body).tools).toEqual([{ google_search: {} }]);
    expect(result.meta.webSearchUsed).toBe(true);
    expect(result.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'web', url: 'https://example.cl/whey' }),
      ]),
    );
  });

  it('degrada sin búsqueda web si el modelo rechaza el grounding', async () => {
    (global as any).fetch
      .mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'tool not supported' })
      .mockResolvedValueOnce(geminiReply(draft()));

    const result = await service.generate('u1', {
      mode: 'text',
      text: 'Whey',
      webSearch: true,
    });

    expect(result.meta.webSearchUsed).toBe(false);
    const [, retryOptions] = (global as any).fetch.mock.calls[1];
    expect(JSON.parse(retryOptions.body).tools).toBeUndefined();
  });
});
