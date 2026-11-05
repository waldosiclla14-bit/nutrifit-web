import { EventEmitter } from 'events';
import { requestLogger } from './request-logger.middleware';

function fakeReq(overrides: any = {}) {
  return {
    method: 'GET',
    path: '/api/products',
    ip: '203.0.113.9',
    headers: { 'user-agent': 'UptimeRobot/2.0' },
    socket: { remoteAddress: '203.0.113.9' },
    ...overrides,
  } as any;
}

function fakeRes(statusCode = 200) {
  const res: any = new EventEmitter();
  res.statusCode = statusCode;
  return res;
}

describe('requestLogger', () => {
  it('no escribe hasta que termina la respuesta y llama a next()', () => {
    const lines: string[] = [];
    const res = fakeRes();
    const next = jest.fn();

    requestLogger((line) => lines.push(line))(fakeReq(), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(lines).toHaveLength(0);

    res.emit('finish');
    expect(lines).toHaveLength(1);
  });

  it('registra metodo, ruta, estado, ip y user-agent', () => {
    const lines: string[] = [];
    const res = fakeRes(404);

    requestLogger((line) => lines.push(line))(fakeReq({ method: 'POST' }), res, jest.fn());
    res.emit('finish');

    expect(lines[0]).toContain('POST /api/products 404');
    expect(lines[0]).toContain('ip=203.0.113.9');
    expect(lines[0]).toContain('ua="UptimeRobot/2.0"');
  });

  it('no incluye el query string aunque venga en originalUrl', () => {
    const lines: string[] = [];
    const req = fakeReq({ originalUrl: '/api/products?token=secreto' });
    const res = fakeRes();

    requestLogger((line) => lines.push(line))(req, res, jest.fn());
    res.emit('finish');

    expect(lines[0]).toContain('/api/products');
    expect(lines[0]).not.toContain('token');
    expect(lines[0]).not.toContain('secreto');
  });

  it('recorta el user-agent y elimina saltos de linea (inyeccion de logs)', () => {
    const lines: string[] = [];
    const ua = 'A'.repeat(300) + '\ninyectado';
    const req = fakeReq({ headers: { 'user-agent': ua } });
    const res = fakeRes();

    requestLogger((line) => lines.push(line))(req, res, jest.fn());
    res.emit('finish');

    expect(lines[0]).not.toContain('inyectado');
    expect(lines[0]).not.toContain('\n');
    expect(lines[0]).toContain('A'.repeat(180));
    expect(lines[0]).not.toContain('A'.repeat(181));
  });

  it('usa - cuando faltan ip y user-agent', () => {
    const lines: string[] = [];
    const req = fakeReq({ ip: '', socket: undefined, headers: {} });
    const res = fakeRes();

    requestLogger((line) => lines.push(line))(req, res, jest.fn());
    res.emit('finish');

    expect(lines[0]).toContain('ip=-');
    expect(lines[0]).toContain('ua="-"');
  });
});
