'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function GoogleCalendarStatus() {
  const [status, setStatus] = useState<{ configured: boolean; url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/google/calendar/status')
      .then((res) => setStatus(res))
      .catch(() => setStatus({ configured: false, url: null }))
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = async () => {
    const res = await apiFetch('/google/calendar/auth-url');
    if (res?.url) {
      window.open(res.url, '_blank', 'width=600,height=700');
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
    return (
      <div className="bg-soft border border-line/20 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#4285f4]/10 flex items-center justify-center">
            <span className="text-lg">📅</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium ink">Google Calendar no conectado</p>
            <p className="text-xs text-muted">Conecta para crear eventos automáticamente</p>
          </div>
          <button
            onClick={handleConnect}
            className="btn-primary text-xs px-3 py-2 min-h-[36px]"
          >
            Conectar
          </button>
        </div>
        <p className="text-xs text-muted/60 mt-3">
          Requiere configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el backend
        </p>
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
