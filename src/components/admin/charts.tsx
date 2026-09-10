'use client';

import { useEffect, useId, useState } from 'react';
import { animate, motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPrice } from '@/lib/utils';

export const CHART_GREEN = '#5DD62C';
export const CHART_ORANGE = '#F97316';
export const CHART_MUTED = '#CBD5E1';
export const CHART_BLUE = '#38BDF8';
export const CHART_VIOLET = '#A78BFA';
export const CHART_PINK = '#F472B6';
export const CHART_YELLOW = '#FACC15';

export const CHART_PALETTE = [CHART_GREEN, CHART_ORANGE, CHART_BLUE, CHART_VIOLET, CHART_PINK, CHART_YELLOW];

/* ── Número animado (count-up) ─────────────────────────────── */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.9,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value]);
  return <>{format(Math.round(display))}</>;
}

/* ── Sparkline mini ────────────────────────────────────────── */
export function Spark({ data, color = CHART_GREEN }: { data: number[]; color?: string }) {
  const gid = useId();
  const points = data.map((v, i) => ({ i, v }));
  if (points.length < 2) return null;
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${gid})`} isAnimationActive />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MoneyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-paper px-3 py-2 text-xs shadow-lg">
      <p className="font-bold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="mt-0.5 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke }} />
          {p.name}: <b>{formatPrice(p.value)}</b>
        </p>
      ))}
    </div>
  );
}

/* ── Área ventas vs utilidad ───────────────────────────────── */
export function SalesArea({ data }: { data: { date: string; total: number; profit: number }[] }) {
  const gid = useId();
  const rows = data.map((d) => ({ ...d, label: d.date.slice(5) }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`${gid}-v`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_GREEN} stopOpacity={0.4} />
              <stop offset="100%" stopColor={CHART_GREEN} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={`${gid}-u`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_ORANGE} stopOpacity={0.3} />
              <stop offset="100%" stopColor={CHART_ORANGE} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} minTickGap={24} />
          <YAxis
            width={64}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
          />
          <Tooltip content={<MoneyTooltip />} />
          <Area type="monotone" dataKey="total" name="Ventas" stroke={CHART_GREEN} strokeWidth={2.5} fill={`url(#${gid}-v)`} />
          <Area type="monotone" dataKey="profit" name="Utilidad" stroke={CHART_ORANGE} strokeWidth={2} fill={`url(#${gid}-u)`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Dona métodos de pago ──────────────────────────────────── */
export function PayDonut({ data, colors = CHART_PALETTE }: { data: { label: string; total: number }[]; colors?: string[] }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  if (!total) return <p className="text-sm text-muted">Sin ventas.</p>;
  return (
    <div className="relative h-44 w-44 flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<MoneyTooltip label="" />} />
          <Pie data={data} dataKey="total" nameKey="label" innerRadius="64%" outerRadius="92%" paddingAngle={3} strokeWidth={0}>
            {data.map((d, i) => (
              <Cell key={d.label} fill={colors[i % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-xl uppercase">{formatPrice(total)}</p>
        <p className="text-[11px] text-muted">total</p>
      </div>
    </div>
  );
}

/* ── Barras por hora (pico destacado) ───────────────────────── */
export function HourBars({ data, peakHour }: { data: { hour: number; total: number }[]; peakHour: number }) {
  const rows = data.map((h) => ({ ...h, label: `${h.hour}:00` }));
  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="25%">
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748B' }} interval={5} />
          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-xl border border-line bg-paper px-3 py-2 text-xs shadow-lg">
                  <p className="font-bold">{payload[0].payload.label}</p>
                  <p className="mt-0.5">{formatPrice(payload[0].value)}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            {rows.map((r) => (
              <Cell key={r.hour} fill={r.hour === peakHour && r.total > 0 ? CHART_GREEN : '#D9F5C9'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Barras horizontales animadas (top productos) ───────────── */
export function TopBars({ items }: { items: { label: string; sub: string; value: number; max: number }[] }) {
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={it.label}>
          <div className="flex justify-between text-xs">
            <span className="font-semibold">
              <span className="text-muted">{i + 1}. </span>
              {it.label}
            </span>
            <span className="text-muted">{it.sub}</span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-soft">
            <motion.div
              className="h-full rounded-full"
              style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max((it.value / Math.max(it.max, 1)) * 100, 2)}%` }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.06 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
