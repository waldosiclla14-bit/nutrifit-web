'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Package, Truck, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { toast } from '@/lib/feedback';

interface LowStockProduct {
  variantId: string;
  variantName: string;
  sku: string;
  stock: number;
  threshold: number;
  productId: string;
  productName: string;
}

interface SupplierGroup {
  supplierId: string | null;
  supplierName: string;
  paymentTerms: string | null;
  products: LowStockProduct[];
}

interface Props {
  token: string;
  onReceiveStock?: (supplierId: string | null) => void;
}

export default function LowStockBySupplier({ token, onReceiveStock }: Props) {
  const [groups, setGroups] = useState<SupplierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<SupplierGroup[]>('/products/low-stock-by-supplier', { token });
      setGroups(data || []);
      // Auto-expand groups with products
      const exp: Record<string, boolean> = {};
      (data || []).forEach((g) => { exp[g.supplierId || '__none__'] = true; });
      setExpanded(exp);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const totalLow = groups.reduce((sum, g) => sum + g.products.length, 0);

  if (loading) {
    return (
      <div className="rounded-2xl border border-line bg-paper p-6">
        <div className="flex items-center gap-2 text-muted text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          Cargando alertas de stock...
        </div>
      </div>
    );
  }

  if (totalLow === 0) {
    return (
      <div className="rounded-2xl border border-line bg-paper p-6 text-center">
        <Package size={24} className="mx-auto text-muted mb-2" />
        <p className="text-sm text-muted">Todos los productos tienen stock suficiente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          Stock bajo por proveedor
          <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            {totalLow}
          </span>
        </h3>
      </div>

      {groups.map((group) => {
        const key = group.supplierId || '__none__';
        const isExpanded = expanded[key] !== false;

        return (
          <div key={key} className="rounded-2xl border border-line bg-paper overflow-hidden">
            {/* Supplier header */}
            <button
              type="button"
              onClick={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-soft/50 transition"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Truck size={14} className="text-muted" />
                <span className="text-sm font-semibold text-ink">{group.supplierName}</span>
                {group.paymentTerms && (
                  <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-medium text-muted uppercase">
                    {group.paymentTerms}
                  </span>
                )}
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                {group.products.length} {group.products.length === 1 ? 'producto' : 'productos'}
              </span>
            </button>

            {/* Products list */}
            {isExpanded && (
              <div className="border-t border-line">
                {group.products.map((p) => (
                  <div
                    key={p.variantId}
                    className="flex items-center justify-between px-4 py-2 border-b border-line/30 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink truncate">{p.productName}</p>
                      <p className="text-[10px] text-muted">{p.variantName} · {p.sku}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className={`text-xs font-bold ${p.stock === 0 ? 'text-red-500' : 'text-amber-600'}`}>
                        {p.stock}
                      </span>
                      <span className="text-[10px] text-muted">/ {p.threshold}</span>
                    </div>
                  </div>
                ))}

                {/* Receive stock button */}
                {onReceiveStock && (
                  <div className="px-4 py-2 border-t border-line/50">
                    <button
                      onClick={() => onReceiveStock(group.supplierId)}
                      className="w-full rounded-xl bg-accent/10 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/20 transition"
                    >
                      Recibir stock de {group.supplierName}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
