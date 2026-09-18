'use client';

import { AlertTriangle, BarChart3, Package, Plus, Search } from 'lucide-react';
import type { Purchase, PurchaseAlert, PurchaseStats } from './types';
import { statusColor, statusLabel } from './helpers';

export function PurchaseList({
  purchases,
  stats,
  alerts,
  filter,
  onFilterChange,
  loading,
  onOpen,
  onNew,
  onReports,
}: {
  purchases: Purchase[];
  stats: PurchaseStats;
  alerts: PurchaseAlert[];
  filter: { status: string; search: string };
  onFilterChange: (f: { status: string; search: string }) => void;
  loading: boolean;
  onOpen: (id: string) => void;
  onNew: () => void;
  onReports: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-ink">Compras</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onReports}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl bg-soft border border-line text-ink active:scale-[0.97]"
          >
            <BarChart3 className="h-4 w-4" /> Reportes
          </button>
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-accent text-ink active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" /> Nueva
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-paper rounded-xl p-3 border border-line text-center">
          <p className="text-lg font-bold text-accent">${stats.totalThisMonth.toLocaleString()}</p>
          <p className="text-[10px] text-muted">Compras mes</p>
        </div>
        <div className="bg-paper rounded-xl p-3 border border-line text-center">
          <p className="text-lg font-bold text-ink">{stats.countThisMonth}</p>
          <p className="text-[10px] text-muted">Transacciones</p>
        </div>
        <div className="bg-paper rounded-xl p-3 border border-line text-center">
          <p className="text-lg font-bold text-ink">{stats.suppliersCount}</p>
          <p className="text-[10px] text-muted">Proveedores</p>
        </div>
        <div className="bg-paper rounded-xl p-3 border border-line text-center">
          <p className="text-lg font-bold text-amber-500">{stats.pendingReceipt}</p>
          <p className="text-[10px] text-muted">Pendientes recepcion</p>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.slice(0, 5).map((a, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${
                a.severity === 'critical'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : a.severity === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{a.message}</span>
              {a.purchaseId && (
                <button onClick={() => onOpen(a.purchaseId!)} className="text-[10px] font-semibold underline shrink-0">
                  Ver
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={filter.search}
            onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
            className="w-full rounded-xl border border-line pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-accent"
            placeholder="Buscar..."
          />
        </div>
        <select
          value={filter.status}
          onChange={(e) => onFilterChange({ ...filter, status: e.target.value })}
          className="rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
        >
          <option value="">Todos</option>
          <option value="DRAFT">Borrador</option>
          <option value="PENDING_REVIEW">Pendiente</option>
          <option value="CONFIRMED">Confirmada</option>
          <option value="RECEIVING">Recibiendo</option>
          <option value="RECEIVED">Recibida</option>
          <option value="CANCELLED">Anulada</option>
        </select>
      </div>

      {loading && <p className="text-xs text-muted text-center py-4">Cargando...</p>}

      {!loading && purchases.length === 0 && (
        <div className="p-8 border-2 border-dashed border-line rounded-xl text-center">
          <Package className="h-10 w-10 mx-auto text-accent mb-2" />
          <p className="text-sm text-ink font-semibold">Sin compras</p>
          <p className="text-xs text-muted mt-1">Toca &quot;Nueva&quot; para crear</p>
        </div>
      )}

      <div className="space-y-2">
        {purchases.map((p) => (
          <button
            key={p.id}
            onClick={() => onOpen(p.id)}
            className="w-full text-left p-3 rounded-xl bg-paper border border-line active:bg-soft transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-ink">{p.purchaseNumber}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor(p.status)}`}>
                {statusLabel(p.status)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted">
                {p.supplier?.name || 'Sin proveedor'} | {p.createdAt?.slice(0, 10)}
              </p>
              <p className="text-[11px] font-bold text-accent">${p.total.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted">
              <span>{p._count?.items || p.items?.length || 0} items</span>
              {p._count?.documents ? <span>{p._count.documents} docs</span> : null}
              {p.receiptStatus !== 'PENDING' && (
                <span className={p.receiptStatus === 'COMPLETED' ? 'text-green-500' : 'text-amber-500'}>
                  {p.receiptStatus === 'COMPLETED' ? 'Recibida completa' : 'Recepcion parcial'}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
