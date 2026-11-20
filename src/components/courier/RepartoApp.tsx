'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CloudOff, CloudUpload, Loader2, MapPin, RotateCcw, Trash2, UserRound, Wallet, WifiOff, X } from 'lucide-react';
import {
  apiFetch,
  clearCache,
  fetchSession,
  getSessionUser,
  logoutServer,
  type SessionProfile,
} from '@/lib/api';
import { toast } from '@/lib/feedback';
import { addDaysISO, todayChileISO, dayLabel } from '@/lib/courier/helpers';
import {
  cacheRendicionSnapshot,
  cacheRouteSnapshot,
  discardAction,
  enqueueAction,
  flushQueue,
  readRendicionSnapshot,
  readRouteSnapshot,
  retryAction,
  subscribeQueue,
} from '@/lib/courier/offline-queue';
import type { QueueState } from '@/lib/courier/offline-queue';
import { listActions } from '@/lib/courier/offline-db';
import type { QueuedAction } from '@/lib/courier/offline-db';
import type {
  CourierConfig,
  CourierDeliverPayload,
  CourierDelivery,
  CourierRendicion,
  CourierRoute,
} from '@/lib/courier/types';
import type { CourierAction } from '@/lib/courier/helpers';
import RutaTab from './RutaTab';
import RendicionTab from './RendicionTab';
import PerfilTab from './PerfilTab';

type Tab = 'ruta' | 'rendicion' | 'perfil';
type Day = 'hoy' | 'manana';

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const LOGIN_URL = '/login?next=/reparto';

export default function RepartoApp() {
  const router = useRouter();
  const [session, setSession] = useState<SessionProfile | null>(null);
  const [config, setConfig] = useState<CourierConfig | null>(null);
  const [tab, setTab] = useState<Tab>('ruta');
  const [day, setDay] = useState<Day>('hoy');
  const [route, setRoute] = useState<CourierRoute | null>(null);
  const [rendicion, setRendicion] = useState<CourierRendicion | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingRendicion, setLoadingRendicion] = useState(false);
  const [offline, setOffline] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [queue, setQueue] = useState<QueueState>({ pending: 0, conflicts: 0, syncing: false, syncedCount: 0, lastError: null });
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);
  const [showQueue, setShowQueue] = useState(false);
  const [usingSnapshot, setUsingSnapshot] = useState<{ route: boolean; rendicion: boolean }>({ route: false, rendicion: false });

  const hoy = todayChileISO();
  const manana = addDaysISO(hoy, 1);

  const goLogin = useCallback(() => {
    clearCache();
    router.replace(LOGIN_URL);
  }, [router]);

  // Sesión + configuración. El rol se valida también en el backend (403);
  // aquí solo evitamos mostrar una pantalla que no le sirve a un vendedor.
  useEffect(() => {
    let alive = true;
    (async () => {
      const profile = (await fetchSession()) || getSessionUser();
      if (!alive) return;
      if (!profile) {
        router.replace(LOGIN_URL);
        return;
      }
      if (profile.role && !['DELIVERY', 'ADMIN'].includes(profile.role)) {
        router.replace('/admin');
        return;
      }
      setSession(profile);
      try {
        const cfg = await apiFetch<CourierConfig>('/courier/config');
        if (alive) setConfig(cfg);
      } catch {
        // Sin config se usan los valores de respaldo del servidor.
      }
    })();
    return () => { alive = false; };
  }, [router]);

  // Con señal se vacía la cola; sin señal las acciones quedan guardadas.
  useEffect(() => {
    const update = async () => {
      const connected = typeof navigator === 'undefined' || navigator.onLine;
      setOffline(!connected);
      if (connected) await flushQueue();
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => subscribeQueue(setQueue), []);

  useEffect(() => {
    if (!showQueue) return;
    listActions().then(setQueuedActions).catch(() => setQueuedActions([]));
  }, [showQueue, queue.pending, queue.conflicts]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const loadRoute = useCallback(async () => {
    setLoadingRoute(true);
    try {
      const data = await apiFetch<CourierRoute>(`/courier/route?day=${day}`);
      setRoute(data);
      setUsingSnapshot((prev) => ({ ...prev, route: false }));
      cacheRouteSnapshot(day, data);
    } catch (err: any) {
      if (err?.status === 401) { goLogin(); return; }
      if (err?.status === 403) { toast.error('No tienes acceso a la ruta de reparto.'); return; }
      const cached = await readRouteSnapshot<CourierRoute>(day);
      if (cached) {
        setRoute(cached);
        setUsingSnapshot((prev) => ({ ...prev, route: true }));
      } else {
        toast.error(err?.message || 'No se pudo cargar la ruta.');
      }
    } finally {
      setLoadingRoute(false);
    }
  }, [day, goLogin]);

  const loadRendicion = useCallback(async () => {
    setLoadingRendicion(true);
    try {
      const data = await apiFetch<CourierRendicion>(`/courier/rendicion?day=${day}`);
      setRendicion(data);
      setUsingSnapshot((prev) => ({ ...prev, rendicion: false }));
      cacheRendicionSnapshot(day, data);
    } catch (err: any) {
      if (err?.status === 401) { goLogin(); return; }
      const cached = await readRendicionSnapshot<CourierRendicion>(day);
      if (cached) {
        setRendicion(cached);
        setUsingSnapshot((prev) => ({ ...prev, rendicion: true }));
      } else {
        toast.error(err?.message || 'No se pudo cargar la rendición.');
      }
    } finally {
      setLoadingRendicion(false);
    }
  }, [day, goLogin]);

  // Cada envío correcto refresca la vista para mostrar el estado confirmado.
  useEffect(() => {
    if (!session || queue.syncedCount === 0) return;
    loadRoute();
    if (tab === 'rendicion') loadRendicion();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reaccionamos sólo a syncedCount
  }, [session, queue.syncedCount, loadRoute, loadRendicion, tab]);

  useEffect(() => {
    if (!session) return;
    loadRoute();
  }, [session, loadRoute]);

  useEffect(() => {
    if (!session || tab !== 'rendicion') return;
    loadRendicion();
  }, [session, tab, loadRendicion]);

  // Si "mañana" se deshabilita en configuración, no dejar la pestaña elegida.
  useEffect(() => {
    if (config && !config.mananaHabilitado && day === 'manana') setDay('hoy');
  }, [config, day]);

  // Cierre por inactividad: el valor viene de Configuración (backend).
  useEffect(() => {
    if (!session) return;
    const minutes = Number(config?.inactividadMinutos) > 0 ? Number(config?.inactividadMinutos) : 15;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await logoutServer();
        goLogin();
      }, minutes * 60_000);
    };
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [session, config, goLogin]);

  type PendingMutation = Omit<QueuedAction, 'id' | 'body' | 'createdAt' | 'attempts' | 'status'>;

  const isNetworkError = (err: any) => {
    const status = Number(err?.status);
    return status === 0 || status === 408 || status >= 500;
  };

  const saveForLater = async (mutation: PendingMutation, body: Record<string, any>) => {
    const saved = await enqueueAction(mutation, body);
    if (!saved) throw new Error('No se pudo guardar la acción en el dispositivo.');
    toast.success('Guardado sin señal. Se enviará al volver la conexión.');
  };

  const optimisticStatus = (delivery: CourierDelivery, status: string) => {
    setRoute((prev) =>
      prev
        ? {
            ...prev,
            entregas: prev.entregas.map((e) =>
              e.id === delivery.id
                ? { ...e, estado: status, cobro: status === 'DELIVERED' ? { ...e.cobro, estado: 'PAGADO' as const } : e.cobro }
                : e,
            ),
          }
        : prev,
    );
  };

  const updateStatus = async (delivery: CourierDelivery, action: CourierAction, reason?: string) => {
    const path = `/courier/route/${delivery.id}/status`;
    const body = { status: action.to, reason };
    if (offline) {
      await saveForLater({ kind: 'STATUS', path, method: 'PATCH', label: action.label, deliveryId: delivery.id }, body);
      optimisticStatus(delivery, action.to);
      return;
    }
    try {
      await apiFetch(path, { method: 'PATCH', body });
      toast.success(`${action.label}: ${delivery.cliente.nombre || delivery.pedido.numero}`);
      await loadRoute();
      if (tab === 'rendicion') await loadRendicion();
    } catch (err: any) {
      if (err?.status === 401) { goLogin(); return; }
      if (offline || isNetworkError(err)) {
        await saveForLater({ kind: 'STATUS', path, method: 'PATCH', label: action.label, deliveryId: delivery.id }, body);
        optimisticStatus(delivery, action.to);
        return;
      }
      toast.error(err?.message || 'No se pudo cambiar el estado.');
      throw err;
    }
  };

  const deliver = async (delivery: CourierDelivery, payload: CourierDeliverPayload) => {
    const path = `/courier/route/${delivery.id}/deliver`;
    const mutation: PendingMutation = { kind: 'DELIVER', path, method: 'POST', label: 'Cerrar entrega', deliveryId: delivery.id };
    if (offline) {
      await saveForLater(mutation, payload);
      optimisticStatus(delivery, 'DELIVERED');
      return;
    }
    try {
      await apiFetch(path, { method: 'POST', body: payload });
      toast.success(`Entrega cerrada: ${delivery.cliente.nombre || delivery.pedido.numero}`);
      await loadRoute();
    } catch (err: any) {
      if (err?.status === 401) { goLogin(); return; }
      if (offline || isNetworkError(err)) {
        await saveForLater(mutation, payload);
        optimisticStatus(delivery, 'DELIVERED');
        return;
      }
      toast.error(err?.message || 'No se pudo cerrar la entrega.');
      throw err;
    }
  };

  const closeRendicion = async (declared: { efectivo: number; transferencia: number; otros: number }, notes: string) => {
    const path = '/courier/rendicion/cerrar';
    const body = { declared, notes, day: hoy };
    const mutation: PendingMutation = { kind: 'CLOSE_SHIFT', path, method: 'POST', label: 'Enviar rendición', day: hoy };
    if (offline) {
      await saveForLater(mutation, body);
      return;
    }
    try {
      await apiFetch(path, { method: 'POST', body });
      toast.success('Rendición enviada al admin.');
      await loadRendicion();
    } catch (err: any) {
      if (err?.status === 401) { goLogin(); return; }
      if (offline || isNetworkError(err)) {
        await saveForLater(mutation, body);
        return;
      }
      toast.error(err?.message || 'No se pudo cerrar la rendición.');
      throw err;
    }
  };

  const requestReschedule = async (delivery: CourierDelivery, reason: string) => {
    const path = `/courier/route/${delivery.id}/reschedule`;
    const body = { reason };
    const mutation: PendingMutation = { kind: 'RESCHEDULE', path, method: 'POST', label: 'Aviso de reprogramación', deliveryId: delivery.id };
    if (offline) {
      await saveForLater(mutation, body);
      return;
    }
    try {
      await apiFetch(path, { method: 'POST', body });
      toast.success('Aviso enviado al admin.');
      await loadRoute();
    } catch (err: any) {
      if (err?.status === 401) { goLogin(); return; }
      if (offline || isNetworkError(err)) {
        await saveForLater(mutation, body);
        return;
      }
      toast.error(err?.message || 'No se pudo enviar el aviso.');
      throw err;
    }
  };

  const logout = async () => {
    await logoutServer();
    goLogin();
  };

  const install = async () => {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } catch {
      // el navegador decidió no mostrar el diálogo
    }
    setInstallEvent(null);
  };

  if (!session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--surface-page)]">
        <Loader2 className="animate-spin text-[var(--text-secondary)]" size={26} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--surface-page)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-20 border-b border-line bg-[var(--surface-page)]/95 px-4 pb-3 pt-safe backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 pt-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">NutriFit</p>
            <h1 className="text-xl font-bold leading-tight">Reparto</h1>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {dayLabel(day === 'hoy' ? hoy : manana, hoy, manana)} · {day === 'hoy' ? hoy : manana}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {offline && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">
                <WifiOff size={11} /> Sin conexión
              </span>
            )}
            {(queue.pending > 0 || queue.conflicts > 0) && (
              <button
                onClick={() => setShowQueue(true)}
                className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
                  queue.conflicts > 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}
                aria-label="Ver acciones pendientes de sincronizar"
              >
                {queue.syncing ? <Loader2 size={11} className="animate-spin" /> : <CloudUpload size={11} />}
                {queue.pending + queue.conflicts}
              </button>
            )}
            <span className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)]">
              {session.role === 'ADMIN' ? 'ADMIN' : 'REPARTO'}
            </span>
          </div>
        </div>
      </header>

      {offline && (
        <p className="mx-auto max-w-md px-4 pt-3 text-[11px] text-amber-700">
          Sin conexión: tus acciones se guardan en el equipo y se envían solas al volver la señal.
        </p>
      )}
      {!offline && queue.lastError && (
        <p className="mx-auto max-w-md px-4 pt-3 text-[11px] text-amber-700">
          {queue.lastError}
        </p>
      )}
      {(usingSnapshot.route || usingSnapshot.rendicion) && (
        <p className="mx-auto flex max-w-md items-center gap-1 px-4 pt-2 text-[11px] text-blue-700">
          <CloudOff size={12} /> Mostrando datos guardados: sin conexión con el servidor.
        </p>
      )}

      <main className="mx-auto max-w-md py-4">
        {tab === 'ruta' && (
          <RutaTab
            route={route}
            loading={loadingRoute}
            day={day}
            onDayChange={setDay}
            mananaHabilitado={config?.mananaHabilitado !== false}
            onRefresh={loadRoute}
            onStatus={updateStatus}
            onDeliver={deliver}
            onReschedule={requestReschedule}
          />
        )}
        {tab === 'rendicion' && (
          <RendicionTab
            rendicion={rendicion}
            loading={loadingRendicion}
            day={day}
            onDayChange={setDay}
            mananaHabilitado={config?.mananaHabilitado !== false}
            onRefresh={loadRendicion}
            onCerrar={closeRendicion}
          />
        )}
        {tab === 'perfil' && (
          <PerfilTab
            session={session}
            config={config}
            installAvailable={!!installEvent}
            onInstall={install}
            onLogout={logout}
          />
        )}
      </main>

      {showQueue && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/50" onClick={() => setShowQueue(false)} role="presentation">
          <div
            className="max-h-[70dvh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface-page)] p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Acciones pendientes"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Pendientes de enviar</h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Se envían en orden. Los conflictos necesitan tu revisión.
                </p>
              </div>
              <button onClick={() => setShowQueue(false)} className="rounded-full bg-white p-2 text-[var(--text-secondary)]" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            {queuedActions.length === 0 && (
              <p className="mt-6 rounded-2xl border border-line bg-white p-6 text-center text-sm text-[var(--text-secondary)]">
                Todo al día. No hay acciones pendientes.
              </p>
            )}

            <div className="mt-4 space-y-2">
              {queuedActions.map((a) => (
                <div key={a.id} className="rounded-2xl border border-line bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">{a.label}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        {new Date(a.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        {a.attempts > 0 ? ` · ${a.attempts} reintento(s)` : ''}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      a.status === 'conflict' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {a.status === 'conflict' ? 'Conflicto' : 'En cola'}
                    </span>
                  </div>
                  {a.lastError && <p className="mt-2 text-xs text-red-700">{a.lastError}</p>}
                  <div className="mt-2 flex gap-2">
                    {a.status === 'conflict' && (
                      <button
                        onClick={() => retryAction(a.id)}
                        className="flex items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
                      >
                        <RotateCcw size={12} /> Reintentar
                      </button>
                    )}
                    <button
                      onClick={() => discardAction(a.id)}
                      className="flex items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-xs font-semibold text-red-600"
                    >
                      <Trash2 size={12} /> Descartar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-safe backdrop-blur">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1">
          {([
            ['ruta', 'Ruta', MapPin],
            ['rendicion', 'Rendición', Wallet],
            ['perfil', 'Perfil', UserRound],
          ] as const).map(([key, label, Icon]) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[11px] font-semibold ${
                  active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </button>
            );
          })}
        </div>
      </nav>
      <div className="h-16" />
    </div>
  );
}
