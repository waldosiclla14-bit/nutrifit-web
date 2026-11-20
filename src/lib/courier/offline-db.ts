/**
 * Almacenamiento local de la PWA de reparto. IndexedDB nativo, sin dependencias.
 * Guarda acciones pendientes (con su clave de idempotencia) y la última ruta
 * leída con señal, para que la pantalla no quede vacía sin cobertura.
 */

export type QueuedAction = {
  /** Idempotency key estable: el backend replaya la misma respuesta. */
  id: string;
  kind: 'STATUS' | 'DELIVER' | 'RESCHEDULE' | 'CLOSE_SHIFT';
  path: string;
  method: 'PATCH' | 'POST';
  body: Record<string, any>;
  label: string;
  deliveryId?: string;
  day?: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
  status: 'pending' | 'conflict';
};

const DB_NAME = 'nutrifit-courier';
const DB_VERSION = 1;
const ACTIONS = 'actions';
const SNAPSHOTS = 'snapshots';

export function offlineAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function asPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!offlineAvailable()) return Promise.reject(new Error('IndexedDB no disponible'));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(ACTIONS)) {
          const store = db.createObjectStore(ACTIONS, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains(SNAPSHOTS)) {
          db.createObjectStore(SNAPSHOTS);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const request = run(transaction.objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.onerror = () => reject(transaction.error);
      }),
  );
}

export async function listActions(): Promise<QueuedAction[]> {
  const rows = await tx<QueuedAction[]>(ACTIONS, 'readonly', (s) => s.getAll() as IDBRequest<QueuedAction[]>);
  return rows.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

/** Una sola acción por intención: reintentar offline no llena la cola de copias. */
export function dedupeKey(action: Pick<QueuedAction, 'kind' | 'path' | 'body' | 'deliveryId' | 'day'>): string {
  return [
    action.kind,
    action.path,
    action.body?.status || '',
    action.deliveryId || '',
    action.day || '',
  ].join('|');
}

export async function addAction(action: QueuedAction): Promise<void> {
  const existing = await listActions();
  const key = dedupeKey(action);
  if (existing.some((a) => dedupeKey(a) === key)) return;
  await tx(ACTIONS, 'readwrite', (s) => s.put(action));
}

export async function updateAction(action: QueuedAction): Promise<void> {
  await tx(ACTIONS, 'readwrite', (s) => s.put(action));
}

export async function removeAction(id: string): Promise<void> {
  await tx(ACTIONS, 'readwrite', (s) => s.delete(id));
}

export async function saveSnapshot<T>(key: string, data: T): Promise<void> {
  await tx(SNAPSHOTS, 'readwrite', (s) => s.put(data, key));
}

export async function loadSnapshot<T>(key: string): Promise<T | null> {
  const value = await tx<T | undefined>(SNAPSHOTS, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>);
  return value ?? null;
}
