'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  RefreshCw,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react';
import { apiFetch, clearToken, getToken, setToken } from '@/lib/api';
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
  stock: number;
  lowStockAlert: number | null;
  active: boolean;
};

type ApiProduct = {
  id: string;
  name: string;
  brand?: string;
  sku?: string;
  price: number;
  stock?: number;
  active: boolean;
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
};

type Stats = {
  todaySales: number;
  todayOrders: number;
  monthSales: number;
  monthOrders: number;
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
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

function waLink(order: ApiOrder) {
  const phone = (order.customer?.phone || '').replace(/\D/g, '');
  const msg = encodeURIComponent(
    `Hola ${order.customer?.name || ''}! Tu pedido ${order.orderNumber} está ${
      STATUS_LABEL[order.status] || order.status
    }. Respondeme para coordinar la entrega.`,
  );
  return `https://wa.me/56${phone}?text=${msg}`;
}

export default function AdminPage() {
  const [token, setTokenState] = useState<string | null>(null);
  const [tab, setTab] = useState<'resumen' | 'ordenes' | 'productos' | 'clientes' | 'caja'>('resumen');

  useEffect(() => {
    setTokenState(getToken());
  }, []);

  if (!token) return <LoginView onLogin={(t) => setTokenState(t)} />;
  return <Dashboard token={token} tab={tab} setTab={setTab} onLogout={() => { clearToken(); setTokenState(null); }} />;
}

function LoginView({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ access_token: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setToken(res.access_token);
      onLogin(res.access_token);
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-px flex min-h-[70vh] items-center justify-center py-16">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-line bg-paper p-8 shadow-soft">
        <p className="section-label">NUTRIFIT</p>
        <h1 className="mt-2 font-display text-2xl uppercase tracking-wide">Panel Admin</h1>
        <p className="mt-1 text-sm text-muted">Inicia sesión para gestionar la tienda.</p>
        <div className="mt-6 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="input"
            autoComplete="username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="input"
            autoComplete="current-password"
          />
        </div>
        {error && <p className="mt-3 text-xs font-semibold text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="btn-accent mt-6 w-full">
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="mt-4 text-center text-[11px] text-muted">
          Por defecto: <span className="font-semibold">admin@nutrifit.cl</span>
        </p>
      </form>
    </div>
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
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [cash, setCash] = useState<CashRegister | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, o, p, c, cr] = await Promise.all([
        apiFetch<Stats>('/orders/stats', { token }),
        apiFetch<ApiOrder[]>('/orders', { token }),
        apiFetch<any[]>('/products', { token }),
        apiFetch<ApiCustomer[]>('/customers', { token }),
        apiFetch<any | null>('/cash-register/current', { token }),
      ]);
      setStats(s);
      setOrders(o);
      setProducts(
        (p || []).map((x) => ({
          id: x.id,
          name: x.name,
          sku: x.sku,
          price: x.basePrice ?? x.price,
          active: x.isActive !== false,
          variants: (x.variants || []).map((v: any) => ({
            id: v.id,
            name: v.variantName || v.name || 'Sin variante',
            sku: v.sku,
            price: v.price,
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
        {!loading && tab === 'resumen' && <Resumen stats={stats} />}
        {!loading && tab === 'ordenes' && <Ordenes orders={orders} token={token} busyId={busyId} act={act} />}
        {!loading && tab === 'productos' && <Productos products={products} token={token} onChanged={load} />}
        {!loading && tab === 'clientes' && <Clientes customers={customers} />}
        {!loading && tab === 'caja' && <Caja cash={cash} token={token} onChanged={load} />}
      </div>
    </div>
  );
}

function Resumen({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  const cards = [
    { label: 'Ventas hoy', value: formatPrice(stats.todaySales), sub: `${stats.todayOrders} órdenes` },
    { label: 'Ventas del mes', value: formatPrice(stats.monthSales), sub: `${stats.monthOrders} órdenes` },
    { label: 'Órdenes pendientes', value: String(stats.pendingOrders), sub: `${stats.totalOrders} totales` },
    { label: 'Clientes', value: String(stats.totalCustomers), sub: 'registrados' },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-3xl border border-line bg-paper p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">{c.label}</p>
          <p className="mt-2 font-display text-3xl uppercase">{c.value}</p>
          <p className="mt-1 text-xs text-muted">{c.sub}</p>
        </div>
      ))}
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const hay = `${o.orderNumber} ${o.customer?.name || ''} ${o.customer?.phone || ''} ${o.metroStation || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [orders, query]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nº de pedido, cliente, teléfono o estación…"
        className="input max-w-md"
      />
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
  const [saving, setSaving] = useState<string | null>(null);

  const save = async (v: Variant, current: number) => {
    const raw = edits[v.id];
    if (raw === undefined) return;
    const next = Number(raw);
    if (Number.isNaN(next) || next < 0) return;
    setSaving(v.id);
    try {
      await apiFetch(`/products/${v.id}/stock`, { method: 'PATCH', token, body: { quantity: next - current } });
      await onChanged();
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar stock.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="overflow-x-auto rounded-3xl border border-line bg-paper">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-widest text-muted">
            <th className="px-4 py-3">Producto</th>
            <th className="px-4 py-3">Variante</th>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3">Precio</th>
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
                </td>
                <td className="px-4 py-3">{v.name || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{v.sku || '—'}</td>
                <td className="px-4 py-3 font-bold">{formatPrice(v.price)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      defaultValue={v.stock}
                      onChange={(e) => setEdits((d) => ({ ...d, [v.id]: e.target.value }))}
                      className={`input w-24 py-1.5 ${v.stock <= (v.lowStockAlert ?? 0) ? 'border-red-300 text-red-600' : ''}`}
                    />
                    {v.stock <= (v.lowStockAlert ?? 0) && (
                      <span className="text-[11px] font-bold text-red-500">stock bajo</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    disabled={saving === v.id}
                    onClick={() => save(v, v.stock)}
                    className="btn-accent px-4 py-1.5 text-[11px] disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </td>
              </tr>
            ));
          })}
          {products.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-muted">
                Sin productos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Clientes({ customers }: { customers: ApiCustomer[] }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => `${c.name} ${c.phone} ${c.email || ''}`.toLowerCase().includes(q));
  }, [customers, query]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar cliente…"
        className="input max-w-md"
      />
      <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-paper">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-widest text-muted">
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Órdenes</th>
              <th className="px-4 py-3">Gasto total</th>
              <th className="px-4 py-3">Registro</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3 font-semibold">{c.name}</td>
                <td className="px-4 py-3 text-xs">{c.phone}</td>
                <td className="px-4 py-3">{c.totalOrders}</td>
                <td className="px-4 py-3 font-bold">{formatPrice(c.totalSpent)}</td>
                <td className="px-4 py-3 text-xs text-muted">{new Date(c.createdAt).toLocaleDateString('es-CL')}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
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
          <p className="font-display text-xl uppercase">
            Caja {cash.status === 'OPEN' ? 'abierta' : 'cerrada'}
          </p>
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
                  <dd className={`font-bold ${(cash.diff ?? 0) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatPrice(cash.diff ?? 0)}
                  </dd>
                </div>
              </>
            )}
          </dl>
          {cash.status === 'OPEN' && (
            <div className="mt-4 space-y-3">
              <input
                type="number"
                value={final}
                onChange={(e) => setFinal(e.target.value)}
                className="input"
                placeholder="Total contado al cierre"
              />
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
