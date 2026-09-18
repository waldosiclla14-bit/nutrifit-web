'use client';

import { X } from 'lucide-react';
import type { Purchase, ReceiptLineInput } from './types';

export function ReceiptForm({
  purchase: p,
  receiptItems,
  onReceiptChange,
  onSubmit,
  onBack,
}: {
  purchase: Purchase;
  receiptItems: ReceiptLineInput[];
  onReceiptChange: (idx: number, field: 'receivedQty' | 'damagedQty', value: number) => void;
  onSubmit: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-muted">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-ink">Recepcion - {p.purchaseNumber}</h2>
      </div>

      <div className="bg-paper rounded-xl p-4 border border-line">
        <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Cantidades recibidas</h3>
        <div className="space-y-3">
          {receiptItems.map((ri, idx) => {
            const item = p.items.find((i) => i.id === ri.purchaseItemId);
            if (!item) return null;
            const pending = item.quantity - item.receivedQty;
            return (
              <div key={idx} className="p-3 rounded-xl bg-soft border border-line">
                <p className="text-[11px] font-semibold text-ink mb-2">
                  {item.productName} - {item.variantName}
                </p>
                <p className="text-[10px] text-muted mb-2">Pendiente: {pending} unidades</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-muted">Recibidas</label>
                    <input
                      type="number"
                      min="0"
                      max={pending}
                      value={ri.receivedQty}
                      onChange={(e) => onReceiptChange(idx, 'receivedQty', parseInt(e.target.value, 10) || 0)}
                      className="w-full rounded-lg border border-line px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-muted">Danados</label>
                    <input
                      type="number"
                      min="0"
                      value={ri.damagedQty}
                      onChange={(e) => onReceiptChange(idx, 'damagedQty', parseInt(e.target.value, 10) || 0)}
                      className="w-full rounded-lg border border-line px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <button
            onClick={() => onSubmit(p.id)}
            className="w-full btn-accent text-sm min-h-[48px] active:scale-[0.98] transition-transform"
          >
            Confirmar recepcion
          </button>
        </div>
      </div>
    </div>
  );
}
