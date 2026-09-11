'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, clearCache } from '@/lib/api';
import { toast } from '@/lib/feedback';

const REASON_MSG: Record<string, string> = {
  no_access: 'Token inválido o sin acceso: revisa TODOIST_API_TOKEN en Render',
  not_configured: 'Falta TODOIST_API_TOKEN en el backend (Render → Environment)',
  error: 'Error conectando con Todoist, reintenta en unos minutos',
};

export default function TodoistStatus() {
  const [status, setStatus] = useState<{ configured: boolean; reason?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    clearCache('/todoist');
    apiFetch('/todoist/status')
      .then((res) => setStatus(res))
      .catch(() => setStatus({ configured: false, reason: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        Verificando Todoist...
      </div>
    );
  }

  if (!status?.configured) {
    return (
      <div className="bg-soft border border-line/20 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#e44332]/10 flex items-center justify-center">
            <span className="text-lg">✅</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium ink">Todoist no conectado</p>
            <p className="text-xs text-muted">{REASON_MSG[status?.reason || ''] || 'Las entregas no crearán tareas'}</p>
          </div>
          <button
            onClick={() => {
              refresh();
              toast.info('Verificando conexión con Todoist…');
            }}
            className="btn-outline text-xs px-3 py-2 min-h-[36px]"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-soft border border-accent/20 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <span className="text-lg">✅</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-accent">Todoist conectado</p>
          <p className="text-xs text-muted">Cada entrega crea una tarea automáticamente</p>
        </div>
        <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
      </div>
    </div>
  );
}
