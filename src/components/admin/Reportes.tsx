'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { toast } from '@/lib/feedback';
import { CHART_COLORS, PAYMENT_LABEL } from '@/lib/admin/constants';
import { exportCSV } from '@/lib/admin/export';
import type { AdminReport } from '@/types/admin';
import { PayDonut, SalesArea, TopBars } from './charts';

export function Reportes({ token }: { token: string }) {
  const [range, setRange] = useState<'hoy' | '7d' | '30d' | 'mes'>('30d');
  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const to = new Date();
      let from = new Date();
      if (range === 'hoy') from = new Date(to.getFullYear(), to.getMonth(), to.getDate());
      else if (range === '7d') from.setDate(from.getDate() - 7);
      else if (range === '30d') from.setDate(from.getDate() - 30);
      else from = new Date(to.getFullYear(), to.getMonth(), 1);
      const q = `from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}`;
      const r = await apiFetch<AdminReport>(`/orders/reports?${q}`, { token });
      setReport(r);
    } catch (err: any) {
      toast.error(err?.message || 'Error al cargar reportes.');
    } finally {
      setLoading(false);
    }
  }, [range, token]);

  useEffect(() => {
    load();
  }, [load]);

  const byDay = useMemo(() => {
    if (!report) return [];
    const map = new Map<string, { total: number; profit: number }>();
    for (const o of report.orders) {
      const d = o.createdAt.slice(0, 10);
      const cur = map.get(d) || { total: 0, profit: 0 };
      cur.total += o.total;
      cur.profit += o.profit;
      map.set(d, cur);
    }
    return [...map.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));
  }, [report]);

  const top5 = useMemo(() => {
    if (!report) return [];
    return report.categories.slice(0, 5);
  }, [report]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['hoy', 'Hoy'],
            ['7d', '7 días'],
            ['30d', '30 días'],
            ['mes', 'Este mes'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setRange(k)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${range === k ? 'bg-ink text-paper' : 'border border-line bg-paper text-muted'}`}
          >
            {label}
          </button>
        ))}
        <button onClick={load} className="btn-outline px-4 py-2 text-xs" title="Actualizar">
          <RefreshCw size={14} /> Actualizar
        </button>
        <button onClick={() => report && exportCSV(report.orders)} disabled={!report || report.orders.length === 0} className="btn-accent px-4 py-2 text-xs disabled:opacity-50">
          Exportar CSV
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">Cargando reportes…</p>
      ) : !report ? (
        <p className="py-10 text-center text-sm text-muted">Sin datos.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Ventas', value: formatPrice(report.totalSales) },
              { label: 'Utilidad', value: formatPrice(report.totalProfit) },
              { label: 'Margen', value: `${report.margin}%` },
              { label: 'Órdenes', value: String(report.orderCount) },
              { label: 'Ticket promedio', value: formatPrice(report.avgTicket) },
            ].map((c) => (
              <div key={c.label} className="rounded-3xl border border-line bg-paper p-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{c.label}</p>
                <p className="mt-2 font-display text-2xl uppercase">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-line bg-paper p-6">
              <div className="flex items-center justify-between">
                <p className="font-display text-lg uppercase">Ventas vs utilidad</p>
                <span className="text-[11px] text-muted">verde = ventas · naranja = utilidad</span>
              </div>
              {byDay.length > 0 ? (
                <div className="mt-4">
                  <SalesArea data={byDay} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">Sin ventas en el período.</p>
              )}
            </div>

            <div className="rounded-3xl border border-line bg-paper p-6">
              <p className="font-display text-lg uppercase">Por método de pago</p>
              {report.methods.length > 0 ? (
                <div className="mt-4 flex items-center gap-6">
                  <PayDonut
                    data={report.methods.map((m) => ({ label: PAYMENT_LABEL[m.method] || m.method, total: m.total }))}
                    colors={CHART_COLORS}
                  />
                  <div className="space-y-2">
                    {report.methods.map((m, i) => (
                      <div key={m.method} className="flex items-center gap-2 text-sm">
                        <span className="h-3 w-3 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-muted">{PAYMENT_LABEL[m.method] || m.method}</span>
                        <span className="font-semibold">{formatPrice(m.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">Sin ventas en el período.</p>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-line bg-paper p-6">
              <p className="font-display text-lg uppercase">Rendimiento por producto</p>
              {report.categories.length > 0 ? (
                <div className="mt-4">
                  <TopBars
                    items={report.categories.slice(0, 8).map((c) => ({
                      label: c.product,
                      sub: `${c.quantity} uds · ${formatPrice(c.total)}`,
                      value: c.total,
                      max: Math.max(...report.categories.map((x) => x.total)),
                    }))}
                  />
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">Sin datos.</p>
              )}
            </div>

            <div className="rounded-3xl border border-line bg-paper p-6">
              <p className="font-display text-lg uppercase">Top 5 productos</p>
              {top5.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {top5.map((p, i) => (
                    <div key={p.product} className="flex items-center justify-between rounded-2xl border border-line/60 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">{i + 1}</span>
                        <div>
                          <p className="text-sm font-semibold">{p.product}</p>
                          <p className="text-[11px] text-muted">{p.quantity} unidades</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatPrice(p.total)}</p>
                        <p className="text-[11px] text-emerald-600">Utilidad {formatPrice(p.profit)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">Sin datos.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-paper">
            <div className="flex items-center justify-between px-6 pt-6">
              <p className="font-display text-lg uppercase">Detalle de órdenes</p>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-widest text-muted">
                    <th className="px-4 py-3">Pedido</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Método</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Utilidad</th>
                    <th className="px-4 py-3">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {report.orders.map((o) => (
                    <tr key={o.orderNumber} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-3 font-bold">{o.orderNumber}</td>
                      <td className="px-4 py-3">{o.customerName}</td>
                      <td className="px-4 py-3 text-xs text-muted">{new Date(o.createdAt).toLocaleString('es-CL')}</td>
                      <td className="px-4 py-3 text-xs">{PAYMENT_LABEL[o.paymentMethod || ''] || '—'}</td>
                      <td className="px-4 py-3 font-bold">{formatPrice(o.total)}</td>
                      <td className="px-4 py-3 text-emerald-600">{formatPrice(o.profit)}</td>
                      <td className="px-4 py-3">{o.margin}%</td>
                    </tr>
                  ))}
                  {report.orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-muted">
                        Sin órdenes en el período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}