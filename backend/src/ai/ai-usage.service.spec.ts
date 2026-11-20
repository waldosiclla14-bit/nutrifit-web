import { HttpException } from '@nestjs/common';
import { AiUsageService } from './ai-usage.service';

const prismaMock = {
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

describe('AiUsageService', () => {
  const OLD_LIMIT = process.env.AI_DRAFT_DAILY_LIMIT;
  let service: AiUsageService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_DRAFT_DAILY_LIMIT = '60';
    prismaMock.$executeRaw.mockResolvedValue(1);
    service = new AiUsageService(prismaMock as any);
  });

  afterAll(() => {
    process.env.AI_DRAFT_DAILY_LIMIT = OLD_LIMIT;
  });

  it('devuelve el uso y el límite configurado', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ calls: 3 }]);

    const result = await service.consume('u1');

    expect(result.used).toBe(3);
    expect(result.limit).toBe(60);
    expect(result.resetAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('lanza 429 cuando la cuota está agotada', async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    await expect(service.consume('u1')).rejects.toMatchObject({ status: 429 });
    await expect(service.consume('u1')).rejects.toBeInstanceOf(HttpException);
  });

  it('usa el límite por defecto si la variable es inválida', () => {
    process.env.AI_DRAFT_DAILY_LIMIT = 'abc';
    expect(service.limit).toBe(60);
  });

  it('peek devuelve 0 llamadas cuando no hay fila del día', async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    const result = await service.peek('u1');

    expect(result).toMatchObject({ used: 0, limit: 60 });
    expect(prismaMock.$executeRaw).not.toHaveBeenCalled();
  });

  it('reembolsa la llamada cuando la IA falla', async () => {
    await service.refund('u1');

    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('registra tokens solo si son positivos', async () => {
    await service.addTokens('u1', 0);
    expect(prismaMock.$executeRaw).not.toHaveBeenCalled();

    await service.addTokens('u1', 42.4);
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
  });
});
