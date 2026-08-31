'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { toast } from '@/lib/feedback';
import type { AdminCashRegister } from '@/types/admin';

export function Caja({ cash, token, onChanged }: { cash: AdminCashRegister | null; token: string; onChanged: () => void }) {
  const [initial, setInitial] = useState('0');
  const [final, setFinal] = useState('');
  const [saving, setSaving] = useState(false);

  const open = async () => {
    setSaving(true);
    try {
      await apiFetch('/cash-register/open', { method: 'POST', token, body: { initialAmount: Number(initial) || 0 } });
      await onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'Error al abrir caja.');
    } finally {
      setSaving(false);
    }
  };

  const close = async () => {
    if (!cash) return;
    setSaving(true);
    try {
      await apiFetch(`/cash-register/${cash.id}/close`, { method: 'PATCH', token, body: { finalAmount: Number(final) || 0 } });
      await onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'Error al cerrar caja.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md rounded-3xl border border-line bg-paper p-6">
      {!cash ? (
        <>
          <p className="font-display text-xl uppercase">Abrir caja</p>
          <p className="mt-1 text-sm text-muted">Fondo inicial (puede ser 0).</p>
          <div className="mt-4 space-y-3">
            <input type="number" value={initial} onChange={(e) => setInitial(e.target.value)} className="input" placeholder="Fondo inicial" />
            <button onClick={open} disabled={saving} className="btn-accent w-full">
              {saving ? 'Abriendo…' : 'Abrir caja'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="font-display text-xl uppercase">Caja {cash.status === 'OPEN' ? 'abierta' : 'cerrada'}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Apertura</dt>
              <dd className="font-semibold">{new Date(cash.openedAt).toLocaleString('es-CL')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Fondo inicial</dt>
              <dd className="font-semibold">{formatPrice(cash.initialAmount)}</dd>
            </div>
            {cash.finalAmount !== null && (
              <>
                <div className="flex justify-between">
                  <dt className="text-muted">Cierre</dt>
                  <dd className="font-semibold">{formatPrice(cash.finalAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Diferencia</dt>
                  <dd className={`font-bold ${(cash.diff ?? 0) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatPrice(cash.diff ?? 0)}</dd>
                </div>
              </>
            )}
          </dl>
          {cash.status === 'OPEN' && (
            <div className="mt-4 space-y-3">
              <input type="number" value={final} onChange={(e) => setFinal(e.target.value)} className="input" placeholder="Total contado al cierre" />
              <button onClick={close} disabled={saving} className="btn-accent w-full">
                {saving ? 'Cerrando…' : 'Cerrar caja'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}