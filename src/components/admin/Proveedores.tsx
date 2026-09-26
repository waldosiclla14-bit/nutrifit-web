'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  Pencil,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import { supplierWhatsAppUrl } from '@/lib/whatsapp';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { toast, useConfirm } from '@/lib/feedback';
import { handleAuthError } from '@/lib/admin/helpers';
import type { AdminSupplier } from '@/types/admin';

const EMPTY_FORM = {
  name: '',
  rut: '',
  contactPerson: '',
  phone: '',
  email: '',
  city: '',
  paymentTerms: 'CONTADO',
};

export function Proveedores({ token }: { token: string }) {
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdminSupplier | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const confirm = useConfirm();

  const logout = useCallback(() => {
    window.location.href = '/login?next=/admin';
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<AdminSupplier[]>('/suppliers', { token });
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (handleAuthError(err, logout)) return;
      toast.error(err?.message || 'Error al cargar proveedores.');
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = suppliers.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.rut && s.rut.toLowerCase().includes(q)) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(q))
    );
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (s: AdminSupplier) => {
    setEditing(s);
    setForm({
      name: s.name || '',
      rut: s.rut || '',
      contactPerson: s.contactPerson || '',
      phone: s.phone || '',
      email: s.email || '',
      city: s.city || '',
      paymentTerms: s.paymentTerms || 'CONTADO',
    });
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('El nombre del proveedor es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        rut: form.rut.trim() || undefined,
        contactPerson: form.contactPerson.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        city: form.city.trim() || undefined,
        paymentTerms: form.paymentTerms,
      };
      if (editing) {
        await apiFetch(`/suppliers/${editing.id}`, { method: 'PUT', token, body });
        toast.success('Proveedor actualizado');
      } else {
        await apiFetch('/suppliers', { method: 'POST', token, body });
        toast.success(`Proveedor ${body.name} creado`);
      }
      setShowModal(false);
      setEditing(null);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo guardar el proveedor.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: AdminSupplier) => {
    const ok = await confirm({
      title: 'Desactivar proveedor',
      message: `¿Desactivar a "${s.name}"? Sus productos y compras se conservan.`,
      cancelLabel: 'No',
      confirmLabel: 'Sí, desactivar',
      danger: true,
    });
    if (!ok) return;
    setDeletingId(s.id);
    try {
      await apiFetch(`/suppliers/${s.id}`, { method: 'DELETE', token });
      toast.success('Proveedor desactivado');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo desactivar el proveedor.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sport-green/15 text-sport-green">
              <Truck size={16} />
            </span>
            <h2 className="font-display text-xl tracking-wide uppercase">Directorio de Proveedores</h2>
          </div>
          <p className="text-xs text-muted">
            {loading ? 'Cargando…' : `${suppliers.length} proveedor(es) activos`}
          </p>
        </div>
        <Button onClick={openAdd} size="sm" className="bg-sport-green text-black font-extrabold hover:bg-sport-greenLight">
          <Plus size={14} /> Nuevo Proveedor
        </Button>
      </div>

      <div className="rounded-2xl border border-line bg-paper p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre, RUT, contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-xs text-ink placeholder:text-muted focus:border-sport-green focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 w-full rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div key={s.id} className="rounded-3xl border border-line bg-paper p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="font-display text-base tracking-wide text-ink truncate">{s.name}</h3>
                  {s.rut && <p className="text-[11px] font-mono text-muted">{s.rut}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[10px] font-black text-muted">
                  {s.paymentTerms === 'CREDITO' ? 'CRÉDITO' : 'CONTADO'}
                </span>
              </div>

              <div className="text-xs space-y-1.5 text-muted border-t border-line pt-2.5">
                {s.contactPerson && (
                  <p className="flex items-center gap-2">
                    <span className="font-bold text-ink">{s.contactPerson}</span>
                  </p>
                )}
                {s.phone && (
                  <p className="flex items-center gap-2">
                    <Phone size={12} className="text-sport-green" />
                    <a href={`tel:${s.phone}`} className="hover:text-ink">{s.phone}</a>
                    {supplierWhatsAppUrl(s.phone, `Hola ${s.name || 'proveedor'} 👋, habla el equipo NutriFit.`) && (
                      <a
                        href={supplierWhatsAppUrl(s.phone, `Hola ${s.name || 'proveedor'} 👋, habla el equipo NutriFit.`)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/10 px-2 py-1 text-[10px] font-bold text-[#128C4B] hover:bg-[#25D366]/20"
                        title="Abrir WhatsApp"
                      >
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                    )}
                  </p>
                )}
                {s.email && (
                  <p className="flex items-center gap-2">
                    <Mail size={12} className="text-sport-green" />
                    <a href={`mailto:${s.email}`} className="hover:text-ink truncate">{s.email}</a>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted border-t border-line pt-2">
                <span>{s._count?.products ?? 0} productos</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => openEdit(s)}
                    className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1.5 text-[10px] font-bold text-ink hover:border-sport-green min-h-[36px]"
                  >
                    <Pencil size={11} /> Editar
                  </button>
                  <button
                    onClick={() => remove(s)}
                    disabled={deletingId === s.id}
                    className="inline-flex items-center gap-1 rounded-full border border-red-300 px-2.5 py-1.5 text-[10px] font-bold text-red-700 disabled:opacity-50 min-h-[36px]"
                  >
                    <Trash2 size={11} /> {deletingId === s.id ? '…' : 'Desactivar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">
          {suppliers.length === 0 ? 'Sin proveedores. Crea el primero.' : 'Sin resultados para tu búsqueda.'}
        </p>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-3xl border border-line bg-paper p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display text-base tracking-wide uppercase text-ink">
                {editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-ink text-sm">✕</button>
            </div>
            <form onSubmit={save} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-muted mb-1">Nombre Comercial / Razón Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Eco Naturales Chile SpA"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-muted mb-1">RUT</label>
                  <input
                    type="text"
                    placeholder="76.xxx.xxx-x"
                    value={form.rut}
                    onChange={(e) => setForm({ ...form, rut: e.target.value })}
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-muted mb-1">Término de Pago</label>
                  <select
                    value={form.paymentTerms}
                    onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                  >
                    <option value="CONTADO">Contado</option>
                    <option value="CREDITO">Crédito 30 días</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-muted mb-1">Persona de Contacto</label>
                <input
                  type="text"
                  placeholder="Nombre y apellido"
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-muted mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="+569..."
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                  />
                </div>
                <div>
                  <label className="block font-bold text-muted mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="contacto@..."
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-muted mb-1">Ciudad</label>
                <input
                  type="text"
                  placeholder="Santiago"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="bg-sport-green text-black font-bold disabled:opacity-50">
                  {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar Proveedor'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
