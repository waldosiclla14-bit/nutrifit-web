'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { AdminInventoryMovement } from '@/types/admin';
import { Package, ArrowDown, ArrowUp, RotateCcw, Settings } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  SALE: 'Venta',
  CANCEL: 'Cancelación',
  ADJUSTMENT: 'Ajuste',
  RETURN: 'Devolución',
};

const TYPE_COLORS: Record<string, string> = {
  SALE: 'text-red-600 bg-red-50',
  CANCEL: 'text-emerald-600 bg-emerald-50',
  ADJUSTMENT: 'text-amber-600 bg-amber-50',
  RETURN: 'text-blue-600 bg-blue-50',
};

const TYPE_ICONS: Record<string, any> = {
  SALE: ArrowDown,
  CANCEL: ArrowUp,
  ADJUSTMENT: Settings,
  RETURN: RotateCcw,
};

export function Inventario({ token }: { token: string }) {
  const [movements, setMovements] = useState<AdminInventoryMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const limit = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (typeFilter) params.set('type', typeFilter);
      const res = await apiFetch<{ data: AdminInventoryMovement[]; total: number }>(
        `/products/inventory-movements?${params}`,
        { token },
      );
      setMovements(res?.data || []);
      setTotal(res?.total || 0);
    } catch {
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
          <Package size={20} /> Kardex de Inventario
        </h2>
        <span className="text-xs text-muted">{total} movimientos</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['', 'SALE', 'CANCEL', 'ADJUSTMENT', 'RETURN'].map((t) => (
          <button
            key={t}
            onClick={() => { setTypeFilter(t); setPage(1); }}
            className={`px-3 py-1.5 text-xs rounded-full border transition min-h-[36px] ${
              typeFilter === t
                ? 'bg-ink text-paper border-ink'
                : 'border-line text-muted hover:text-ink'
            }`}
          >
            {t ? TYPE_LABELS[t] : 'Todos'}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-soft animate-pulse rounded" />
          ))}
        </div>
      ) : movements.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">Sin movimientos registrados</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-3 py-2 font-medium text-muted">Fecha</th>
                <th className="px-3 py-2 font-medium text-muted">Tipo</th>
                <th className="px-3 py-2 font-medium text-muted">Producto</th>
                <th className="px-3 py-2 font-medium text-muted">SKU</th>
                <th className="px-3 py-2 font-medium text-muted text-right">Cantidad</th>
                <th className="px-3 py-2 font-medium text-muted text-right">Stock Antes</th>
                <th className="px-3 py-2 font-medium text-muted text-right">Stock Después</th>
                <th className="px-3 py-2 font-medium text-muted">Notas</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const Icon = TYPE_ICONS[m.type] || Package;
                return (
                  <tr key={m.id} className="border-b border-line/50 hover:bg-soft/50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${TYPE_COLORS[m.type]}`}>
                        <Icon size={10} />
                        {TYPE_LABELS[m.type]}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-ink max-w-[200px] truncate">
                      {m.variant?.product?.name || '—'}
                    </td>
                    <td className="px-3 py-2 text-muted font-mono">{m.variant?.sku || '—'}</td>
                    <td className={`px-3 py-2 text-right font-medium ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </td>
                    <td className="px-3 py-2 text-right text-muted">{m.previousStock}</td>
                    <td className="px-3 py-2 text-right font-medium text-ink">{m.newStock}</td>
                    <td className="px-3 py-2 text-muted max-w-[150px] truncate" title={m.notes || ''}>
                      {m.notes || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs border border-line rounded disabled:opacity-40 min-h-[36px]"
          >
            Anterior
          </button>
          <span className="text-xs text-muted">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs border border-line rounded disabled:opacity-40 min-h-[36px]"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
