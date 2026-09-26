'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Trash2, Wallet } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { toast } from '@/lib/feedback';
import { PayDonut } from './charts';
import { useConfirm } from '@/lib/feedback';

export const FINANZAS_ENABLED = process.env.NEXT_PUBLIC_FINANZAS_ENABLED === 'true';

type Summary = {
  from: string;
  to: string;
  ingresos: number;
  cogs: number;
  margenBruto: number;
  margenBrutoPct: number;
  comprasStock: number;
  comprasCount: number;
  gastosOp: number;
  gastosCount: number;
  utilidadNeta: number;
  utilidadPct: number;
  ordenes: number;
  porCategoria: { categoryId: string | null; name: string; color: string; total: number; count: number }[];
};

type Category = { id: string; name: string; color: string | null };
type Expense = {
  id: string;
  description: string;
  amount: number;
  spentAt: string;
  notes: string | null;
  category: Category | null;
};

type RangeKey = 'hoy' | '7d' | '30d' | 'mes';

function rangeDates(range: RangeKey): { from: string; to: string } {
  const to = new Date();
  let from = new Date();
  if (range === 'hoy') from = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  else if (range === '7d') from.setDate(from.getDate() - 7);
  else if (range === '30d') from.setDate(from.getDate() - 30);
  else from = new Date(to.getFullYear(), to.getMonth(), 1);
  const iso = (d: Date) => d.toISOString().split('T')[0];
  return { from: iso(from), to: iso(to) };
}

export function Finanzas({ token }: { token: string }) {
  const [range, setRange] = useState<RangeKey>('mes');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', categoryId: '', spentAt: new Date().toISOString().split('T')[0] });
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = rangeDates(range);
      const q = `from=${from}&to=${to}`;
      const [s, e, c] = await Promise.all([
        apiFetch<Summary>(`/finances/summary?${q}`, { token }),
        apiFetch<Expense[]>(`/finances/expenses?${q}&limit=100`, { token }),
        apiFetch<Category[]>('/finances/categories', { token }).catch(() => []),
      ]);
      setSummary(s);
      setExpenses(e || []);
      setCategories(c || []);
    } catch (err: any) {
      toast.error(err?.message || 'Error al cargar finanzas.');
    } finally {
      setLoading(false);
    }
  }, [range, token]);

  useEffect(() => {
    load();
  }, [load]);

  const saveExpense = async () => {
    const amount = Math.round(Number(form.amount));
    if (form.description.trim().length < 2) {
      toast.error('Describe el gasto (mínimo 2 caracteres).');
      return;
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      toast.error('Monto inválido.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/finances/expenses', {
        method: 'POST',
        token,
        body: {
          description: form.description.trim(),
          amount,
          categoryId: form.categoryId || undefined,
          spentAt: form.spentAt || undefined,
        },
      });
      toast.success('Gasto registrado.');
      setShowForm(false);
      setForm({ description: '', amount: '', categoryId: '', spentAt: new Date().toISOString().split('T')[0] });
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar el gasto.');
    } finally {
      setSaving(false);
    }
  };

  const removeExpense = async (e: Expense) => {
    const ok = await confirm({
      title: 'Eliminar gasto',
      message: `¿Eliminar "${e.description}" por ${formatPrice(e.amount)}?`,
      confirmLabel: 'Sí, eliminar',
      cancelLabel: 'No',
      danger: true,
    });
    if (!ok) return;
    try {
      await apiFetch(`/finances/expenses/${e.id}`, { method: 'DELETE', token });
      toast.success('Gasto eliminado.');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar.');
    }
  };

  if (!FINANZAS_ENABLED) {
    return (
      <div className="ds-card p-10 text-center">
        <Wallet size={28} className="mx-auto text-muted" />
        <p className="mt-3 font-bold text-foreground">Módulo Finanzas desactivado</p>
        <p className="mt-1 text-sm text-muted">Actívalo con NEXT_PUBLIC_FINANZAS_ENABLED=true.</p>
      </div>
    );
  }

  const kpis = summary
    ? [
        { label: 'Ingresos', value: formatPrice(summary.ingresos), sub: `${summary.ordenes} órdenes` },
        { label: 'COGS', value: formatPrice(summary.cogs), sub: `Margen bruto ${summary.margenBrutoPct}%` },
        { label: 'Compras stock', value: formatPrice(summary.comprasStock), sub: `${summary.comprasCount} compras` },
        { label: 'Gastos operacionales', value: formatPrice(summary.gastosOp), sub: `${summary.gastosCount} gastos` },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['hoy', 'Hoy'],
            ['7d', '7 días'],
            ['30d', '30 días'],
            ['mes', 'Este mes'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setRange(k)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${range === k ? 'bg-ink text-paper' : 'border border-line bg-paper text-muted'}`}
          >
            {label}
          </button>
        ))}
        <button onClick={load} className="ds-btn-secondary px-4 py-2 text-xs" title="Actualizar">
          <RefreshCw size={14} /> Actualizar
        </button>
        <button onClick={() => setShowForm(true)} className="ds-btn-accent px-4 py-2 text-xs">
          <Plus size={14} /> Registrar gasto
        </button>
      </div>

      {/* Hero utilidad neta */}
      <div className="ds-card p-6 text-center">
        <p className="text-xs font-black uppercase tracking-wider text-muted">Utilidad neta del período</p>
        <p className={`mt-1 font-display text-4xl font-black tabular-nums ${!summary || summary.utilidadNeta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {loading ? '…' : formatPrice(summary?.utilidadNeta ?? 0)}
        </p>
        {!loading && summary && (
          <p className="mt-1 text-xs text-muted">
            {summary.utilidadPct}% de los ingresos · {summary.from} → {summary.to}
          </p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="ds-card p-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-muted">{k.label}</p>
            <p className="mt-1 text-xl font-black tabular-nums text-foreground">{loading ? '…' : k.value}</p>
            <p className="mt-0.5 text-[11px] text-muted">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Donut por categoría */}
        <div className="ds-card p-5">
          <p className="font-bold text-foreground">Gastos por categoría</p>
          {loading ? (
            <p className="mt-4 text-sm text-muted">Cargando…</p>
          ) : summary && summary.porCategoria.length > 0 ? (
            <PayDonut
              data={summary.porCategoria.map((c) => ({ label: c.name, total: c.total }))}
              colors={summary.porCategoria.map((c) => c.color)}
            />
          ) : (
            <p className="mt-4 text-sm text-muted">Sin gastos en el período.</p>
          )}
        </div>

        {/* Lista de gastos */}
        <div className="ds-card p-5">
          <p className="font-bold text-foreground">Movimientos ({expenses.length})</p>
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{e.description}</p>
                  <p className="text-[11px] text-muted">
                    {new Date(e.spentAt).toLocaleDateString('es-CL')}
                    {e.category ? ` · ${e.category.name}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-sm font-black tabular-nums">{formatPrice(e.amount)}</p>
                  <button
                    onClick={() => removeExpense(e)}
                    className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                    aria-label={`Eliminar ${e.description}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {!loading && expenses.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">Sin gastos registrados.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal registrar gasto */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-3xl bg-paper p-6 shadow-2xl">
            <p className="font-display text-lg uppercase tracking-wide">Nuevo gasto</p>
            <div className="mt-4 space-y-3">
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descripción (ej. Arriendo local)"
                className="input"
                maxLength={200}
              />
              <input
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, '') })}
                placeholder="Monto $"
                inputMode="numeric"
                className="input"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="input"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={form.spentAt}
                  onChange={(e) => setForm({ ...form, spentAt: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => setShowForm(false)} className="ds-btn-secondary justify-center" disabled={saving}>
                Cancelar
              </button>
              <button onClick={saveExpense} className="ds-btn-accent justify-center" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
