import { apiFetch, clearCache } from '@/lib/api';
import {
  addAction,
  listActions,
  offlineAvailable,
  removeAction,
  saveSnapshot,
  updateAction,
} from './offline-db';
import {
  cacheRouteSnapshot,
  discardAction,
  enqueueAction,
  flushQueue,
  isRetryable,
  newActionId,
  retryAction,
  subscribeQueue,
} from './offline-queue';
import type { QueuedAction } from './offline-db';

jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
  clearCache: jest.fn(),
}));

jest.mock('./offline-db', () => ({
  offlineAvailable: jest.fn(() => true),
  listActions: jest.fn(async () => []),
  addAction: jest.fn(async () => undefined),
  updateAction: jest.fn(async () => undefined),
  removeAction: jest.fn(async () => undefined),
  saveSnapshot: jest.fn(async () => undefined),
  loadSnapshot: jest.fn(async () => null),
}));

const apiMock = apiFetch as jest.Mock;
const listMock = listActions as jest.Mock;
const updateMock = updateAction as jest.Mock;

function action(overrides: Partial<QueuedAction> = {}): QueuedAction {
  return {
    id: 'a1',
    kind: 'STATUS',
    path: '/courier/route/d1/status',
    method: 'PATCH',
    body: { status: 'IN_ROUTE', idempotencyKey: 'a1' },
    label: 'Iniciar ruta',
    deliveryId: 'd1',
    createdAt: 1000,
    attempts: 0,
    status: 'pending',
    ...overrides,
  };
}

describe('cola offline del repartidor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (offlineAvailable as jest.Mock).mockReturnValue(true);
    listMock.mockResolvedValue([]);
    apiMock.mockResolvedValue({ ok: true });
  });

  it('genera claves únicas estables por acción', () => {
    const a = newActionId();
    const b = newActionId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9._:-]+$/);
  });

  it('encola con idempotency key y expone contadores', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeQueue(listener);
    listMock.mockResolvedValue([action(), action({ id: 'a2', status: 'conflict' })]);

    const queued = await enqueueAction(
      { kind: 'DELIVER', path: '/courier/route/d1/deliver', method: 'POST', label: 'Entregar', deliveryId: 'd1' },
      { amount: 25000 },
    );

    expect(queued?.body.idempotencyKey).toBe(queued?.id);
    expect(addAction).toHaveBeenCalledWith(expect.objectContaining({ kind: 'DELIVER', deliveryId: 'd1' }));
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ pending: 1, conflicts: 1 }));
    unsubscribe();
  });

  it('envía en orden y limpia la cola tras el éxito', async () => {
    listMock.mockResolvedValue([
      action({ id: 'a1', createdAt: 1000 }),
      action({ id: 'a2', createdAt: 2000, body: { status: 'ARRIVED', idempotencyKey: 'a2' } }),
    ]);

    await flushQueue();

    expect(apiMock.mock.calls.map(([path]: any[]) => path)).toEqual([
      '/courier/route/d1/status',
      '/courier/route/d1/status',
    ]);
    expect(apiMock.mock.calls[0][1].body.status).toBe('IN_ROUTE');
    expect(apiMock.mock.calls[1][1].body.status).toBe('ARRIVED');
    expect(removeAction).toHaveBeenCalledWith('a1');
    expect(removeAction).toHaveBeenCalledWith('a2');
    expect(clearCache).toHaveBeenCalledWith('/courier');
  });

  it('un fallo reintentable detiene la cola para conservar el orden', async () => {
    listMock.mockResolvedValue([
      action({ id: 'a1', createdAt: 1000 }),
      action({ id: 'a2', createdAt: 2000 }),
    ]);
    apiMock.mockRejectedValueOnce(Object.assign(new Error('sin señal'), { status: 0 }));

    await flushQueue();

    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1', attempts: 1 }));
    expect(removeAction).not.toHaveBeenCalled();
  });

  it('un conflicto se marca y no se reintenta, pero sigue la siguiente acción', async () => {
    listMock.mockResolvedValue([
      action({ id: 'a1', createdAt: 1000 }),
      action({ id: 'a2', createdAt: 2000 }),
    ]);
    apiMock
      .mockRejectedValueOnce(Object.assign(new Error('Transición inválida'), { status: 400 }))
      .mockResolvedValueOnce({ ok: true });

    await flushQueue();

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1', status: 'conflict' }));
    expect(removeAction).toHaveBeenCalledWith('a2');
    expect(apiMock).toHaveBeenCalledTimes(2);
  });

  it('401 detiene la sincronización sin marcar conflictos', async () => {
    listMock.mockResolvedValue([action()]);
    apiMock.mockRejectedValueOnce(Object.assign(new Error('No autorizado'), { status: 401 }));

    await flushQueue();

    expect(updateMock).not.toHaveBeenCalled();
    expect(removeAction).not.toHaveBeenCalled();
  });

  it('permite reintentar o descartar acciones en conflicto', async () => {
    listMock.mockResolvedValue([action({ status: 'conflict' })]);

    await retryAction('a1');
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1', status: 'pending' }));

    await discardAction('a1');
    expect(removeAction).toHaveBeenCalledWith('a1');
  });

  it('clasifica errores de red como reintentables', () => {
    expect(isRetryable({ status: 0 })).toBe(true);
    expect(isRetryable({ status: 503 })).toBe(true);
    expect(isRetryable({ status: 400 })).toBe(false);
    expect(isRetryable({ status: 404 })).toBe(false);
  });

  it('guarda la última ruta con señal como instantánea', async () => {
    const route = { entregas: [] };
    await cacheRouteSnapshot('2026-11-20', route);
    expect(saveSnapshot).toHaveBeenCalledWith('route:2026-11-20', route);
  });
});
