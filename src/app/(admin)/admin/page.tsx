'use client';

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Boxes,
  CalendarDays,
  KeyRound,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react';
import { apiFetch, clearSessionCookie, clearToken, getToken } from '@/lib/api';
import { ConfirmProvider, toast } from '@/lib/feedback';
import type {
  AdminCashRegister,
  AdminCustomer,
  AdminGoals,
  AdminInventoryValue,
  AdminOrder,
  AdminProduct,
  AdminReminder,
  AdminStats,
} from '@/types/admin';
import { PasswordModal } from '@/components/admin/PasswordModal';

const Resumen = lazy(() => import('@/components/admin/Resumen').then(m => ({ default: m.Resumen })));
const Ordenes = lazy(() => import('@/components/admin/Ordenes').then(m => ({ default: m.Ordenes })));
const Productos = lazy(() => import('@/components/admin/Productos').then(m => ({ default: m.Productos })));
const Clientes = lazy(() => import('@/components/admin/Clientes').then(m => ({ default: m.Clientes })));
const Agenda = lazy(() => import('@/components/admin/Agenda').then(m => ({ default: m.Agenda })));
const Caja = lazy(() => import('@/components/admin/Caja').then(m => ({ default: m.Caja })));
const Reportes = lazy(() => import('@/components/admin/Reportes').then(m => ({ default: m.Reportes })));

function TabSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="h-8 w-48 animate-pulse rounded bg-line" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-line" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-line" />
    </div>
  );
}

type TabKey = 'resumen' | 'ordenes' | 'productos' | 'clientes' | 'agenda' | 'caja' | 'reportes';

export default function AdminPage() {
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('resumen');

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
    <ConfirmProvider>
      <Dashboard
        token={token}
        tab={tab}
        setTab={setTab}
        onSell={() => router.push('/pos')}
        onLogout={() => {
          clearToken();
          clearSessionCookie();
          router.replace('/login?next=/admin');
        }}
      />
    </ConfirmProvider>
  );
}

function Dashboard({
  token,
  tab,
  setTab,
  onSell,
  onLogout,
}: {
  token: string;
  tab: TabKey;
  setTab: (t: TabKey) => void;
  onSell: () => void;
  onLogout: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [goals, setGoals] = useState<AdminGoals | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [reminders, setReminders] = useState<AdminReminder[]>([]);
  const [cash, setCash] = useState<AdminCashRegister | null>(null);
  const [inventory, setInventory] = useState<AdminInventoryValue | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const loadTab = useCallback(async (t: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (t === 'resumen') {
        const [s, cr, g, iv] = await Promise.all([
          apiFetch<AdminStats>('/orders/stats', { token }),
          apiFetch<any | null>('/cash-register/current', { token }),
          apiFetch<AdminGoals>('/config/goals', { token }),
          apiFetch<AdminInventoryValue>('/products/inventory-value', { token }).catch(() => null),
        ]);
        setStats(s);
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
      } else if (t === 'ordenes') {
        const o = await apiFetch<AdminOrder[]>('/orders', { token });
        setOrders(o || []);
      } else if (t === 'productos') {
        const p = await apiFetch<any[]>('/products/internal', { token });
        setProducts(
          (p || []).map((x) => ({
            id: x.id,
            name: x.name || x.sku || 'Producto sin nombre',
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
      } else if (t === 'clientes') {
        const c = await apiFetch<AdminCustomer[]>('/customers', { token });
        setCustomers(c || []);
      } else if (t === 'agenda') {
        const [r, c] = await Promise.all([
          apiFetch<AdminReminder[]>('/reminders', { token }).catch(() => []),
          apiFetch<AdminCustomer[]>('/customers', { token }).catch(() => []),
        ]);
        setReminders(
          (r || []).map((x: any) => ({
            id: x.id,
            customerId: x.customerId,
            customerName: x.customer?.name || '',
            customerPhone: x.customer?.phone || '',
            title: x.title,
            message: x.message,
            dueAt: x.dueAt,
            status: x.status,
            sentAt: x.sentAt,
            createdAt: x.createdAt,
          })),
        );
        setCustomers(c || []);
      } else if (t === 'caja') {
        const cr = await apiFetch<any | null>('/cash-register/current', { token });
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
      }
    } catch (err: any) {
      if (err?.status === 401) {
        clearToken();
        clearSessionCookie();
        onLogout();
        return;
      }
      if (!silent) toast.error(err?.message || 'Error al cargar datos.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token, onLogout]);

  const load = useCallback(() => loadTab(tab), [loadTab, tab]);
  const refreshTab = useCallback(() => loadTab(tab, true), [loadTab, tab]);

  useEffect(() => {
    loadTab(tab);
  }, [loadTab, tab]);

  const tabRef = useRef(tab);
  tabRef.current = tab;

  const act = useCallback(async (fn: () => Promise<any>, id: string, successMsg?: string) => {
    setBusyId(id);
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
      await loadTab(tabRef.current, true);
    } catch (err: any) {
      toast.error(err?.message || 'Error en la operación.');
    } finally {
      setBusyId(null);
    }
  }, [loadTab]);

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { key: 'ordenes', label: 'Órdenes', icon: ShoppingBag },
    { key: 'productos', label: 'Productos', icon: Boxes },
    { key: 'clientes', label: 'Clientes', icon: Users },
    { key: 'agenda', label: 'Agenda', icon: CalendarDays },
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
          <button
            onClick={onSell}
            className="btn-accent px-4 py-2 text-xs"
            title="Vender con entrega o en local"
          >
            <ShoppingCart size={14} /> Vender
          </button>
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
        {!loading && (
          <Suspense fallback={<TabSkeleton />}>
            {tab === 'resumen' && <Resumen stats={stats} goals={goals} inventory={inventory} token={token} onChanged={load} />}
            {tab === 'ordenes' && <Ordenes orders={orders} token={token} busyId={busyId} act={act} />}
            {tab === 'productos' && <Productos products={products} token={token} onChanged={refreshTab} />}
            {tab === 'clientes' && <Clientes customers={customers} token={token} onChanged={refreshTab} />}
            {tab === 'agenda' && <Agenda customers={customers} reminders={reminders} token={token} onChanged={refreshTab} />}
            {tab === 'caja' && <Caja cash={cash} token={token} onChanged={refreshTab} />}
            {tab === 'reportes' && <Reportes token={token} />}
          </Suspense>
        )}
      </div>

      {showPassword && (
        <PasswordModal token={token} onClose={() => setShowPassword(false)} onChanged={load} />
      )}
    </div>
  );
}