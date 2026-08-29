'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { progressPct } from '@/lib/admin/format';
import type { AdminStats, AdminGoals, AdminInventoryValue } from '@/types/admin';
import { Bars7 } from './Bars7';
import { GoalEditor } from './GoalEditor';

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
  if (!stats) return null;

  const growth = stats.salesGrowth;
  const growthTxt =
    stats.todaySales === 0 && stats.salesGrowth === 0
      ? 'sin ventas aún'
      : `${growth > 0 ? '▲' : growth < 0 ? '▼' : '•'} ${Math.abs(growth)}% vs ayer`;

  const cards = [
    {
      label: 'Ventas hoy',
      value: formatPrice(stats.todaySales),
      sub: `${stats.todayOrders} órdenes · ticket ${formatPrice(stats.avgTicket)}`,
      extra: growthTxt,
    },
    {
      label: 'Ventas del mes',
      value: formatPrice(stats.monthSales),
      sub: `${stats.monthOrders} órdenes · ticket ${formatPrice(stats.monthAvgTicket)}`,
      extra: `Utilidad ${formatPrice(stats.monthProfit)} · margen ${stats.monthMargin}%`,
    },
    {
      label: 'Órdenes pendientes',
      value: String(stats.pendingOrders),
      sub: `${stats.totalOrders} totales`,
      extra: `Utilidad hoy ${formatPrice(stats.todayProfit)}`,
    },
    {
      label: 'Clientes',
      value: String(stats.totalCustomers),
      sub: 'registrados',
      extra: `Margen hoy ${stats.todayMargin}%`,
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-3xl border border-line bg-paper p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">{c.label}</p>
            <p className="mt-2 font-display text-3xl uppercase">{c.value}</p>
            <p className="mt-1 text-xs text-muted">{c.sub}</p>
            <p className="mt-1 text-[11px] font-semibold text-accent">{c.extra}</p>
          </div>
        ))}
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
          <p className="font-display text-lg uppercase">Últimos 7 días</p>
          {stats.salesByDay.length > 0 ? (
            <div className="mt-4">
              <Bars7 data={stats.salesByDay} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">Sin ventas en los últimos 7 días.</p>
          )}
          <p className="mt-4 font-display text-sm uppercase">Top 5 productos</p>
          {stats.topProducts.length > 0 ? (
            <div className="mt-2 space-y-2">
              {stats.topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{i + 1}. {p.name}</span>
                  <span className="font-semibold">
                    {p.quantity} uds · {formatPrice(p.revenue)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Sin datos aún.</p>
          )}
        </div>
      </div>

      {showGoals && <GoalEditor goals={goals} token={token} onClose={() => setShowGoals(false)} onSaved={onChanged} />}
    </div>
  );
}