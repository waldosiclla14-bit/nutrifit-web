import { apiFetch, ApiError, API_TIMEOUT_MS } from '@/lib/api';

/**
 * El backend duerme a los 15 min de inactividad y tarda ~44 s en despertar
 * (docs/auditoria-consumo-render-2026-11-02.md §7.3).
 * Estos tests fijan que la espera sea la correcta en cada método, porque de eso
 * depende que el checkout no falle en el primer pedido del día.
 */

function fetchQueNuncaResponde() {
  return jest.fn((_url: string, init: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });
  });
}

describe('apiFetch · timeouts de arranque en frío', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('declara 90 s para mutaciones y 45 s para lecturas', () => {
    expect(API_TIMEOUT_MS.mutation).toBe(90_000);
    expect(API_TIMEOUT_MS.read).toBe(45_000);
    // Debe superar con margen el arranque en frío medido (44 s).
    expect(API_TIMEOUT_MS.mutation).toBeGreaterThan(44_000);
  });

  it('un POST sigue esperando a los 45 s y aborta a los 90 s', async () => {
    global.fetch = fetchQueNuncaResponde() as any;

    let asentada = false;
    const peticion = apiFetch('/orders/public', { method: 'POST', body: { a: 1 } });
    peticion.then(
      () => { asentada = true; },
      () => { asentada = true; },
    );

    // A los 45 s todavía no debe haber abortado: es lo que rompía el checkout.
    await jest.advanceTimersByTimeAsync(45_000);
    expect(asentada).toBe(false);

    // A los 90 s sí aborta, y con el error de timeout correcto.
    await jest.advanceTimersByTimeAsync(45_000);
    await expect(peticion).rejects.toBeInstanceOf(ApiError);
    await expect(peticion).rejects.toMatchObject({ status: 408 });
  });

  it('un GET aborta a los 45 s y reintenta, para no gastar los 90 s', async () => {
    const fetchMock = fetchQueNuncaResponde();
    global.fetch = fetchMock as any;

    const peticion = apiFetch('/products').catch(() => undefined);

    await jest.advanceTimersByTimeAsync(45_000);
    // Primer intento abortado; el reintento arranca tras 1,2 s de espera.
    await jest.advanceTimersByTimeAsync(1_200);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(45_000);
    await peticion;
  });
});
