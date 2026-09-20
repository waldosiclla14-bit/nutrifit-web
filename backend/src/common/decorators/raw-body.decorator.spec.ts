import { EventEmitter } from 'events';
import { readJsonBody } from './raw-body.decorator';

function mockReq(body: string): any {
  const req = new EventEmitter() as any;
  process.nextTick(() => {
    if (body) req.emit('data', Buffer.from(body, 'utf8'));
    req.emit('end');
  });
  return req;
}

describe('readJsonBody', () => {
  it('parses a JSON body', async () => {
    const body = await readJsonBody(mockReq('{"name":"Test","n":1}'));
    expect(body).toEqual({ name: 'Test', n: 1 });
  });

  it('returns {} for an empty body', async () => {
    await expect(readJsonBody(mockReq(''))).resolves.toEqual({});
  });

  it('rejects malformed JSON (does not throw sync TypeError)', async () => {
    await expect(readJsonBody(mockReq('{nope'))).rejects.toThrow('JSON malformado');
  });

  it('does not throw "Assignment to constant variable"', async () => {
    // Regression: reassigning the internal const finish/fail used to throw
    // TypeError on EVERY call, breaking all POST/PATCH endpoints in prod.
    const body = await readJsonBody(mockReq('{"a":1}'));
    expect(body).toEqual({ a: 1 });
  });
});
