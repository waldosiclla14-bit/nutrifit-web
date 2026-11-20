'use client';

import { useEffect, useState } from 'react';
import { BellRing, Download, LogOut, ShieldCheck, Timer, UserRound } from 'lucide-react';
import type { SessionProfile } from '@/lib/api';
import { pushPermission, pushSupported, subscribePush } from '@/lib/push';
import { toast } from '@/lib/feedback';
import type { CourierConfig } from '@/lib/courier/types';

type Props = {
  session: SessionProfile;
  config: CourierConfig | null;
  installAvailable: boolean;
  onInstall: () => void;
  onLogout: () => void;
};

export default function PerfilTab({ session, config, installAvailable, onInstall, onLogout }: Props) {
  const [pushStatus, setPushStatus] = useState<'on' | 'off' | 'denied' | 'unsupported'>(
    pushSupported() ? pushPermission() === 'denied' ? 'denied' : 'off' : 'unsupported',
  );
  const [enablingPush, setEnablingPush] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushStatus(sub ? 'on' : 'off'))
      .catch(() => setPushStatus('off'));
  }, []);

  const enablePush = async () => {
    setEnablingPush(true);
    // Sin token explícito: la cookie HttpOnly de la sesión de reparto autentica
    // el registro y el backend asocia la suscripción con este repartidor.
    const result = await subscribePush('');
    setEnablingPush(false);
    if (result === 'ok') {
      setPushStatus('on');
      toast.success('Avisos de asignación activados en este dispositivo.');
    } else if (result === 'denied') {
      setPushStatus('denied');
      toast.error('Permiso denegado. Activa las notificaciones en el navegador.');
    } else {
      toast.error('No se pudo activar. Revisa la conexión e inténtalo de nuevo.');
    }
  };

  return (
    <div className="space-y-4 px-4 pb-4">
      <div className="rounded-3xl border border-line bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-secondary)]">
            <UserRound size={22} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-[var(--text-primary)]">{session.name || 'Repartidor'}</p>
            <p className="truncate text-xs text-[var(--text-secondary)]">{session.email || 'Sesión de reparto'}</p>
            <span className="mt-1 inline-block rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
              {session.role === 'ADMIN' ? 'Administrador' : 'Repartidor'}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white px-4">
        <div className="flex items-center justify-between border-b border-line py-3">
          <span className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Timer size={15} /> Cierre por inactividad
          </span>
          <span className="text-sm font-bold text-[var(--text-primary)]">
            {config ? `${config.inactividadMinutos} min` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <ShieldCheck size={15} /> Acceso con PIN
          </span>
          <span className="text-sm font-bold text-[var(--text-primary)]">Activo</span>
        </div>
      </div>

      <button
        onClick={enablePush}
        disabled={enablingPush || pushStatus === 'on' || pushStatus === 'unsupported'}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white py-3 text-sm font-bold text-[var(--text-primary)] disabled:opacity-60"
      >
        <BellRing size={16} />
        {pushStatus === 'on'
          ? 'Avisos de asignación activos'
          : enablingPush
            ? 'Activando…'
            : pushStatus === 'denied'
              ? 'Permiso denegado: revisa el navegador'
              : 'Activar avisos de asignación'}
      </button>
      {pushStatus === 'unsupported' && (
        <p className="px-1 text-center text-[11px] text-[var(--text-secondary)]">
          Este navegador no admite notificaciones push.
        </p>
      )}

      {installAvailable && (
        <button
          onClick={onInstall}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--fill-primary)] py-3 text-sm font-bold text-white"
        >
          <Download size={16} /> Instalar app de reparto
        </button>
      )}

      <button
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3 text-sm font-bold text-red-600"
      >
        <LogOut size={16} /> Cerrar sesión
      </button>

      <p className="px-1 text-center text-[11px] text-[var(--text-secondary)]">
        NutriFit Reparto · versión de prueba. Si no ves entregas, pide al admin que te asigne la ruta.
      </p>
    </div>
  );
}
