'use client';

import { useMemo, useState } from 'react';
import { MessageCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { toast, useConfirm } from '@/lib/feedback';
import { webFooter } from '@/lib/whatsapp';
import { customerSegment } from '@/lib/admin/segment';
import type { AdminCustomer } from '@/types/admin';

export function Clientes({
  customers,
  token,
  onChanged,
}: {
  customers: AdminCustomer[];
  token: string;
  onChanged: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [segFilter, setSegFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [generatingCoupon, setGeneratingCoupon] = useState<string | null>(null);
  const [couponDiscounts, setCouponDiscounts] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminCustomer | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      const matchesQ = !q || `${c.name} ${c.phone} ${c.email || ''}`.toLowerCase().includes(q);
      const seg = customerSegment(c).label;
      const matchesSeg = !segFilter || seg === segFilter;
      return matchesQ && matchesSeg;
    });
  }, [customers, query, segFilter]);

  const segOptions = ['VIP', 'Recurrente', 'Activo', 'Nuevo', 'Dormido'];

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', phone: '', email: '' });
    setShowForm(true);
  };

  const openEdit = (c: AdminCustomer) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, email: c.email || '' });
    setShowForm(true);
  };

  const save = async () => {
    const name = form.name.trim();
    const phone = form.phone.trim();
    if (name.length < 2 || phone.length < 6) {
      toast.error('Ingresa nombre y teléfono válidos.');
      return;
    }
    setSaving(true);
    try {
      const body = { name, phone, email: form.email.trim() || null };
      if (editing) {
        await apiFetch(`/customers/${editing.id}`, { method: 'PATCH', token, body });
      } else {
        await apiFetch('/customers', { method: 'POST', token, body });
      }
      setShowForm(false);
      setEditing(null);
      await onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo guardar el cliente.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (customer: AdminCustomer) => {
    const ok = await confirm({
      title: 'Eliminar cliente',
      message: `¿Eliminar permanentemente al cliente ${customer.name}? Esta acción no se puede deshacer.`,
      cancelLabel: 'No',
      confirmLabel: 'Sí, eliminar',
      danger: true,
    });
    if (!ok) return;
    setDeleting(customer.id);
    try {
      await apiFetch(`/customers/${customer.id}`, { method: 'DELETE', token });
      await onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo eliminar el cliente.');
    } finally {
      setDeleting(null);
    }
  };

  const generateCoupon = async (customer: AdminCustomer) => {
    const discountPercent = couponDiscounts[customer.id] ?? 10;
    const ok = await confirm({
      title: 'Generar cupón',
      message: `¿Generar cupón de ${discountPercent}% para ${customer.name}?`,
      cancelLabel: 'No',
      confirmLabel: 'Sí, generar',
    });
    if (!ok) return;
    setGeneratingCoupon(customer.id);
    try {
      const coupon = await apiFetch<{ code: string; discountPercent: number; expiresAt: string | null }>(
        '/coupons',
        {
          method: 'POST',
          token,
          body: {
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            discountPercent,
            daysValid: 30,
          },
        },
      );
      const phone = customer.phone.replace(/\D/g, '');
      const expiry = coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('es-CL') : '30 días';
      const discountExample = Math.round(30000 * (discountPercent / 100));
      const message = [
        `Hola ${customer.name}, gracias por tu compra en NutriFit.`,
        '',
        `Te dejamos un cupón único para tu próxima compra: *${coupon.code}*`,
        `Descuento: *${discountPercent}%* de tu compra`,
        `Ejemplo: *$${discountExample.toLocaleString('es-CL')}* de ahorro en una compra de $30.000`,
        `Válido hasta: ${expiry}`,
        '',
        'Úsalo en tu próxima compra por WhatsApp o en el carrito.',
        webFooter(),
      ].join('\n');
      window.open(`https://wa.me/56${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      await onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo generar el cupón.');
    } finally {
      setGeneratingCoupon(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente…" className="input max-w-md" />
        <button
          type="button"
          onClick={openAdd}
          className="btn-primary px-4 py-2 text-xs min-h-[44px]"
        >
          <Plus size={14} /> Agregar cliente
        </button>
        {segOptions.map((s) => (
          <button
            key={s}
            onClick={() => setSegFilter(segFilter === s ? '' : s)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${segFilter === s ? 'bg-ink text-paper' : 'border border-line bg-paper text-muted'}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-paper">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-widest text-muted">
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Segmento</th>
              <th className="px-4 py-3">Órdenes</th>
              <th className="px-4 py-3">Gasto total</th>
              <th className="px-4 py-3">Última compra</th>
               <th className="px-4 py-3">Registro</th>
               <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const seg = customerSegment(c);
              return (
                <tr key={c.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 font-semibold truncate max-w-[200px]">{c.name}</td>
                  <td className="px-4 py-3 text-xs">{c.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${seg.cls}`}>{seg.label}</span>
                  </td>
                  <td className="px-4 py-3">{c.totalOrders}</td>
                  <td className="px-4 py-3 font-bold">{formatPrice(c.totalSpent)}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString('es-CL') : '—'}
                  </td>
                   <td className="px-4 py-3 text-xs text-muted">{new Date(c.createdAt).toLocaleDateString('es-CL')}</td>
                        <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="mr-2 inline-flex items-center gap-1 btn-outline px-3 py-1.5 text-[11px] min-h-[44px]"
                        >
                          <Pencil size={12} /> Editar
                        </button>
                        <div className="mr-2 inline-flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={90}
                            value={couponDiscounts[c.id] ?? 10}
                            onChange={(e) => {
                              const v = Math.min(90, Math.max(1, Number(e.target.value) || 10));
                              setCouponDiscounts((prev) => ({ ...prev, [c.id]: v }));
                            }}
                            className="w-12 rounded-full border border-emerald-300 px-2 py-1.5 text-center text-[11px] font-bold text-emerald-700 focus:border-emerald-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => generateCoupon(c)}
                            disabled={generatingCoupon === c.id}
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-300 px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 min-h-[44px]"
                          >
                            <MessageCircle size={12} /> {generatingCoupon === c.id ? '...' : 'Cupón'}
                          </button>
                        </div>
                       <button
                         type="button"
                         onClick={() => remove(c)}
                         disabled={deleting === c.id}
                        className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1.5 text-[11px] font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50 min-h-[44px]"
                     >
                        <Trash2 size={12} /> {deleting === c.id ? '…' : 'Eliminar'}
                     </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                 <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  Sin clientes.
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
            className="w-full max-w-md rounded-3xl border border-line bg-paper p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-xl uppercase">
              {editing ? 'Editar cliente' : 'Agregar cliente'}
            </p>
            <div className="mt-4 space-y-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nombre *"
                className="input"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Teléfono * (ej: 9 1234 5678)"
                className="input"
              />
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email (opcional)"
                className="input"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="btn-outline px-4 py-2 text-xs">
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="btn-accent px-4 py-2 text-xs disabled:opacity-50"
              >
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}