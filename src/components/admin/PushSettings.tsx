'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Send } from 'lucide-react';
import { toast } from '@/lib/feedback';
import {
  pushSupported,
  pushPermission,
  subscribePush,
  unsubscribePush,
  sendTestPush,
} from '@/lib/push';

type Status = 'unsupported' | 'denied' | 'off' | 'on' | 'checking' | 'working';

export function PushSettings({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>('checking');

  const refresh = useCallback(async () => {
    if (!pushSupported()) {
      setStatus('unsupported');
      return;
    }
    if (pushPermission() === 'denied') {
      setStatus('denied');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? 'on' : 'off');
    } catch {
      setStatus('off');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = async () => {
    setStatus('working');
    const r = await subscribePush(token);
    if (r === 'ok') {
      toast.success('Notificaciones activadas en este dispositivo.');
      setStatus('on');
    } else if (r === 'denied') {
      toast.error('Permiso denegado: actívalo en el navegador e intenta de nuevo.');
      setStatus('denied');
    } else {
      toast.error('No se pudo activar. Revisa la conexión e intenta de nuevo.');
      await refresh();
    }
  };

  const disable = async () => {
    setStatus('working');
    await unsubscribePush(token);
    toast.success('Notificaciones desactivadas en este dispositivo.');
    await refresh();
  };

  const test = async () => {
    const ok = await sendTestPush(token);
    if (ok) toast.success('Prueba enviada: debería llegarte en segundos.');
    else toast.error('No hay suscripción activa o el servidor no tiene claves VAPID.');
  };

  return (
    <div className="rounded-3xl border border-line bg-paper p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <Bell size={16} className="text-sport-green" />
        <h3 className="font-display text-base uppercase tracking-wide text-ink">Notificaciones push</h3>
      </div>
      {status === 'unsupported' && (
        <p className="text-xs text-muted">
          Este navegador no soporta notificaciones push. En iPhone se requiere instalar la app a la pantalla de inicio (iOS 16.4+).
        </p>
      )}
      {status === 'denied' && (
        <p className="text-xs text-muted">
          Permiso bloqueado en el navegador. Actívalo en los ajustes del sitio e intenta de nuevo.
        </p>
      )}
      {(status === 'checking' || status === 'working') && (
        <p className="text-xs text-muted">Verificando…</p>
      )}
      {(status === 'off' || status === 'on') && (
        <div className="flex flex-wrap gap-2">
          {status === 'off' ? (
            <button type="button" onClick={enable} className="ds-btn-accent px-4 py-2 text-xs">
              <Bell size={14} /> Activar en este dispositivo
            </button>
          ) : (
            <>
              <button type="button" onClick={test} className="ds-btn-secondary px-4 py-2 text-xs">
                <Send size={14} /> Enviar prueba
              </button>
              <button type="button" onClick={disable} className="ds-btn-secondary px-4 py-2 text-xs">
                <BellOff size={14} /> Desactivar
              </button>
            </>
          )}
        </div>
      )}
      <p className="text-[11px] text-muted">
        Se activa por dispositivo. En iPhone funciona solo con la app instalada en inicio.
      </p>
    </div>
  );
}
