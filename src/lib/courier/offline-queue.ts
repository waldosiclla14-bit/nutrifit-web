/**
 * Cola ordenada de acciones del repartidor. Se ejecuta de una en una, en el
 * orden en que se generaron (IN_ROUTE antes que DELIVER), y cada acción lleva
 * su propia clave de idempotencia para que un reenvío no duplique efectos.
 */
import { apiFetch, clearCache } from '@/lib/api';
import {
  addAction,
  listActions,
  loadSnapshot,
  offlineAvailable,
  removeAction,
  saveSnapshot,
  updateAction,
  type QueuedAction,
} from './offline-db';

export type QueueState = {
  pending: number;
  conflicts: number;
  syncing: boolean;
  /** Cambia cuando una acción se envió bien: la PWA recarga su vista. */
  syncedCount: number;
  lastError: string | null;
};

type Listener = (state: QueueState) => void;

const listeners = new Set<Listener>();
let state: QueueState = { pending: 0, conflicts: 0, syncing: false, syncedCount: 0, lastError: null };
let flushing = false;

export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

function setState(patch: Partial<QueueState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener(state));
}

async function publishCounts() {
  if (!offlineAvailable()) return;
  const actions = await listActions().catch(() => []);
  setState({
    pending: actions.filter((a) => a.status === 'pending').length,
    conflicts: actions.filter((a) => a.status === 'conflict').length,
  });
}

export function newActionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Encola una mutación y devuelve la acción guardada (o null si no hay storage). */
export async function enqueueAction(
  action: Omit<QueuedAction, 'id' | 'body' | 'createdAt' | 'attempts' | 'status'>,
  extraBody: Record<string, any> = {},
): Promise<QueuedAction | null> {
  if (!offlineAvailable()) return null;
  const id = newActionId();
  const full: QueuedAction = {
    ...action,
    id,
    body: { ...extraBody, idempotencyKey: id },
    createdAt: Date.now(),
    attempts: 0,
    status: 'pending',
  };
  try {
    await addAction(full);
    await publishCounts();
    return full;
  } catch {
    return null;
  }
}

/** 401/403 son definitivos; 0/408/5xx son reintentables; el resto es conflicto. */
export function isRetryable(error: any): boolean {
  const status = Number(error?.status);
  return status === 0 || status === 408 || status >= 500;
}

function isAuthError(error: any): boolean {
  return Number(error?.status) === 401;
}

/**
 * Vacía la cola en orden. Si una acción reintentable falla, se detiene para no
 * aplicar una posterior que dependa de ella (por ejemplo DELIVER tras IN_ROUTE).
 */
export async function flushQueue(): Promise<void> {
  if (flushing || !offlineAvailable()) return;
  flushing = true;
  setState({ syncing: true, lastError: null });
  try {
    const actions = await listActions().catch(() => []);
    for (const action of actions) {
      if (action.status === 'conflict') continue;
      try {
        await apiFetch(action.path, { method: action.method, body: action.body });
        clearCache('/courier');
        await removeAction(action.id);
        setState({ syncedCount: state.syncedCount + 1 });
      } catch (error: any) {
        if (isAuthError(error)) {
          setState({ lastError: 'Sesión vencida. Inicia sesión para sincronizar.' });
          break;
        }
        const message = String(error?.message || 'No se pudo sincronizar');
        if (isRetryable(error)) {
          await updateAction({ ...action, attempts: action.attempts + 1, lastError: message });
          setState({ lastError: message });
          break;
        }
        // Conflicto de estado o de regla de negocio: no se reintenta solo.
        await updateAction({ ...action, status: 'conflict', lastError: message });
        setState({ lastError: `${action.label}: ${message}` });
      }
    }
  } finally {
    flushing = false;
    setState({ syncing: false });
    await publishCounts();
  }
}

export async function retryAction(id: string): Promise<void> {
  const actions = await listActions().catch(() => []);
  const action = actions.find((a) => a.id === id);
  if (!action) return;
  await updateAction({ ...action, status: 'pending', attempts: 0, lastError: undefined });
  await publishCounts();
  await flushQueue();
}

export async function discardAction(id: string): Promise<void> {
  await removeAction(id);
  await publishCounts();
}

/** Última respuesta con señal, usada sólo como apoyo visual sin cobertura. */
export function cacheRouteSnapshot(day: string, route: unknown): Promise<void> {
  return saveSnapshot(`route:${day}`, route).catch(() => undefined);
}

export function readRouteSnapshot<T>(day: string): Promise<T | null> {
  return loadSnapshot<T>(`route:${day}`).catch(() => null);
}

export function cacheRendicionSnapshot(day: string, rendicion: unknown): Promise<void> {
  return saveSnapshot(`rendicion:${day}`, rendicion).catch(() => undefined);
}

export function readRendicionSnapshot<T>(day: string): Promise<T | null> {
  return loadSnapshot<T>(`rendicion:${day}`).catch(() => null);
}

export function getQueueState(): QueueState {
  return state;
}
