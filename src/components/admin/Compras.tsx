'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/feedback';

type Purchase = {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplier?: string;
  referenceNumber?: string;
  notes?: string;
  status: string;
  createdAt: string;
};

type PurchaseFormValues = {
  productId: string;
  variantId?: string;
  quantity: number;
  unitCost: number;
  supplier: string;
  referenceNumber: string;
  notes: string;
};

export function Compras({ token }: { token: string }) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [form, setForm] = useState<PurchaseFormValues>({
    productId: '',
    quantity: 1,
    unitCost: 0,
    supplier: '',
    referenceNumber: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [productOptions, setProductOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [filter, setFilter] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all' as string,
  });

  const loadPurchases = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.dateFrom) params.set('dateFrom', filter.dateFrom);
      if (filter.dateTo) params.set('dateTo', filter.dateTo);
      if (filter.status !== 'all') params.set('status', filter.status);

      const res = await apiFetch<any>(`/admin/purchases?${params}`, { token });
      setPurchases(res?.data || res || []);
    } catch {
      setPurchases([]);
    }
  }, [token, filter]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  useEffect(() => {
    apiFetch<any>('/admin/purchases/options', { token })
      .then((res) => setProductOptions(res?.data || res || []))
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, [token]);

  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId || form.quantity < 1 || form.unitCost < 1) {
      toast.error('Completa producto, cantidad y costo unitario');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/admin/purchases', {
        method: 'POST',
        body: JSON.stringify({
          productId: form.productId,
          quantity: form.quantity,
          unitCost: form.unitCost,
          supplier: form.supplier,
          referenceNumber: form.referenceNumber,
          notes: form.notes,
        }),
        token,
      });
      setForm({ productId: '', quantity: 1, unitCost: 0, supplier: '', referenceNumber: '', notes: '' });
      loadPurchases();
      toast.success('Compra registrada y stock actualizado');
    } catch (err: any) {
      toast.error(err?.message || 'Error al registrar compra');
    } finally {
      setLoading(false);
    }
  }, [token, form, loadPurchases]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Anular esta compra?')) return;
    try {
      await apiFetch(`/admin/purchases/${id}`, { method: 'DELETE', token });
      loadPurchases();
      toast.success('Compra anulada');
    } catch {
      toast.error('Error al anular compra');
    }
  }, [token, loadPurchases]);

  const updateField = (field: keyof PurchaseFormValues, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 lg:max-w-sm">
          <div className="bg-paper rounded-xl p-4 border border-line">
            <h4 className="font-semibold text-sm uppercase tracking-widest text-muted mb-3">Filtros</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Fecha inicial</label>
                <input type="date" value={filter.dateFrom} onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })} className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Fecha final</label>
                <input type="date" value={filter.dateTo} onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })} className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Estado</label>
                <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent">
                  <option value="all">Todos</option>
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-[2]">
          <div className="bg-paper rounded-xl p-4 border border-line">
            <h4 className="font-semibold text-sm uppercase tracking-widest text-muted mb-3">Registrar compra</h4>
            <form onSubmit={handleRegister}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Producto</label>
                  <select value={form.productId} onChange={(e) => updateField('productId', e.target.value)} className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent" disabled={loadingProducts}>
                    <option value="">Seleccionar producto</option>
                    {productOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Costo unitario ($)</label>
                  <input type="number" min="0" value={form.unitCost} onChange={(e) => updateField('unitCost', Number(e.target.value) || 0)} className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Cantidad</label>
                  <input type="number" min="1" value={form.quantity} onChange={(e) => updateField('quantity', Number(e.target.value) || 1)} className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Proveedor</label>
                  <input type="text" value={form.supplier} onChange={(e) => updateField('supplier', e.target.value)} className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Nro documento</label>
                  <input type="text" value={form.referenceNumber} onChange={(e) => updateField('referenceNumber', e.target.value)} className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-muted mb-1">Observaciones</label>
                <textarea rows={2} value={form.notes} onChange={(e) => updateField('notes', e.target.value)} className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" disabled={loading} className="btn-accent text-xs min-h-[36px] px-4">
                  {loading ? 'Registrando...' : 'Registrar compra'}
                </button>
                <span className="text-xs text-muted">
                  Total: <strong>${(form.quantity * form.unitCost).toLocaleString()}</strong>
                </span>
              </div>
            </form>
          </div>

          <div className="mt-4 bg-paper rounded-xl p-4 border border-line">
            <h5 className="font-semibold text-sm uppercase tracking-widest text-muted mb-3">Historial de compras</h5>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {purchases.length === 0 && <p className="text-xs text-muted text-center py-4">No hay compras registradas</p>}
              {purchases.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-line hover:bg-soft transition-colors">
                  <span className="text-[10px] text-muted shrink-0">{p.createdAt?.slice(0, 10)}</span>
                  <span className="text-xs font-medium truncate flex-1">{p.productName}{p.variantName ? ` - ${p.variantName}` : ''}</span>
                  <span className="text-[10px] text-muted shrink-0">x{p.quantity}</span>
                  <span className="text-[11px] font-bold text-accent shrink-0">${p.totalCost?.toLocaleString()}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${p.status === 'cancelled' ? 'bg-red-100 text-red-600' : p.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{p.status}</span>
                  {p.status !== 'cancelled' && (
                    <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 text-xs shrink-0" title="Anular">Anular</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Compras;