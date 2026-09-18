'use client';

import { Minus, Package, Plus, Scan, Trash2, X } from 'lucide-react';
import type { PurchaseFormState, PurchaseItem, Supplier } from './types';

export function PurchaseForm({
  suppliers,
  form,
  onFormChange,
  formItems,
  itemSearch,
  onItemSearchChange,
  itemResults,
  showItemSearch,
  onToggleItemSearch,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  formTotal,
  submitting,
  onSubmit,
  onBack,
  onScan,
}: {
  suppliers: Supplier[];
  form: PurchaseFormState;
  onFormChange: (patch: Partial<PurchaseFormState>) => void;
  formItems: PurchaseItem[];
  itemSearch: string;
  onItemSearchChange: (q: string) => void;
  itemResults: any[];
  showItemSearch: boolean;
  onToggleItemSearch: (v: boolean) => void;
  onAddItem: (item: any) => void;
  onUpdateItem: (idx: number, field: string, value: any) => void;
  onRemoveItem: (idx: number) => void;
  formTotal: number;
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
  onScan: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-muted">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-ink">Nueva compra</h2>
      </div>

      <div className="bg-paper rounded-xl p-4 border border-line space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">Proveedor</label>
            <select
              value={form.supplierId}
              onChange={(e) => onFormChange({ supplierId: e.target.value })}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
            >
              <option value="">Sin proveedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">Tipo documento</label>
            <select
              value={form.documentType}
              onChange={(e) => onFormChange({ documentType: e.target.value })}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
            >
              <option value="BOLETA">Boleta</option>
              <option value="FACTURA">Factura</option>
              <option value="NOTA_VENTA">Nota de venta</option>
              <option value="GUIA_DESPACHO">Guia despacho</option>
              <option value="ORDEN_COMPRA">Orden compra</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">N documento</label>
            <input
              type="text"
              value={form.documentNumber}
              onChange={(e) => onFormChange({ documentNumber: e.target.value })}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
              placeholder="001245"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">Fecha</label>
            <input
              type="date"
              value={form.documentDate}
              onChange={(e) => onFormChange({ documentDate: e.target.value })}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">Metodo de pago</label>
          <select
            value={form.paymentMethod}
            onChange={(e) => onFormChange({ paymentMethod: e.target.value })}
            className="w-full rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
          >
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="TARJETA">Tarjeta</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">Observaciones</label>
          <textarea
            value={form.notes}
            onChange={(e) => onFormChange({ notes: e.target.value })}
            className="w-full rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-accent min-h-[60px]"
            placeholder="Notas adicionales..."
          />
        </div>
      </div>

      <div className="bg-paper rounded-xl p-4 border border-line">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-ink">Productos ({formItems.length})</h3>
          <div className="flex gap-2">
            <button
              onClick={onScan}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-accent text-ink"
            >
              <Scan className="h-3.5 w-3.5" /> Escanear
            </button>
            <button
              onClick={() => onToggleItemSearch(true)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-ink text-paper"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar
            </button>
          </div>
        </div>

        {showItemSearch && (
          <div className="mb-3 p-3 rounded-xl bg-soft border border-line">
            <div className="flex gap-2">
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => onItemSearchChange(e.target.value)}
                className="flex-1 rounded-xl border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent"
                placeholder="Buscar producto o escanear barcode..."
                autoFocus
              />
              <button onClick={() => onToggleItemSearch(false)} className="text-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            {itemResults.length > 0 && (
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {itemResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => onAddItem(r)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white text-left"
                  >
                    <Package className="h-4 w-4 text-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ink truncate">
                        {r.productName} - {r.variantName}
                      </p>
                      <p className="text-[10px] text-muted">
                        SKU: {r.sku} | ${r.costPrice?.toLocaleString()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {formItems.length === 0 && (
          <div className="p-6 border-2 border-dashed border-line rounded-xl text-center">
            <Package className="h-10 w-10 mx-auto text-accent mb-2" />
            <p className="text-sm text-ink font-semibold">Sin productos</p>
            <p className="text-xs text-muted mt-1">Toca &quot;Escanear&quot; o &quot;Agregar&quot;</p>
          </div>
        )}

        {formItems.length > 0 && (
          <div className="space-y-2">
            {formItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-soft border border-line">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-ink truncate">{item.productName}</p>
                  {item.variantName && <p className="text-[10px] text-muted truncate">{item.variantName}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onUpdateItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
                    className="h-7 w-7 rounded-lg bg-white border border-line flex items-center justify-center"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => onUpdateItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                    className="w-10 text-center text-xs font-bold border-0 bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateItem(idx, 'quantity', item.quantity + 1)}
                    className="h-7 w-7 rounded-lg bg-white border border-line flex items-center justify-center"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  value={item.unitCost}
                  onChange={(e) => onUpdateItem(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                  className="w-16 rounded-lg border border-line px-1.5 py-1 text-[11px] text-right focus:outline-none focus:border-accent font-mono"
                  placeholder="$"
                />
                <span className="text-[10px] font-bold text-accent w-14 text-right shrink-0">
                  ${item.totalCost.toLocaleString()}
                </span>
                <button type="button" onClick={() => onRemoveItem(idx)} className="text-red-400 active:text-red-600 shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {formItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
            <span className="text-lg font-bold text-ink">${formTotal.toLocaleString()}</span>
            <button
              onClick={onSubmit}
              disabled={submitting}
              className="btn-accent text-sm min-h-[44px] px-6 active:scale-[0.98] transition-transform"
            >
              {submitting ? 'Creando...' : 'Crear compra'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
