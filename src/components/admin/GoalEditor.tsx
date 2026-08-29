'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/feedback';
import type { AdminGoals } from '@/types/admin';

export function GoalEditor({
  goals,
  token,
  onClose,
  onSaved,
}: {
  goals: AdminGoals | null;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AdminGoals>(
    goals || { dailySales: 200000, monthlySales: 5000000, dailyOrders: 10, monthlyOrders: 200, targetMargin: 35, avgTicket: 25000 },
  );
  const [saving, setSaving] = useState(false);

  const set = (k: keyof AdminGoals, v: string) => setForm((f) => ({ ...f, [k]: Number(v) || 0 }));

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/config/goals', { method: 'PUT', token, body: form });
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar metas.');
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof AdminGoals; label: string }[] = [
    { key: 'dailySales', label: 'Venta diaria ($)' },
    { key: 'monthlySales', label: 'Venta mensual ($)' },
    { key: 'dailyOrders', label: 'Pedidos diarios' },
    { key: 'monthlyOrders', label: 'Pedidos mensuales' },
    { key: 'targetMargin', label: 'Margen objetivo (%)' },
    { key: 'avgTicket', label: 'Ticket promedio ($)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-line bg-paper p-6" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-xl uppercase">Editar metas</p>
        <div className="mt-4 space-y-3">
          {fields.map((f) => (
            <label key={f.key} className="block">
              <span className="text-xs font-semibold text-muted">{f.label}</span>
              <input
                type="number"
                value={form[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                className="input mt-1"
              />
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline px-4 py-2 text-xs">
            Cancelar
          </button>
          <button onClick={save} disabled={saving} className="btn-accent px-4 py-2 text-xs disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar metas'}
          </button>
        </div>
      </div>
    </div>
  );
}