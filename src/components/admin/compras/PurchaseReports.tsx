'use client';

import { ArrowLeft } from 'lucide-react';

export function PurchaseReports({ reports, onBack }: { reports: any; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-soft active:scale-95 transition-all">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-ink">Reportes de Compras</h2>
      </div>

      {reports && (
        <>
          <div className="bg-paper rounded-xl p-4 border border-line">
            <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Por Proveedor</h3>
            {reports.bySupplier.length === 0 ? (
              <p className="text-xs text-muted">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {reports.bySupplier.map((s: any) => (
                  <div key={s.supplierId} className="flex items-center justify-between text-xs">
                    <span className="truncate">{s.supplierName}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted">{s.count} compras</span>
                      <span className="font-bold text-accent">${s.total.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-paper rounded-xl p-4 border border-line">
            <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Productos Mas Comprados</h3>
            {reports.byProduct.length === 0 ? (
              <p className="text-xs text-muted">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {reports.byProduct.slice(0, 10).map((p: any) => (
                  <div key={p.productId} className="flex items-center justify-between text-xs">
                    <span className="truncate">{p.productName}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted">{Number(p.quantity).toLocaleString()} unid.</span>
                      <span className="font-bold text-ink">${Number(p.totalCost).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {reports.monthlyTrend.length > 0 && (
            <div className="bg-paper rounded-xl p-4 border border-line">
              <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Tendencia Mensual</h3>
              <div className="space-y-2">
                {reports.monthlyTrend.map((m: any) => (
                  <div key={m.month} className="flex items-center justify-between text-xs">
                    <span className="text-muted">{m.month}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted">{m.count} compras</span>
                      <span className="font-bold text-accent">${m.total.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
