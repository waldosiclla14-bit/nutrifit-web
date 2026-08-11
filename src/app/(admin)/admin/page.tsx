'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Boxes,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Pencil,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { apiFetch, clearSessionCookie, clearToken, getToken } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

type ApiOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  total: number;
  subtotal: number;
  discount: number;
  shippingCost: number;
  deliveryType?: string;
  metroLine?: string;
  metroStation?: string;
  deliveryDay?: string;
  deliveryTime?: string;
  createdAt: string;
  customer?: { id: string; name: string; phone: string } | null;
  items?: {
    id: string;
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
};

type Variant = {
  id: string;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
  stock: number;
  lowStockAlert: number | null;
  active: boolean;
};

type ApiProduct = {
  id: string;
  name: string;
  brand?: string;
  brandName?: string;
  sku?: string;
  price: number;
  costPrice: number;
  stock?: number;
  active: boolean;
  comparePrice?: number | null;
  description?: string | null;
  registroIsp?: string | null;
  category?: { id: string; name: string } | null;
  variants?: Variant[];
};

type ApiCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  totalSpent: number;
  totalOrders: number;
  createdAt: string;
  lastOrderAt?: string | null;
  isVip?: boolean;
};

type Stats = {
  todaySales: number;
  todayOrders: number;
  todayProfit: number;
  todayMargin: number;
  monthSales: number;
  monthOrders: number;
  monthProfit: number;
  monthMargin: number;
  salesGrowth: number;
  avgTicket: number;
  monthAvgTicket: number;
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  salesByDay: { date: string; total: number; profit: number; orders: number }[];
};

type Goals = {
  dailySales: number;
  monthlySales: number;
  dailyOrders: number;
  monthlyOrders: number;
  targetMargin: number;
  avgTicket: number;
};

type Report = {
  from: string;
  to: string;
  totalSales: number;
  totalProfit: number;
  margin: number;
  orderCount: number;
  avgTicket: number;
  methods: { method: string; total: number; count: number }[];
  categories: { product: string; quantity: number; total: number; profit: number }[];
  orders: {
    orderNumber: string;
    customerName: string;
    createdAt: string;
    paymentMethod: string | null;
    subtotal: number;
    discount: number;
    shippingCost: number;
    total: number;
    profit: number;
    margin: number;
  }[];
};

type CashRegister = {
  id: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  initialAmount: number;
  finalAmount: number | null;
  expectedAmount: number | null;
  diff: number | null;
  openedBy?: { name: string } | null;
};

type InventoryValue = {
  totalCost: number;
  totalRetail: number;
  totalItems: number;
  potentialProfit: number;
  avgMargin: number;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Nuevo',
  CONFIRMED: 'Confirmado',
  PAID: 'Pagado',
  PREPARING: 'Preparando',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  RETURNED: 'Devuelto',
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'border-amber-300 bg-amber-100 text-amber-800',
  CONFIRMED: 'border-sky-300 bg-sky-100 text-sky-800',
  PAID: 'border-emerald-300 bg-emerald-100 text-emerald-800',
  PREPARING: 'border-violet-300 bg-violet-100 text-violet-800',
  READY: 'border-teal-300 bg-teal-100 text-teal-800',
  DELIVERED: 'border-line bg-soft text-muted',
  CANCELLED: 'border-red-300 bg-red-100 text-red-800',
  RETURNED: 'border-red-300 bg-red-100 text-red-800',
};

const PAYMENT_LABEL: Record<string, string> = {
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  FLOW_MANUAL: 'Flow',
  MERCADOPAGO_MANUAL: 'Mercado Pago',
  TARJETA_MANUAL: 'Tarjeta',
  MIXTO: 'Mixto',
};

const CHART_COLORS = ['#16a34a', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

function waLink(order: ApiOrder) {
  const phone = (order.customer?.phone || '').replace(/\D/g, '');
  const msg = encodeURIComponent(
    `Hola ${order.customer?.name || ''}! Tu pedido ${order.orderNumber} está ${
      STATUS_LABEL[order.status] || order.status
    }. Respondeme para coordinar la entrega.`,
  );
  return `https://wa.me/56${phone}?text=${msg}`;
}

function marginOf(price: number, cost: number) {
  if (!price || price <= 0) return 0;
  return Math.round(((price - cost) / price) * 100);
}

function stockLevel(stock: number, alert: number | null) {
  if (stock <= 0) return { label: 'agotado', cls: 'border-red-300 text-red-600' };
  if (stock <= (alert ?? 0)) return { label: 'bajo', cls: 'border-amber-300 text-amber-700' };
  return { label: 'ok', cls: 'border-emerald-300 text-emerald-700' };
}

function progressPct(actual: number, goal: number) {
  if (!goal || goal <= 0) return 0;
  return Math.min(100, Math.round((actual / goal) * 100));
}

function exportCSV(orders: Report['orders']) {
  const rows = [
    ['Pedido', 'Cliente', 'Fecha', 'Método', 'Subtotal', 'Descuento', 'Envío', 'Total', 'Utilidad', 'Margen%'],
    ...orders.map((o) => [
      o.orderNumber,
      o.customerName,
      new Date(o.createdAt).toLocaleString('es-CL'),
      o.paymentMethod || '',
      String(o.subtotal),
      String(o.discount),
      String(o.shippingCost),
      String(o.total),
      String(o.profit),
      String(o.margin),
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reporte-ventas.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);
  const [tab, setTab] = useState<'resumen' | 'ordenes' | 'productos' | 'clientes' | 'caja' | 'reportes'>('resumen');

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace('/login?next=/admin');
      return;
    }
    setTokenState(t);
  }, [router]);

  if (!token) return null;
  return (
    <Dashboard
      token={token}
      tab={tab}
      setTab={setTab}
      onLogout={() => {
        clearToken();
        clearSessionCookie();
        router.replace('/login?next=/admin');
      }}
    />
  );
}

function Dashboard({
  token,
  tab,
  setTab,
  onLogout,
}: {
  token: string;
  tab: string;
  setTab: (t: any) => void;
  onLogout: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [cash, setCash] = useState<CashRegister | null>(null);
  const [inventory, setInventory] = useState<InventoryValue | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, o, p, c, cr, g, iv] = await Promise.all([
        apiFetch<Stats>('/orders/stats', { token }),
        apiFetch<ApiOrder[]>('/orders', { token }),
        apiFetch<any[]>('/products', { token }),
        apiFetch<ApiCustomer[]>('/customers', { token }),
        apiFetch<any | null>('/cash-register/current', { token }),
        apiFetch<Goals>('/config/goals', { token }),
        apiFetch<InventoryValue>('/products/inventory-value', { token }).catch(() => null),
      ]);
      setStats(s);
      setOrders(o);
      setProducts(
        (p || []).map((x) => ({
          id: x.id,
          name: x.name,
          sku: x.sku,
          brand: x.brand ? x.brand.name : undefined,
          brandName: x.brand ? x.brand.name : undefined,
          price: x.basePrice ?? x.price,
          costPrice: x.costPrice ?? 0,
          active: x.isActive !== false,
          comparePrice: x.comparePrice,
          description: x.description,
          registroIsp: x.registroIsp || null,
          category: x.category ? { id: x.category.id, name: x.category.name } : null,
          variants: (x.variants || []).map((v: any) => ({
            id: v.id,
            name: v.variantName || v.name || 'Sin variante',
            sku: v.sku,
            price: v.price,
            costPrice: (v.costPrice || 0) || (x.costPrice || 0),
            stock: v.stock,
            lowStockAlert: v.lowStockAlert,
            active: v.isActive !== false,
          })),
        })),
      );
      setCustomers(c);
      setCash(
        cr
          ? {
              id: cr.id,
              status: cr.isOpen ? 'OPEN' : 'CLOSED',
              openedAt: cr.openedAt,
              closedAt: cr.closedAt,
              initialAmount: cr.initialAmount,
              finalAmount: cr.finalAmount,
              expectedAmount: cr.expectedAmount,
              diff: cr.difference,
              openedBy: cr.openedBy,
            }
          : null,
      );
      setGoals(g);
      setInventory(iv);
    } catch (err: any) {
      alert(err?.message || 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<any>, id: string) => {
    setBusyId(id);
    try {
      await fn();
      await load();
    } catch (err: any) {
      alert(err?.message || 'Error en la operación.');
    } finally {
      setBusyId(null);
    }
  };

  const tabs = [
    { key: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { key: 'ordenes', label: 'Órdenes', icon: ShoppingBag },
    { key: 'productos', label: 'Productos', icon: Boxes },
    { key: 'clientes', label: 'Clientes', icon: Users },
    { key: 'caja', label: 'Caja', icon: Wallet },
    { key: 'reportes', label: 'Reportes', icon: BarChart3 },
  ];

  return (
    <div className="container-px py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">NUTRIFIT ADMIN</p>
          <h1 className="mt-1 font-display text-2xl uppercase tracking-wide">Gestión de la tienda</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-outline px-4 py-2 text-xs" title="Actualizar">
            <RefreshCw size={14} /> Actualizar
          </button>
          <button onClick={() => setShowPassword(true)} className="btn-outline px-4 py-2 text-xs" title="Cambiar contraseña">
            <KeyRound size={14} /> Contraseña
          </button>
          <button onClick={onLogout} className="btn-outline px-4 py-2 text-xs">
            <LogOut size={14} /> Salir
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                active ? 'bg-ink text-paper' : 'border border-line bg-paper text-muted hover:text-ink'
              }`}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {loading && <p className="py-10 text-center text-sm text-muted">Cargando…</p>}
        {!loading && tab === 'resumen' && <Resumen stats={stats} goals={goals} inventory={inventory} token={token} onChanged={load} />}
        {!loading && tab === 'ordenes' && <Ordenes orders={orders} token={token} busyId={busyId} act={act} />}
        {!loading && tab === 'productos' && <Productos products={products} token={token} onChanged={load} />}
        {!loading && tab === 'clientes' && <Clientes customers={customers} token={token} onChanged={load} />}
        {!loading && tab === 'caja' && <Caja cash={cash} token={token} onChanged={load} />}
        {!loading && tab === 'reportes' && <Reportes token={token} />}
      </div>

      {showPassword && (
        <PasswordModal token={token} onClose={() => setShowPassword(false)} onChanged={() => {}} />
      )}
    </div>
  );
}

function PasswordModal({
  token,
  onClose,
  onChanged,
}: {
  token: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const save = async () => {
    setError('');
    setOk(false);
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        token,
        body: { currentPassword, newPassword },
      });
      setOk(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      onChanged();
    } catch (err: any) {
      setError(err?.message || 'Error al cambiar la contraseña.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-line bg-paper p-6" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-xl uppercase">Cambiar contraseña</p>
        <p className="mt-1 text-sm text-muted">Actualiza la contraseña de tu cuenta.</p>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-muted">Contraseña actual</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input mt-1"
              autoComplete="current-password"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted">Nueva contraseña</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input mt-1"
              autoComplete="new-password"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted">Confirmar nueva contraseña</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input mt-1"
              autoComplete="new-password"
            />
          </label>
        </div>
        {error && <p className="mt-3 text-xs font-semibold text-red-500">{error}</p>}
        {ok && <p className="mt-3 text-xs font-semibold text-emerald-600">Contraseña actualizada correctamente.</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline px-4 py-2 text-xs">
            Cerrar
          </button>
          <button onClick={save} disabled={saving} className="btn-accent px-4 py-2 text-xs disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Resumen({
  stats,
  goals,
  inventory,
  token,
  onChanged,
}: {
  stats: Stats | null;
  goals: Goals | null;
  inventory: InventoryValue | null;
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

function Bars7({ data }: { data: { date: string; total: number; profit: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex h-36 items-end gap-2">
      {data.map((d) => (
        <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <div className="w-full rounded-t-md bg-accent/70" style={{ height: `${Math.max((d.total / max) * 100, 3)}%` }} title={formatPrice(d.total)} />
          <span className="text-[10px] text-muted">{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

function GoalEditor({
  goals,
  token,
  onClose,
  onSaved,
}: {
  goals: Goals | null;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Goals>(
    goals || { dailySales: 200000, monthlySales: 5000000, dailyOrders: 10, monthlyOrders: 200, targetMargin: 35, avgTicket: 25000 },
  );
  const [saving, setSaving] = useState(false);

  const set = (k: keyof Goals, v: string) => setForm((f) => ({ ...f, [k]: Number(v) || 0 }));

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/config/goals', { method: 'PUT', token, body: form });
      onSaved();
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Error al guardar metas.');
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof Goals; label: string }[] = [
    { key: 'dailySales', label: 'Venta diaria ($)' },
    { key: 'monthlySales', label: 'Venta mensual ($)' },
    { key: 'dailyOrders', label: 'Pedidos diarios' },
    { key: 'monthlyOrders', label: 'Pedidos mensuales' },
    { key: 'targetMargin', label: 'Margen objetivo (%)' },
    { key: 'avgTicket', label: 'Ticket promedio ($)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-line bg-paper p-6" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-xl uppercase">Editar metas</p>
        <div className="mt-4 space-y-3">
          {fields.map((f) => (
            <label key={f.key} className="block">
              <span className="text-xs font-semibold text-muted">{f.label}</span>
              <input
                type="number"
                value={form[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                className="input mt-1"
              />
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline px-4 py-2 text-xs">
            Cancelar
          </button>
          <button onClick={save} disabled={saving} className="btn-accent px-4 py-2 text-xs disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar metas'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Ordenes({
  orders,
  token,
  busyId,
  act,
}: {
  orders: ApiOrder[];
  token: string;
  busyId: string | null;
  act: (fn: () => Promise<any>, id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${o.orderNumber} ${o.customer?.name || ''} ${o.customer?.phone || ''} ${o.metroStation || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [orders, query, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;
    return counts;
  }, [orders]);

  const statusOptions = Object.keys(STATUS_LABEL);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nº de pedido, cliente, teléfono o estación…"
          className="input max-w-md"
        />
        <button
          onClick={() => setStatusFilter('')}
          className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${statusFilter === '' ? 'bg-ink text-paper' : 'border border-line bg-paper text-muted'}`}
        >
          Todos
        </button>
        {statusOptions.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${statusFilter === s ? 'bg-ink text-paper' : 'border border-line bg-paper text-muted'}`}
          >
            {STATUS_LABEL[s]} · {statusCounts[s] || 0}
          </button>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-paper">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-widest text-muted">
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Entrega</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-bold text-ink">{o.orderNumber}</p>
                  <p className="text-[11px] text-muted">{new Date(o.createdAt).toLocaleString('es-CL')}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{o.customer?.name || '—'}</p>
                  <p className="text-[11px] text-muted">{o.customer?.phone || ''}</p>
                </td>
                <td className="px-4 py-3 text-xs">
                  {o.deliveryType === 'METRO' ? (
                    <>
                      <p>Metro {o.metroLine}</p>
                      <p className="text-muted">{o.metroStation}</p>
                      {o.deliveryDay && <p className="text-muted">Día: {o.deliveryDay}</p>}
                      {o.deliveryTime && <p className="text-muted">Hora: {o.deliveryTime}</p>}
                    </>
                  ) : (
                    <span className="text-muted">Retiro tienda</span>
                  )}
                </td>
                <td className="px-4 py-3 font-bold">{formatPrice(o.total)}</td>
                <td className="px-4 py-3 text-xs">
                  <p>{PAYMENT_LABEL[o.paymentMethod || ''] || '—'}</p>
                  <p className="text-muted">{o.paymentStatus === 'CONFIRMED' ? 'Pagado' : 'Pendiente'}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[o.status] || 'border-line bg-soft text-muted'}`}>
                    {STATUS_LABEL[o.status] || o.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {o.status === 'PENDING' && (
                      <button
                        disabled={busyId === o.id}
                        onClick={() => act(() => apiFetch(`/orders/${o.id}/status`, { method: 'PATCH', token, body: { status: 'CONFIRMED' } }), o.id)}
                        className="rounded-full bg-ink px-3 py-1.5 text-[11px] font-bold text-paper disabled:opacity-50"
                      >
                        Confirmar
                      </button>
                    )}
                    {o.status === 'CONFIRMED' && (
                      <button
                        disabled={busyId === o.id}
                        onClick={() =>
                          act(() => apiFetch(`/orders/${o.id}/payment`, { method: 'PATCH', token, body: { paymentMethod: o.paymentMethod || 'TRANSFERENCIA' } }), o.id)
                        }
                        className="rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold text-ink disabled:opacity-50"
                      >
                        Marcar pagado
                      </button>
                    )}
                    {o.status === 'PAID' && (
                      <button
                        disabled={busyId === o.id}
                        onClick={() => act(() => apiFetch(`/orders/${o.id}/status`, { method: 'PATCH', token, body: { status: 'DELIVERED' } }), o.id)}
                        className="rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                      >
                        Entregado
                      </button>
                    )}
                    {!['CANCELLED', 'DELIVERED', 'RETURNED'].includes(o.status) && (
                      <button
                        disabled={busyId === o.id}
                        onClick={() => act(() => apiFetch(`/orders/${o.id}/status`, { method: 'PATCH', token, body: { status: 'CANCELLED' } }), o.id)}
                        className="rounded-full border border-red-300 px-3 py-1.5 text-[11px] font-bold text-red-700 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    )}
                    {!['PAID', 'DELIVERED'].includes(o.status) && (
                      <button
                        disabled={busyId === o.id}
                        onClick={() => {
                          if (!window.confirm(`¿Eliminar permanentemente la orden ${o.orderNumber}?`)) return;
                          act(() => apiFetch(`/orders/${o.id}`, { method: 'DELETE', token }), o.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1.5 text-[11px] font-bold text-red-700 disabled:opacity-50"
                      >
                        <Trash2 size={12} /> Eliminar
                      </button>
                    )}
                    {o.customer?.phone && (
                      <a
                        href={waLink(o)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px] font-bold text-ink"
                      >
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  Sin órdenes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type EditProductForm = {
  name: string;
  sku: string;
  category: string;
  brand: string;
  basePrice: string;
  costPrice: string;
  comparePrice: string;
  description: string;
  registroIsp: string;
  reason: string;
  variants: {
    id?: string;
    variantName: string;
    sku: string;
    price: string;
    costPrice: string;
    stock: string;
    lowStockAlert: string;
  }[];
};

function Productos({
  products,
  token,
  onChanged,
}: {
  products: ApiProduct[];
  token: string;
  onChanged: () => void;
}) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [costEdits, setCostEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<ApiProduct | null>(null);
  const [editForm, setEditForm] = useState<EditProductForm | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', sku: '', basePrice: '', costPrice: '', comparePrice: '', category: '', brand: '', description: '', registroIsp: '' });
  const [formVariants, setFormVariants] = useState([
    { variantName: '', sku: '', price: '', costPrice: '', stock: '', lowStockAlert: '5' },
  ]);

  const save = async (p: ApiProduct, v: Variant, current: number) => {
    setSaving(v.id);
    try {
      const stockRaw = edits[v.id];
      if (stockRaw !== undefined) {
        const next = Number(stockRaw);
        if (!Number.isNaN(next) && next >= 0 && next !== current) {
          await apiFetch(`/products/${v.id}/stock`, { method: 'PATCH', token, body: { quantity: next - current } });
        }
      }
      const priceRaw = priceEdits[v.id];
      if (priceRaw !== undefined) {
        const next = Number(priceRaw);
        if (!Number.isNaN(next) && next >= 0 && next !== v.price) {
          await apiFetch(`/products/${v.id}/price`, { method: 'PATCH', token, body: { price: next } });
        }
      }
      const costRaw = costEdits[v.id];
      if (costRaw !== undefined) {
        const next = Number(costRaw);
        if (!Number.isNaN(next) && next >= 0 && next !== v.costPrice) {
          await apiFetch(`/products/${p.id}`, { method: 'PATCH', token, body: { variants: [{ id: v.id, costPrice: next }] } });
        }
      }
      await onChanged();
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar.');
    } finally {
      setSaving(null);
    }
  };

  const setVariant = (i: number, field: string, value: string) =>
    setFormVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)));

  const create = async () => {
    if (!form.name.trim()) {
      alert('El nombre del producto es obligatorio.');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/products', {
        method: 'POST',
        token,
        body: {
          name: form.name,
          sku: form.sku,
          basePrice: Number(form.basePrice) || undefined,
          costPrice: Number(form.costPrice) || undefined,
          comparePrice: Number(form.comparePrice) || undefined,
          category: form.category,
          brand: form.brand,
          description: form.description,
          registroIsp: form.registroIsp,
          variants: formVariants
            .filter((v) => v.variantName.trim() || v.sku.trim())
            .map((v) => ({
              variantName: v.variantName,
              sku: v.sku,
              price: Number(v.price) || undefined,
              costPrice: Number(v.costPrice) || undefined,
              stock: Number(v.stock) || 0,
              lowStockAlert: Number(v.lowStockAlert) || 5,
            })),
        },
      });
      setShowForm(false);
      setForm({ name: '', sku: '', basePrice: '', costPrice: '', comparePrice: '', category: '', brand: '', description: '', registroIsp: '' });
      setFormVariants([{ variantName: '', sku: '', price: '', costPrice: '', stock: '', lowStockAlert: '5' }]);
      await onChanged();
    } catch (err: any) {
      alert(err?.message || 'Error al crear el producto.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (p: ApiProduct) => {
    setEditing(p);
    setEditForm({
      name: p.name,
      sku: p.sku || '',
      category: p.category?.name || '',
      brand: p.brand || '',
      basePrice: String(p.price ?? ''),
      costPrice: String(p.costPrice ?? 0),
      comparePrice: String(p.comparePrice ?? ''),
      description: p.description || '',
      registroIsp: p.registroIsp || '',
      reason: '',
      variants: (p.variants || []).map((v) => ({
        id: v.id,
        variantName: v.name,
        sku: v.sku,
        price: String(v.price ?? ''),
        costPrice: String(v.costPrice ?? 0),
        stock: String(v.stock ?? 0),
        lowStockAlert: String(v.lowStockAlert ?? 5),
      })),
    });
  };

  const setEditVariant = (i: number, field: string, value: string) =>
    setEditForm((f) =>
      f
        ? {
            ...f,
            variants: f.variants.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)),
          }
        : f,
    );

  const saveEdit = async () => {
    if (!editing || !editForm) return;
    if (!editForm.name.trim()) {
      alert('El nombre del producto es obligatorio.');
      return;
    }
    const stockChanges = editForm.variants
      .map((v) => ({ id: v.id, old: (editing.variants || []).find((x) => x.id === v.id)?.stock ?? 0, next: Number(v.stock) || 0 }))
      .filter((s) => s.id && s.next !== s.old);

    setSubmitting(true);
    try {
      await apiFetch(`/products/${editing.id}`, {
        method: 'PATCH',
        token,
        body: {
          name: editForm.name,
          sku: editForm.sku,
          category: editForm.category,
          brand: editForm.brand,
          basePrice: Number(editForm.basePrice) || undefined,
          costPrice: Number(editForm.costPrice) || undefined,
          comparePrice: Number(editForm.comparePrice) || undefined,
          description: editForm.description,
          registroIsp: editForm.registroIsp,
          variants: editForm.variants.map((v) => ({
            id: v.id,
            variantName: v.variantName,
            sku: v.sku,
            price: Number(v.price) || undefined,
            costPrice: Number(v.costPrice) || undefined,
            lowStockAlert: Number(v.lowStockAlert) || 5,
          })),
        },
      });

      if (stockChanges.length > 0) {
        if (!editForm.reason.trim()) {
          alert('Los cambios de stock necesitan un motivo (campo "Motivo de ajuste de stock").');
          setSubmitting(false);
          return;
        }
        for (const sc of stockChanges) {
          await apiFetch(`/products/${sc.id}/adjust-stock`, {
            method: 'PATCH',
            token,
            body: { newStock: sc.next, reason: editForm.reason },
          });
        }
      }

      setEditing(null);
      setEditForm(null);
      await onChanged();
    } catch (err: any) {
      alert(err?.message || 'Error al guardar el producto.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (p: ApiProduct) => {
    if (!window.confirm(`¿Desactivar el producto "${p.name}"? No se eliminará del historial de ventas.`)) return;
    setDeleting(p.id);
    try {
      await apiFetch(`/products/${p.id}`, { method: 'DELETE', token });
      await onChanged();
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar el producto.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">{products.length} producto(s)</p>
        <button onClick={() => setShowForm((s) => !s)} className="btn-accent px-4 py-2 text-xs">
          {showForm ? 'Cancelar' : '+ Nuevo producto'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-3xl border border-line bg-paper p-6">
          <p className="font-display text-lg uppercase">Nuevo producto</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nombre *" className="input md:col-span-2" />
            <input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="SKU (opcional)" className="input" />
            <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Categoría (ej: Whey Protein)" className="input" />
            <input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Marca (ej: FullEnergic)" className="input" />
            <input value={form.basePrice} onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} placeholder="Precio base" type="number" className="input" />
            <input value={form.costPrice} onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))} placeholder="Costo (para margen)" type="number" className="input" />
            <input value={form.comparePrice} onChange={(e) => setForm((f) => ({ ...f, comparePrice: e.target.value }))} placeholder="Precio tachado (opcional)" type="number" className="input" />
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descripción (opcional)" className="input md:col-span-2" rows={2} />
            <input value={form.registroIsp} onChange={(e) => setForm((f) => ({ ...f, registroIsp: e.target.value }))} placeholder="Registro ISP N° (opcional)" className="input" />
          </div>

          <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-muted">Variantes</p>
          <div className="mt-2 space-y-2">
            {formVariants.map((v, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 md:grid-cols-7">
                <input value={v.variantName} onChange={(e) => setVariant(i, 'variantName', e.target.value)} placeholder="Variante (ej: Vainilla 1kg)" className="input md:col-span-2" />
                <input value={v.sku} onChange={(e) => setVariant(i, 'sku', e.target.value)} placeholder="SKU" className="input" />
                <input value={v.price} onChange={(e) => setVariant(i, 'price', e.target.value)} placeholder="Precio" type="number" className="input" />
                <input value={v.costPrice} onChange={(e) => setVariant(i, 'costPrice', e.target.value)} placeholder="Costo" type="number" className="input" />
                <input value={v.stock} onChange={(e) => setVariant(i, 'stock', e.target.value)} placeholder="Stock" type="number" className="input" />
                <div className="flex items-center gap-2">
                  <input value={v.lowStockAlert} onChange={(e) => setVariant(i, 'lowStockAlert', e.target.value)} placeholder="Alerta" type="number" className="input" />
                  <button onClick={() => setFormVariants((vs) => vs.filter((_, idx) => idx !== i))} disabled={formVariants.length === 1} className="text-red-500 disabled:opacity-30" title="Quitar variante">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setFormVariants((vs) => [...vs, { variantName: '', sku: '', price: '', costPrice: '', stock: '', lowStockAlert: '5' }])} className="mt-2 text-xs font-bold text-accent">
            + Agregar variante
          </button>

          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-outline px-4 py-2 text-xs">
              Cancelar
            </button>
            <button onClick={create} disabled={submitting} className="btn-accent px-4 py-2 text-xs disabled:opacity-50">
              {submitting ? 'Guardando…' : 'Guardar producto'}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-3xl border border-line bg-paper">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-widest text-muted">
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Marca</th>
              <th className="px-4 py-3">Variante</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Costo</th>
              <th className="px-4 py-3">Margen</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const variants = p.variants && p.variants.length > 0 ? p.variants : [];
              const rows = variants.length > 0 ? variants : [p];
              return rows.map((v: any, i: number) => (
                <tr key={v.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{i === 0 ? p.name : ''}</p>
                    {!p.active && <span className="text-[11px] font-bold text-red-500">INACTIVO</span>}
                    {i === 0 && (
                      <div className="mt-1 flex gap-1.5">
                        <button
                          onClick={() => openEdit(p)}
                          className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10px] font-bold text-ink hover:border-accent"
                        >
                          <Pencil size={10} /> Editar
                        </button>
                        <button
                          onClick={() => remove(p)}
                          disabled={deleting === p.id}
                          className="inline-flex items-center gap-1 rounded-full border border-red-300 px-2 py-0.5 text-[10px] font-bold text-red-700 disabled:opacity-50"
                        >
                          <Trash2 size={10} /> {deleting === p.id ? '…' : 'Desactivar'}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full border border-line bg-soft px-2 py-0.5 text-[11px] font-bold text-muted">
                      {p.brandName || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{v.name || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{v.sku || '—'}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      defaultValue={v.price}
                      onChange={(e) => setPriceEdits((d) => ({ ...d, [v.id]: e.target.value }))}
                      className="input w-28 py-1.5"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      defaultValue={v.costPrice}
                      onChange={(e) => setCostEdits((d) => ({ ...d, [v.id]: e.target.value }))}
                      className="input w-28 py-1.5"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${marginOf(v.price, v.costPrice) >= 35 ? 'text-emerald-600' : marginOf(v.price, v.costPrice) >= 15 ? 'text-accent' : 'text-red-500'}`}>
                      {marginOf(v.price, v.costPrice)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        defaultValue={v.stock}
                        onChange={(e) => setEdits((d) => ({ ...d, [v.id]: e.target.value }))}
                        className={`input w-24 py-1.5 ${stockLevel(v.stock, v.lowStockAlert).cls}`}
                      />
                      <span className={`text-[11px] font-bold ${stockLevel(v.stock, v.lowStockAlert).cls}`}>
                        {stockLevel(v.stock, v.lowStockAlert).label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button disabled={saving === v.id} onClick={() => save(p, v, v.stock)} className="btn-accent px-4 py-1.5 text-[11px] disabled:opacity-50">
                      Guardar
                    </button>
                  </td>
                </tr>
              ));
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted">
                  Sin productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-line bg-paper p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-xl uppercase">Editar producto</p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <input value={editForm.name} onChange={(e) => setEditForm((f) => (f ? { ...f, name: e.target.value } : f))} placeholder="Nombre *" className="input md:col-span-2" />
              <input value={editForm.sku} onChange={(e) => setEditForm((f) => (f ? { ...f, sku: e.target.value } : f))} placeholder="SKU" className="input" />
              <input value={editForm.category} onChange={(e) => setEditForm((f) => (f ? { ...f, category: e.target.value } : f))} placeholder="Categoría" className="input" />
              <input value={editForm.brand} onChange={(e) => setEditForm((f) => (f ? { ...f, brand: e.target.value } : f))} placeholder="Marca" className="input" />
              <input value={editForm.basePrice} onChange={(e) => setEditForm((f) => (f ? { ...f, basePrice: e.target.value } : f))} placeholder="Precio base" type="number" className="input" />
              <input value={editForm.costPrice} onChange={(e) => setEditForm((f) => (f ? { ...f, costPrice: e.target.value } : f))} placeholder="Costo" type="number" className="input" />
              <input value={editForm.comparePrice} onChange={(e) => setEditForm((f) => (f ? { ...f, comparePrice: e.target.value } : f))} placeholder="Precio tachado" type="number" className="input" />
              <input value={editForm.reason} onChange={(e) => setEditForm((f) => (f ? { ...f, reason: e.target.value } : f))} placeholder="Motivo de ajuste de stock (si cambias stock)" className="input md:col-span-2" />
              <textarea value={editForm.description} onChange={(e) => setEditForm((f) => (f ? { ...f, description: e.target.value } : f))} placeholder="Descripción" className="input md:col-span-2" rows={2} />
              <input value={editForm.registroIsp} onChange={(e) => setEditForm((f) => (f ? { ...f, registroIsp: e.target.value } : f))} placeholder="Registro ISP N°" className="input" />
            </div>

            <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-muted">Variantes</p>
            <div className="mt-2 space-y-2">
              {editForm.variants.map((v, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 md:grid-cols-6">
                  <input value={v.variantName} onChange={(e) => setEditVariant(i, 'variantName', e.target.value)} placeholder="Variante" className="input md:col-span-2" />
                  <input value={v.sku} onChange={(e) => setEditVariant(i, 'sku', e.target.value)} placeholder="SKU" className="input" />
                  <input value={v.price} onChange={(e) => setEditVariant(i, 'price', e.target.value)} placeholder="Precio" type="number" className="input" />
                  <input value={v.costPrice} onChange={(e) => setEditVariant(i, 'costPrice', e.target.value)} placeholder="Costo" type="number" className="input" />
                  <div className="flex items-center gap-2">
                    <input value={v.stock} onChange={(e) => setEditVariant(i, 'stock', e.target.value)} placeholder="Stock" type="number" className="input" />
                    <input value={v.lowStockAlert} onChange={(e) => setEditVariant(i, 'lowStockAlert', e.target.value)} placeholder="Alerta" type="number" className="input w-20" />
                    <button
                      onClick={() => setEditForm((f) => (f ? { ...f, variants: f.variants.filter((_, idx) => idx !== i) } : f))}
                      disabled={editForm.variants.length === 1}
                      className="text-red-500 disabled:opacity-30"
                      title="Quitar variante"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() =>
                setEditForm((f) => (f ? { ...f, variants: [...f.variants, { variantName: '', sku: '', price: '', costPrice: '', stock: '', lowStockAlert: '5' }] } : f))
              }
              className="mt-2 text-xs font-bold text-accent"
            >
              + Agregar variante
            </button>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn-outline px-4 py-2 text-xs">
                Cancelar
              </button>
              <button onClick={saveEdit} disabled={submitting} className="btn-accent px-4 py-2 text-xs disabled:opacity-50">
                {submitting ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function customerSegment(c: ApiCustomer): { label: string; cls: string } {
  if (c.isVip) return { label: 'VIP', cls: 'bg-amber-100 text-amber-800 border-amber-300' };
  if (c.totalSpent >= 100000) return { label: 'VIP', cls: 'bg-amber-100 text-amber-800 border-amber-300' };
  if (c.totalOrders >= 3) return { label: 'Recurrente', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  if (c.totalOrders >= 1) return { label: 'Activo', cls: 'bg-sky-100 text-sky-800 border-sky-300' };
  if (c.lastOrderAt) return { label: 'Dormido', cls: 'bg-slate-100 text-slate-700 border-slate-300' };
  return { label: 'Nuevo', cls: 'bg-soft text-muted border-line' };
}

function Clientes({
  customers,
  token,
  onChanged,
}: {
  customers: ApiCustomer[];
  token: string;
  onChanged: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [segFilter, setSegFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [generatingCoupon, setGeneratingCoupon] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      const matchesQ = !q || `${c.name} ${c.phone} ${c.email || ''}`.toLowerCase().includes(q);
      const seg = customerSegment(c).label;
      const matchesSeg = !segFilter || seg === segFilter;
      return matchesQ && matchesSeg;
    });
  }, [customers, query, segFilter]);

  const segOptions = ['VIP', 'Recurrente', 'Activo', 'Nuevo', 'Dormido'];

  const remove = async (customer: ApiCustomer) => {
    if (!window.confirm(`¿Eliminar permanentemente al cliente ${customer.name}?`)) return;
    setDeleting(customer.id);
    try {
      await apiFetch(`/customers/${customer.id}`, { method: 'DELETE', token });
      await onChanged();
    } catch (err: any) {
      alert(err?.message || 'No se pudo eliminar el cliente.');
    } finally {
      setDeleting(null);
    }
  };

  const generateCoupon = async (customer: ApiCustomer) => {
    if (!window.confirm(`¿Generar cupón de 10% para ${customer.name}?`)) return;
    setGeneratingCoupon(customer.id);
    try {
      const coupon = await apiFetch<{ code: string; discountPercent: number; expiresAt: string | null }>(
        '/coupons',
        {
          method: 'POST',
          token,
          body: {
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            discountPercent: 10,
            daysValid: 30,
          },
        },
      );
      const phone = customer.phone.replace(/\D/g, '');
      const expiry = coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('es-CL') : '30 días';
      const message = [
        `Hola ${customer.name}, gracias por tu compra en NutriFit.`,
        '',
        `Te dejamos un cupón único para tu próxima compra: *${coupon.code}*`,
        `Descuento: ${coupon.discountPercent}%`,
        `Válido hasta: ${expiry}`,
        '',
        'Úsalo en tu próxima compra por WhatsApp o en el carrito.',
      ].join('\n');
      window.open(`https://wa.me/56${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      await onChanged();
    } catch (err: any) {
      alert(err?.message || 'No se pudo generar el cupón.');
    } finally {
      setGeneratingCoupon(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente…" className="input max-w-md" />
        {segOptions.map((s) => (
          <button
            key={s}
            onClick={() => setSegFilter(segFilter === s ? '' : s)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${segFilter === s ? 'bg-ink text-paper' : 'border border-line bg-paper text-muted'}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-paper">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-widest text-muted">
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Segmento</th>
              <th className="px-4 py-3">Órdenes</th>
              <th className="px-4 py-3">Gasto total</th>
              <th className="px-4 py-3">Última compra</th>
               <th className="px-4 py-3">Registro</th>
               <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const seg = customerSegment(c);
              return (
                <tr key={c.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 font-semibold">{c.name}</td>
                  <td className="px-4 py-3 text-xs">{c.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${seg.cls}`}>{seg.label}</span>
                  </td>
                  <td className="px-4 py-3">{c.totalOrders}</td>
                  <td className="px-4 py-3 font-bold">{formatPrice(c.totalSpent)}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString('es-CL') : '—'}
                  </td>
                   <td className="px-4 py-3 text-xs text-muted">{new Date(c.createdAt).toLocaleDateString('es-CL')}</td>
                   <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => generateCoupon(c)}
                        disabled={generatingCoupon === c.id}
                        className="mr-2 inline-flex items-center gap-1 rounded-full border border-emerald-300 px-3 py-1.5 text-[11px] font-bold text-emerald-700 disabled:opacity-50"
                      >
                        <MessageCircle size={12} /> {generatingCoupon === c.id ? '...' : 'Cupón 10%'}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(c)}
                        disabled={deleting === c.id}
                       className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1.5 text-[11px] font-bold text-red-700 disabled:opacity-50"
                     >
                       <Trash2 size={12} /> {deleting === c.id ? '…' : 'Eliminar'}
                     </button>
                   </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                 <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  Sin clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Caja({ cash, token, onChanged }: { cash: CashRegister | null; token: string; onChanged: () => void }) {
  const [initial, setInitial] = useState('0');
  const [final, setFinal] = useState('');
  const [saving, setSaving] = useState(false);

  const open = async () => {
    setSaving(true);
    try {
      await apiFetch('/cash-register/open', { method: 'POST', token, body: { initialAmount: Number(initial) || 0 } });
      await onChanged();
    } catch (err: any) {
      alert(err?.message || 'Error al abrir caja.');
    } finally {
      setSaving(false);
    }
  };

  const close = async () => {
    if (!cash) return;
    setSaving(true);
    try {
      await apiFetch(`/cash-register/${cash.id}/close`, { method: 'PATCH', token, body: { finalAmount: Number(final) || 0 } });
      await onChanged();
    } catch (err: any) {
      alert(err?.message || 'Error al cerrar caja.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md rounded-3xl border border-line bg-paper p-6">
      {!cash ? (
        <>
          <p className="font-display text-xl uppercase">Abrir caja</p>
          <p className="mt-1 text-sm text-muted">Fondo inicial (puede ser 0).</p>
          <div className="mt-4 space-y-3">
            <input type="number" value={initial} onChange={(e) => setInitial(e.target.value)} className="input" placeholder="Fondo inicial" />
            <button onClick={open} disabled={saving} className="btn-accent w-full">
              {saving ? 'Abriendo…' : 'Abrir caja'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="font-display text-xl uppercase">Caja {cash.status === 'OPEN' ? 'abierta' : 'cerrada'}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Apertura</dt>
              <dd className="font-semibold">{new Date(cash.openedAt).toLocaleString('es-CL')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Fondo inicial</dt>
              <dd className="font-semibold">{formatPrice(cash.initialAmount)}</dd>
            </div>
            {cash.finalAmount !== null && (
              <>
                <div className="flex justify-between">
                  <dt className="text-muted">Cierre</dt>
                  <dd className="font-semibold">{formatPrice(cash.finalAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Diferencia</dt>
                  <dd className={`font-bold ${(cash.diff ?? 0) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatPrice(cash.diff ?? 0)}</dd>
                </div>
              </>
            )}
          </dl>
          {cash.status === 'OPEN' && (
            <div className="mt-4 space-y-3">
              <input type="number" value={final} onChange={(e) => setFinal(e.target.value)} className="input" placeholder="Total contado al cierre" />
              <button onClick={close} disabled={saving} className="btn-primary w-full">
                {saving ? 'Cerrando…' : 'Cerrar caja'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Reportes({ token }: { token: string }) {
  const [range, setRange] = useState<'7d' | '30d' | 'mes'>('30d');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const to = new Date();
      let from = new Date();
      if (range === '7d') from.setDate(from.getDate() - 7);
      else if (range === '30d') from.setDate(from.getDate() - 30);
      else from = new Date(to.getFullYear(), to.getMonth(), 1);
      const q = `from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}`;
      const r = await apiFetch<Report>(`/orders/reports?${q}`, { token });
      setReport(r);
    } catch (err: any) {
      alert(err?.message || 'Error al cargar reportes.');
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
              <p className="font-display text-lg uppercase">Ventas vs utilidad</p>
              {byDay.length > 0 ? (
                <div className="mt-4">
                  <div className="flex h-44 items-end gap-2">
                    {byDay.map((d) => {
                      const max = Math.max(...byDay.map((x) => x.total), 1);
                      return (
                        <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                          <div className="w-full rounded-t-md bg-accent/70" style={{ height: `${Math.max((d.total / max) * 100, 3)}%` }} title={`${formatPrice(d.total)} (utilidad ${formatPrice(d.profit)})`} />
                          <span className="text-[10px] text-muted">{d.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-muted">Barras verdes = ventas por día. Pasa el cursor para ver utilidad.</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">Sin ventas en el período.</p>
              )}
            </div>

            <div className="rounded-3xl border border-line bg-paper p-6">
              <p className="font-display text-lg uppercase">Por método de pago</p>
              {report.methods.length > 0 ? (
                <div className="mt-4 flex items-center gap-6">
                  <Donut data={report.methods} />
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
                <div className="mt-4 space-y-3">
                  {report.categories.slice(0, 8).map((c) => {
                    const max = Math.max(...report.categories.map((x) => x.total), 1);
                    return (
                      <div key={c.product}>
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold">{c.product}</span>
                          <span className="text-muted">{c.quantity} uds · {formatPrice(c.total)}</span>
                        </div>
                        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-soft">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max((c.total / max) * 100, 2)}%` }} />
                        </div>
                      </div>
                    );
                  })}
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

function Donut({ data }: { data: { method: string; total: number }[] }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  if (!total) return <p className="text-sm text-muted">Sin ventas.</p>;
  let acc = 0;
  return (
    <svg viewBox="0 0 42 42" className="h-40 w-40 flex-shrink-0">
      {data.map((d, i) => {
        const start = (acc / total) * 100;
        acc += d.total;
        const end = (acc / total) * 100;
        return (
          <circle
            key={d.method}
            cx="21"
            cy="21"
            r="15.9"
            fill="transparent"
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth="6"
            strokeDasharray={`${end - start} ${100 - (end - start)}`}
            strokeDashoffset={25 - start}
          />
        );
      })}
    </svg>
  );
}
