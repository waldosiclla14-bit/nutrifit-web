'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ShoppingBag, TrendingUp, Users, type LucideIcon } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { progressPct, stockLevel } from '@/lib/admin/format';
import { toast } from '@/lib/feedback';
import type {
  AdminStats,
  AdminGoals,
  AdminInventoryValue,
  AdminReport,
  AdminSegments,
} from '@/types/admin';
import { CountUp, HourBars, SalesArea, Spark, TopBars } from './charts';
import { GoalEditor } from './GoalEditor';
import LowStockBySupplier from './LowStockBySupplier';

const RANGES = [
  ['7d', '7 días'],
  ['30d', '30 días'],
  ['90d', '90 días'],
  ['mes', 'Mes'],
  ['año', 'Año'],
] as const;

const TREND_LABEL: Record<RangeKey, string> = {
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días',
  mes: 'Este mes',
  año: 'Este año',
};

type RangeKey = (typeof RANGES)[number][0];

type LowStockItem = {
  name: string;
  sku: string;
  stock: number;
  alert: number | null;
  variantName?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function rangeBounds(range: RangeKey) {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  let from: Date;
  let prevTo: Date;
  let prevFrom: Date;
  if (range === 'mes') {
    from = new Date(to.getFullYear(), to.getMonth(), 1);
    prevTo = new Date(to.getFullYear(), to.getMonth(), 0);
    prevFrom = new Date(to.getFullYear(), to.getMonth() - 1, 1);
  } else if (range === 'año') {
    from = new Date(to.getFullYear(), 0, 1);
    prevTo = new Date(to.getFullYear() - 1, 11, 31);
    prevFrom = new Date(to.getFullYear() - 1, 0, 1);
  } else {
    const span = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    from = new Date(to.getTime() - (span - 1) * DAY_MS);
    prevTo = new Date(from.getTime() - DAY_MS);
    prevFrom = new Date(prevTo.getTime() - (span - 1) * DAY_MS);
  }
  return { from, to, prevFrom, prevTo };
}

function normalizeLowStock(items: any[]): LowStockItem[] {
  const out: LowStockItem[] = [];
  for (const it of items || []) {
    if (!it) continue;
    const name = String(it.productName || it.name || it.title || 'Producto');
    const sku = String(it.sku ?? '');
    const alert: number | null =
      typeof it.lowStockAlert === 'number'
        ? it.lowStockAlert
        : typeof it.alert === 'number'
          ? it.alert
          : null;
    const stock = typeof it.stock === 'number' ? it.stock : Number(it.stock) || 0;
    const variants = Array.isArray(it.variants) ? it.variants : [];
    if (variants.length > 0) {
      for (const v of variants) {
        if (!v || typeof v.stock !== 'number') continue;
        const vAlert: number | null = typeof v.lowStockAlert === 'number' ? v.lowStockAlert : alert;
        if (vAlert !== null && v.stock <= vAlert) {
          out.push({
            name,
            sku: String(v.sku ?? sku),
            stock: v.stock,
            alert: vAlert,
            variantName: v.name ? String(v.name) : undefined,
          });
        }
      }
    } else if (alert !== null && stock <= alert) {
      out.push({ name, sku, stock, alert });
    }
  }
  return out.sort((a, b) => a.stock - b.stock);
}

export function Resumen({
  stats,
  goals,
  inventory,
  token,
  onChanged,
}: {
  stats: AdminStats | null;
  goals: AdminGoals | null;
  inventory: AdminInventoryValue | null;
  token: string;
  onChanged: () => void;
}) {
  const [showGoals, setShowGoals] = useState(false);
  const [range, setRange] = useState<RangeKey>('30d');
  const [report, setReport] = useState<AdminReport | null>(null);
  const [prevReport, setPrevReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [segments, setSegments] = useState<AdminSegments | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = rangeBounds(range);
      const curQ = `from=${iso(b.from)}&to=${iso(b.to)}`;
      const prevQ = `from=${iso(b.prevFrom)}&to=${iso(b.prevTo)}`;
      const [cur, prev] = await Promise.all([
        apiFetch<AdminReport>(`/orders/reports?${curQ}`, { token }),
        apiFetch<AdminReport>(`/orders/reports?${prevQ}`, { token }),
      ]);
      setReport(cur);
      setPrevReport(prev);
    } catch (err: any) {
      toast.error(err?.message || 'Error al cargar ventas del período.');
    } finally {
      setLoading(false);
    }
  }, [range, token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [ls, sg] = await Promise.all([
          apiFetch<any[]>('/products/low-stock', { token }).catch(() => [] as any[]),
          apiFetch<AdminSegments>('/customers/segments', { token }).catch(() => null),
        ]);
        if (!alive) return;
        setLowStock(normalizeLowStock(Array.isArray(ls) ? ls : []));
        setSegments(sg);
      } catch {
        if (alive) toast.error('Error al cargar stock y clientes.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const period = useMemo(() => {
    if (!report || !prevReport) {
      return { growthPct: 0, delta: 0, windowLabel: '', prevLabel: '' };
    }
    const cur = report.totalSales || 0;
    const prev = prevReport.totalSales || 0;
    const growthPct = prev <= 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);
    return {
      growthPct,
      delta: cur - prev,
      windowLabel: `${report.from?.slice(5) || ''} – ${report.to?.slice(5) || ''}`,
      prevLabel: `${prevReport.from?.slice(5) || ''} – ${prevReport.to?.slice(5) || ''}`,
    };
  }, [report, prevReport]);

  const byHour = useMemo(() => {
    const arr = Array.from({ length: 24 }, (_, hour) => ({ hour, total: 0 }));
    if (!report) return arr;
    for (const o of report.orders) {
      const d = new Date(o.createdAt);
      if (isNaN(d.getTime())) continue;
      arr[d.getHours()].total += o.total || 0;
    }
    return arr;
  }, [report]);

  const peakHour = useMemo(() => {
    let hour = -1;
    let total = 0;
    for (const h of byHour) {
      if (h.total > total) {
        total = h.total;
        hour = h.hour;
      }
    }
    return { hour, total };
  }, [byHour]);

  const rangeDaily = useMemo(() => {
    if (!report) return [];
    const map = new Map<string, { total: number; profit: number }>();
    for (const o of report.orders) {
      const d = o.createdAt.slice(0, 10);
      const cur = map.get(d) || { total: 0, profit: 0 };
      cur.total += o.total || 0;
      cur.profit += o.profit || 0;
      map.set(d, cur);
    }
    return [...map.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [report]);

  const trendDaily = useMemo(() => {
    if (rangeDaily.length > 0) return rangeDaily;
    return (stats?.salesByDay ?? []).map((d) => ({ date: d.date, total: d.total, profit: d.profit }));
  }, [rangeDaily, stats]);

  const trendTop = useMemo(() => {
    if (report && report.categories.length > 0) {
      const items = report.categories.slice(0, 5);
      const max = Math.max(...items.map((x) => x.total), 1);
      return items.map((c) => ({
        label: c.product,
        sub: `${c.quantity} uds · ${formatPrice(c.total)}`,
        value: c.total,
        max,
      }));
    }
    const fallback = stats?.topProducts ?? [];
    const max = Math.max(...fallback.map((x) => x.revenue), 1);
    return fallback.map((p) => ({
      label: p.name,
      sub: `${p.quantity} uds · ${formatPrice(p.revenue)}`,
      value: p.revenue,
      max,
    }));
  }, [report, stats]);

  const customerData = useMemo<AdminSegments>(() => {
    if (!segments) return { top: [], counts: { recurrentes: 0, nuevos: 0, dormidos: 0, vip: 0 } };
    return segments;
  }, [segments]);

  if (!stats) return null;

  const growthTxtFor = (v: number, suffix: string) =>
    stats.todaySales === 0 && v === 0 && suffix === 'vs ayer'
      ? 'sin ventas aún'
      : `${v > 0 ? '▲' : v < 0 ? '▼' : '•'} ${Math.abs(v)}% ${suffix}`;
  const growthClsFor = (v: number) => (v > 0 ? 'text-emerald-600' : v < 0 ? 'text-red-600' : 'text-muted');

  const growth = stats.salesGrowth;
  const growthTxt = growthTxtFor(growth, 'vs ayer');

  const cards: {
    label: string;
    value: string;
    raw?: number;
    fmt?: (n: number) => string;
    spark?: number[];
    sub: string;
    extra: string;
    extraCls: string;
    Icon: LucideIcon;
  }[] = [
    {
      label: 'Ventas hoy',
      value: formatPrice(stats.todaySales),
      raw: stats.todaySales,
      fmt: formatPrice,
      spark: stats.salesByDay.map((d) => d.total),
      sub: `${stats.todayOrders} órdenes (${growthTxtFor(stats.ordersGrowth ?? 0, 'vs ayer')}) · ticket ${formatPrice(stats.avgTicket)}`,
      extra: growthTxt,
      extraCls: growthClsFor(growth),
      Icon: TrendingUp,
    },
    {
      label: 'Ventas del mes',
      value: formatPrice(stats.monthSales),
      raw: stats.monthSales,
      fmt: formatPrice,
      spark: (rangeDaily.length > 0 ? rangeDaily : stats.salesByDay).map((d) => d.total),
      sub: `${stats.monthOrders} órdenes (${growthTxtFor(stats.monthOrdersGrowth ?? 0, 'vs mes ant.')}) · ticket ${formatPrice(stats.monthAvgTicket)}`,
      extra: growthTxtFor(stats.monthGrowth ?? 0, 'vs mes ant.'),
      extraCls: growthClsFor(stats.monthGrowth ?? 0),
      Icon: CalendarDays,
    },
    {
      label: 'Órdenes pendientes',
      value: String(stats.pendingOrders),
      raw: stats.pendingOrders,
      fmt: (n) => String(n),
      spark: stats.salesByDay.map((d) => d.orders),
      sub: `${stats.totalOrders} totales · por cobrar ${formatPrice(stats.pendingTotal ?? 0)}`,
      extra: `Utilidad hoy ${formatPrice(stats.todayProfit)}`,
      extraCls: 'text-accent',
      Icon: ShoppingBag,
    },
    {
      label: 'Clientes',
      value: String(stats.totalCustomers),
      raw: stats.totalCustomers,
      fmt: (n) => String(n),
      sub: 'registrados',
      extra: `Margen hoy ${stats.todayMargin}%`,
      extraCls: 'text-accent',
      Icon: Users,
    },
  ];

  const goalBars = goals
    ? [
        { label: 'Venta diaria', actual: stats.todaySales, goal: goals.dailySales, fmt: true },
        { label: 'Venta mensual', actual: stats.monthSales, goal: goals.monthlySales, fmt: true },
        { label: 'Pedidos diarios', actual: stats.todayOrders, goal: goals.dailyOrders, fmt: false },
        { label: 'Pedidos mensuales', actual: stats.monthOrders, goal: goals.monthlyOrders, fmt: false },
        { label: 'Margen objetivo', actual: stats.monthMargin, goal: goals.targetMargin, fmt: false, suffix: '%' },
        { label: 'Ticket promedio', actual: stats.monthAvgTicket, goal: goals.avgTicket, fmt: true },
      ]
    : [];

  const growthPeriodCls =
    period.growthPct > 0 ? 'text-emerald-600' : period.growthPct < 0 ? 'text-red-600' : 'text-muted';
  const growthPeriodTxt =
    period.growthPct > 0
      ? `▲ ${period.growthPct}%`
      : period.growthPct < 0
        ? `▼ ${Math.abs(period.growthPct)}%`
        : '• 0%';
  const deltaTxt = `${period.delta >= 0 ? '+' : ''}${formatPrice(period.delta)}`;
  const deltaCls = period.delta >= 0 ? 'text-emerald-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setRange(k)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${range === k ? 'bg-ink text-paper' : 'border border-line bg-paper text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="relative rounded-3xl border border-line bg-paper p-6">
            <c.Icon className="absolute right-5 top-5 h-5 w-5 text-accent/70" />
            <p className="pr-10 text-xs font-semibold uppercase tracking-widest text-muted">{c.label}</p>
            <p className="mt-2 font-display text-3xl uppercase">
              {c.raw !== undefined && c.fmt ? <CountUp value={c.raw} format={c.fmt} /> : c.value}
            </p>
            <p className="mt-1 text-xs text-muted">{c.sub}</p>
            {c.spark && c.spark.length > 1 ? (
              <div className="mt-2">
                <Spark data={c.spark} />
              </div>
            ) : null}
            <p className={`mt-1 text-[11px] font-semibold ${c.extraCls}`}>{c.extra}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-accent/40 bg-accent/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Ventas del período</p>
          <span className="text-[11px] text-muted">
            {period.windowLabel}
            {period.prevLabel ? ` · vs ${period.prevLabel}` : ''}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <p className="font-display text-3xl uppercase">{report ? formatPrice(report.totalSales) : '—'}</p>
          {loading ? (
            <span className="text-sm text-muted">Cargando…</span>
          ) : report ? (
            <span className={`text-sm font-bold ${growthPeriodCls}`}>{growthPeriodTxt}</span>
          ) : null}
        </div>
        {report ? (
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted">Variación vs período anterior</p>
              <p className={`font-display text-xl uppercase ${deltaCls}`}>{deltaTxt}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Órdenes</p>
              <p className="font-display text-xl uppercase">{report.orderCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Ticket promedio</p>
              <p className="font-display text-xl uppercase">{formatPrice(report.avgTicket)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Utilidad · margen</p>
              <p className="font-display text-xl uppercase">
                {formatPrice(report.totalProfit)} · {report.margin}%
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Sin datos del período.</p>
        )}
      </div>

      {inventory && (
        <div className="rounded-3xl border border-accent/40 bg-accent/5 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Capital en inventario</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted">Invertido (costo)</p>
              <p className="mt-1 font-display text-2xl uppercase">{formatPrice(inventory.totalCost)}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Valor a precio venta</p>
              <p className="mt-1 font-display text-2xl uppercase">{formatPrice(inventory.totalRetail)}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Utilidad potencial</p>
              <p className="mt-1 font-display text-2xl uppercase text-emerald-600">{formatPrice(inventory.potentialProfit)}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Unidades</p>
              <p className="mt-1 font-display text-2xl uppercase">{inventory.totalItems}</p>
              <p className="mt-1 text-[11px] text-muted">Margen promedio {inventory.avgMargin}%</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-line bg-paper p-6">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg uppercase">Metas de ventas</p>
            <button onClick={() => setShowGoals(true)} className="btn-outline px-3 py-1.5 text-[11px]">
              Editar metas
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {goalBars.map((g) => {
              const pct = progressPct(g.actual, g.goal);
              const done = pct >= 100;
              return (
                <div key={g.label}>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">{g.label}</span>
                    <span className="text-muted">
                      {g.fmt ? formatPrice(g.actual) : g.actual}
                      {g.suffix || ''} / {g.fmt ? formatPrice(g.goal) : g.goal}
                      {g.suffix || ''} · <b className={done ? 'text-emerald-600' : ''}>{pct}%</b>
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-soft">
                    <div
                      className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-accent'}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-paper p-6">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg uppercase">{TREND_LABEL[range]}</p>
            <span className="text-[11px] text-muted">verde = ventas · naranja = utilidad</span>
          </div>
          {trendDaily.length > 0 ? (
            <div className="mt-4">
              <SalesArea data={trendDaily} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">Sin ventas en el período.</p>
          )}
          <p className="mt-4 font-display text-sm uppercase">Top 5 productos</p>
          {trendTop.length > 0 ? (
            <div className="mt-2">
              <TopBars items={trendTop} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Sin datos aún.</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-line bg-paper p-6">
          <p className="font-display text-lg uppercase">Ventas por hora</p>
          {!report ? (
            <p className="mt-4 text-sm text-muted">{loading ? 'Cargando…' : 'Sin datos del período.'}</p>
          ) : (
            <>
              <div className="mt-4">
                <HourBars data={byHour} peakHour={peakHour.hour} />
              </div>
              {peakHour.total > 0 ? (
                <p className="mt-2 text-xs text-muted">
                  Pico: <b className="text-accent">{peakHour.hour}:00</b> · {formatPrice(peakHour.total)}
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted">Sin ventas en el período.</p>
              )}
            </>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-line bg-paper p-6">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg uppercase">Stock bajo</p>
            {lowStock.length > 0 && (
              <span className="chip">{lowStock.length}{lowStock.length > 10 ? '+' : ''} alertas</span>
            )}
          </div>
          {lowStock.length === 0 ? (
            <p className="mt-4 text-sm text-emerald-600">Todo en stock.</p>
          ) : (
            <>
              <div className="mt-4 space-y-2">
                {lowStock.slice(0, 10).map((it) => {
                  const lvl = stockLevel(it.stock, it.alert);
                  return (
                    <div
                      key={`${it.sku}-${it.variantName || ''}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-line/60 px-4 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{it.name}</p>
                        {it.variantName && <p className="text-[11px] text-muted">{it.variantName}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${lvl.cls}`}>
                          {lvl.label}
                        </span>
                        <span className="font-semibold">
                          {it.stock} / {it.alert}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {lowStock.length > 10 && (
                <p className="mt-3 text-xs text-muted">+{lowStock.length - 10} productos más con stock bajo.</p>
              )}
            </>
          )}
          </div>

          <LowStockBySupplier token={token} />
        </div>

      </div>

      <div className="rounded-3xl border border-line bg-paper p-6">
        <p className="font-display text-lg uppercase">Top clientes</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="chip">{customerData.counts.recurrentes} recurrentes</span>
          <span className="chip">{customerData.counts.nuevos} nuevos</span>
          <span className="chip">{customerData.counts.dormidos} dormidos</span>
          <span className="chip">{customerData.counts.vip} VIP</span>
        </div>
        {customerData.top.length > 0 ? (
          <div className="mt-4 space-y-2">
            {customerData.top.map((c, i) => (
              <div key={`${c.name}-${i}`} className="flex items-center justify-between text-sm">
                <span className="text-muted">{i + 1}. {c.name}</span>
                <span className="font-semibold">{formatPrice(c.spent)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">Sin clientes aún.</p>
        )}
      </div>

      {showGoals && <GoalEditor goals={goals} token={token} onClose={() => setShowGoals(false)} onSaved={onChanged} />}
    </div>
  );
}