'use client';

import { useMemo, useState } from 'react';
import { MessageCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast, useConfirm } from '@/lib/feedback';
import { webFooter } from '@/lib/whatsapp';
import type { AdminCustomer, AdminReminder } from '@/types/admin';

export function Agenda({
  customers,
  reminders,
  token,
  onChanged,
}: {
  customers: AdminCustomer[];
  reminders: AdminReminder[];
  token: string;
  onChanged: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'DONE'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminReminder | null>(null);
  const [form, setForm] = useState({ customerId: '', title: '', message: '', dueDate: '', dueTime: '' });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const confirm = useConfirm();

  const filtered = useMemo(() => {
    return [...reminders]
      .filter((r) => filter === 'all' || r.status === filter)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }, [reminders, filter]);

  const openAdd = () => {
    setEditing(null);
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    setForm({
      customerId: customers[0]?.id || '',
      title: '',
      message: '',
      dueDate: tomorrow.toISOString().slice(0, 10),
      dueTime: '10:00',
    });
    setShowForm(true);
  };

  const openEdit = (r: AdminReminder) => {
    setEditing(r);
    const due = new Date(r.dueAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    setForm({
      customerId: r.customerId,
      title: r.title,
      message: r.message,
      dueDate: due.toISOString().slice(0, 10),
      dueTime: `${pad(due.getHours())}:${pad(due.getMinutes())}`,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.customerId || form.title.trim().length < 1 || form.message.trim().length < 1 || !form.dueDate) {
      toast.error('Completa cliente, título, mensaje y fecha.');
      return;
    }
    const dueAt = new Date(`${form.dueDate}T${form.dueTime || '10:00'}:00`).toISOString();
    setSaving(true);
    try {
      const body = { customerId: form.customerId, title: form.title.trim(), message: form.message.trim(), dueAt };
      if (editing) {
        await apiFetch(`/reminders/${editing.id}`, { method: 'PATCH', token, body });
      } else {
        await apiFetch('/reminders', { method: 'POST', token, body });
      }
      setShowForm(false);
      setEditing(null);
      await onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo guardar el recordatorio.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: AdminReminder) => {
    const ok = await confirm({
      title: 'Eliminar recordatorio',
      message: `¿Eliminar el recordatorio "${r.title}"?`,
      cancelLabel: 'No',
      confirmLabel: 'Sí, eliminar',
      danger: true,
    });
    if (!ok) return;
    setBusy(r.id);
    try {
      await apiFetch(`/reminders/${r.id}`, { method: 'DELETE', token });
      await onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo eliminar el recordatorio.');
    } finally {
      setBusy(null);
    }
  };

  const setStatus = async (r: AdminReminder, status: 'PENDING' | 'DONE') => {
    setBusy(r.id);
    try {
      await apiFetch(`/reminders/${r.id}`, { method: 'PATCH', token, body: { status } });
      await onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo actualizar el estado.');
    } finally {
      setBusy(null);
    }
  };

  const sendWhatsApp = (r: AdminReminder) => {
    const phone = r.customerPhone.replace(/\D/g, '');
    if (!phone) {
      toast.error('Este cliente no tiene teléfono válido.');
      return;
    }
    const when = new Date(r.dueAt).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' });
    const message = `${r.title}\n\n${r.message}\n\n📅 Recordatorio agendado para: ${when}${webFooter()}`;
    window.open(`https://wa.me/56${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'PENDING', 'DONE'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
              filter === s ? 'bg-ink text-paper' : 'border border-line bg-paper text-muted'
            }`}
          >
            {s === 'all' ? 'Todos' : s === 'PENDING' ? 'Pendientes' : 'Completados'}
          </button>
        ))}
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1 rounded-full bg-ink px-4 py-2 text-xs font-bold text-paper transition hover:opacity-90"
        >
          <Plus size={14} /> Agregar recordatorio
        </button>
      </div>
      <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-paper">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-widest text-muted">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Recordatorio</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const overdue = r.status === 'PENDING' && new Date(r.dueAt).getTime() < Date.now();
              return (
                <tr key={r.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 text-xs">
                    {new Date(r.dueAt).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
                    {overdue && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">Vencido</span>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{r.customerName}</p>
                    <p className="text-[11px] text-muted">{r.customerPhone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{r.title}</p>
                    <p className="max-w-md whitespace-pre-line text-xs text-muted">{r.message}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      r.status === 'DONE' ? 'border-emerald-300 bg-emerald-100 text-emerald-800' : 'border-sky-300 bg-sky-100 text-sky-800'
                    }`}>
                      {r.status === 'DONE' ? 'Completado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => sendWhatsApp(r)}
                      className="mr-2 inline-flex items-center gap-1 rounded-full border border-emerald-300 px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      <MessageCircle size={12} /> WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(r, r.status === 'DONE' ? 'PENDING' : 'DONE')}
                      disabled={busy === r.id}
                      className="mr-2 inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px] font-bold text-muted disabled:opacity-50"
                    >
                      {r.status === 'DONE' ? 'Reabrir' : 'Completar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="mr-2 inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px] font-bold text-muted"
                    >
                      <Pencil size={12} /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      disabled={busy === r.id}
                      className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1.5 text-[11px] font-bold text-red-700 disabled:opacity-50"
                    >
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  Sin recordatorios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-paper p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-xl uppercase">
              {editing ? 'Editar recordatorio' : 'Agregar recordatorio'}
            </p>
            <div className="mt-4 space-y-3">
              <select
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                className="input"
              >
                <option value="">Selecciona cliente…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.phone}
                  </option>
                ))}
              </select>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Título (ej: Recordatorio de reposición)"
                className="input"
              />
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Mensaje que se enviará por WhatsApp…"
                className="input"
                rows={4}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="input"
                />
                <input
                  type="time"
                  value={form.dueTime}
                  onChange={(e) => setForm({ ...form, dueTime: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="btn-outline px-4 py-2 text-xs">
                Cancelar
              </button>
              <button onClick={save} disabled={saving} className="btn-accent px-4 py-2 text-xs disabled:opacity-50">
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear recordatorio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}