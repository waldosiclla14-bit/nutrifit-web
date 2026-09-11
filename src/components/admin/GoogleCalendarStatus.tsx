'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, clearCache } from '@/lib/api';
import { toast } from '@/lib/feedback';

export default function GoogleCalendarStatus() {
  const [status, setStatus] = useState<{ configured: boolean; url?: string | null; mode?: string; reason?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    clearCache('/google');
    apiFetch('/google/calendar/status')
      .then((res) => setStatus(res))
      .catch(() => setStatus({ configured: false, url: null, reason: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleConnect = async () => {
    // Ventana sincrónica: evita que el navegador bloquee el popup tras el await
    const win = window.open('about:blank', '_blank', 'width=600,height=700');
    try {
      const res = await apiFetch<{ configured: boolean; url: string | null }>('/google/calendar/auth-url');
      if (res?.url) {
        if (win) win.location.href = res.url;
        else window.open(res.url, '_blank', 'width=600,height=700');
      } else {
        win?.close();
        toast.error('Backend sin configurar: verifica GOOGLE_CLIENT_ID/SECRET en Render y que el deploy esté Live');
      }
    } catch (err: any) {
      win?.close();
      toast.error(
        err?.status === 401 || err?.status === 403
          ? 'Sin permiso: solo administradores pueden conectar Google Calendar'
          : err?.message || 'No se pudo obtener la URL de autorización',
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        Verificando Google Calendar...
      </div>
    );
  }

  if (!status?.configured) {
    const isService = status?.mode === 'service';
    const reasonMsg =
      status?.reason === 'no_access'
        ? 'Sin acceso al calendario: verifica que esté compartido con la cuenta de servicio y que el ID sea correcto'
        : status?.reason === 'not_configured'
          ? 'Faltan variables en Render o el deploy no terminó'
          : status?.reason === 'oauth_no_user'
            ? 'Falta autorizar con tu cuenta de Google'
            : isService
              ? 'La cuenta de servicio no tiene acceso: comparte el calendario con ella en Google Calendar'
              : 'Conecta para crear eventos automáticamente';
    return (
      <div className="bg-soft border border-line/20 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#4285f4]/10 flex items-center justify-center">
            <span className="text-lg">📅</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium ink">Google Calendar no conectado</p>
            <p className="text-xs text-muted">{reasonMsg}</p>
          </div>
          {!isService && (
            <button
              onClick={handleConnect}
              className="btn-primary text-xs px-3 py-2 min-h-[36px]"
            >
              Conectar
            </button>
          )}
          <button
            onClick={refresh}
            className="btn-outline text-xs px-3 py-2 min-h-[36px]"
            title="Volver a verificar"
          >
            Reintentar
          </button>
        </div>
        {!isService && status?.reason !== 'oauth_no_user' && (
          <p className="text-xs text-muted/60 mt-3">
            Requiere configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el backend
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-soft border border-accent/20 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <span className="text-lg">📅</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-accent">Google Calendar conectado</p>
          <p className="text-xs text-muted">Los eventos se crean automáticamente al agendar entregas</p>
        </div>
        <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
      </div>
    </div>
  );
}
