import { ServiceUnavailableException } from '@nestjs/common';
import { AiService } from './ai.service';

const prismaMock = {
  productVariant: { findMany: jest.fn() },
  order: { aggregate: jest.fn(), count: jest.fn() },
  orderItem: { groupBy: jest.fn() },
};

function geminiReply(text: string) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
  };
}

describe('AiService', () => {
  const OLD_KEY = process.env.GEMINI_API_KEY;
  let service: AiService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    (global as any).fetch = jest.fn();
    service = new AiService(prismaMock as any);
    prismaMock.productVariant.findMany.mockResolvedValue([]);
    prismaMock.order.aggregate.mockResolvedValue({ _sum: { total: 100000 }, _count: 5 });
    prismaMock.order.count.mockResolvedValue(2);
    prismaMock.orderItem.groupBy.mockResolvedValue([]);
  });

  afterAll(() => {
    process.env.GEMINI_API_KEY = OLD_KEY;
    jest.restoreAllMocks();
  });

  it('returns the model reply with real snapshot context', async () => {
    (global as any).fetch.mockResolvedValue(geminiReply('Hay 2 pendientes.'));
    const res = await service.chat('¿pendientes?', []);
    expect(res.reply).toContain('pendientes');
    const [, opts] = (global as any).fetch.mock.calls[0];
    const sent = JSON.parse(opts.body);
    expect(sent.contents[0].parts[0].text).toContain('Ordenes pendientes (PENDING): 2.');
  });

  it('throws 503 when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(service.chat('hola', [])).rejects.toThrow(ServiceUnavailableException);
  });

  it('throws 503 when Gemini returns an error', async () => {
    (global as any).fetch.mockResolvedValue({ ok: false, text: async () => 'boom' });
    await expect(service.chat('hola', [])).rejects.toThrow(ServiceUnavailableException);
  });

  it('falls back to the next model on 503/404', async () => {
    (global as any).fetch
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'overloaded' })
      .mockResolvedValueOnce(geminiReply('respuesta 3.5'));
    const res = await service.chat('hola?', []);
    expect(res.reply).toContain('respuesta 3.5');
    expect((global as any).fetch).toHaveBeenCalledTimes(2);
    expect((global as any).fetch.mock.calls[1][0]).toContain('gemini-3.5-flash');
  });

  it('caps history sent to the model', async () => {
    (global as any).fetch.mockResolvedValue(geminiReply('ok'));
    const history = Array.from({ length: 20 }, (_, i) => ({ role: 'user' as const, text: `m${i}` }));
    await service.chat('final?', history);
    const [, opts] = (global as any).fetch.mock.calls[0];
    const sent: string = JSON.parse(opts.body).contents[0].parts[0].text;
    expect(sent).toContain('m19');
    expect(sent).not.toContain('m0');
  });
});
