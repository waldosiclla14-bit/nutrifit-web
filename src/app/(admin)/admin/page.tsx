'use client';

import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Boxes,
  CalendarDays,
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  LifeBuoy,
  Megaphone,
  Bot,
  Settings,
  Menu,
  X,
  Search,
  ChevronRight,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { apiFetch, clearSessionCookie, clearToken, getSessionUser, getToken } from '@/lib/api';
import { ConfirmProvider, toast } from '@/lib/feedback';
import { mapApiProduct, handleAuthError } from '@/lib/admin/helpers';
import type {
  AdminCashRegister,
  AdminGoals,
  AdminInventoryValue,
  AdminProduct,
  AdminStats,
} from '@/types/admin';
import { Button } from '@/components/ui/button';
import { PasswordModal } from '@/components/admin/PasswordModal';
import { AdminBottomNav } from '@/components/admin/BottomNav';
import { AdminErrorGuard } from '@/components/admin/ErrorGuard';

const Resumen = lazy(() => import('@/components/admin/Resumen').then((m) => ({ default: m.Resumen })));
const Ordenes = lazy(() => import('@/components/admin/Ordenes').then((m) => ({ default: m.Ordenes })));
const Productos = lazy(() => import('@/components/admin/Productos').then((m) => ({ default: m.Productos })));
const Clientes = lazy(() => import('@/components/admin/Clientes').then((m) => ({ default: m.Clientes })));
const Caja = lazy(() => import('@/components/admin/Caja').then((m) => ({ default: m.Caja })));
const Reportes = lazy(() => import('@/components/admin/Reportes').then((m) => ({ default: m.Reportes })));
const Inventario = lazy(() => import('@/components/admin/Inventario').then((m) => ({ default: m.Inventario })));
const Compras = lazy(() => import('@/components/admin/Compras').then((m) => ({ default: m.Compras })));
const Entregas = lazy(() => import('@/components/admin/Entregas').then((m) => ({ default: m.Entregas })));
const Calendario = lazy(() => import('@/components/admin/Calendario').then((m) => ({ default: m.Calendario })));
const Desk = lazy(() => import('@/components/admin/Desk').then((m) => ({ default: m.Desk })));
const Marketing = lazy(() => import('@/components/admin/Marketing').then((m) => ({ default: m.Marketing })));
const IaCopilot = lazy(() => import('@/components/admin/IaCopilot').then((m) => ({ default: m.IaCopilot })));
const Proveedores = lazy(() => import('@/components/admin/Proveedores').then((m) => ({ default: m.Proveedores })));
const Configuracion = lazy(() => import('@/components/admin/Configuracion').then((m) => ({ default: m.Configuracion })));

function TabSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="skeleton h-8 w-48 rounded-xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  );
}

export type TabKey =
  | 'resumen'
  | 'ordenes'
  | 'entregas'
  | 'calendario'
  | 'productos'
  | 'inventario'
  | 'compras'
  | 'proveedores'
  | 'clientes'
  | 'caja'
  | 'desk'
  | 'marketing'
  | 'reportes'
  | 'ia'
  | 'configuracion';

export default function AdminPage() {
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('resumen');

  useEffect(() => {
    const t = getToken();
    if (!t) {
      window.location.href = '/login?next=/admin';
      return;
    }
    setTokenState(t);
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    clearSessionCookie();
    router.replace('/login?next=/admin');
  }, [router]);

  const handleSell = useCallback(() => router.push('/pos'), [router]);

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-sport-green border-t-transparent" />
          <p className="text-sm text-muted">Iniciando NutriFit Business OS…</p>
        </div>
      </div>
    );
  }

  return (
    <ConfirmProvider>
      <Dashboard
        token={token}
        tab={tab}
        setTab={setTab}
        onSell={handleSell}
        onLogout={handleLogout}
      />
    </ConfirmProvider>
  );
}

function mapCash(cr: any): AdminCashRegister | null {
  return cr
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
    : null;
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
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [cash, setCash] = useState<AdminCashRegister | null>(null);
  const [inventory, setInventory] = useState<AdminInventoryValue | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadTab = useCallback(
    async (t: string, silent = false) => {
      if (!silent) setLoading(true);
      try {
        if (t === 'resumen') {
          const [s, cr, g] = await Promise.all([
            apiFetch<AdminStats>('/orders/stats', { token }),
            apiFetch<any | null>('/cash-register/current', { token }),
            apiFetch<AdminGoals>('/config/goals', { token }),
          ]);
        setStats(s);
        setCash(mapCash(cr));
        setGoals(g);
          apiFetch<AdminInventoryValue>('/products/inventory-value', { token })
            .then(setInventory)
            .catch(() => {});
        } else if (t === 'productos') {
          const p = await apiFetch<any[]>('/products/internal', { token });
          setProducts((p || []).map(mapApiProduct));
      } else if (t === 'caja') {
        const cr = await apiFetch<any | null>('/cash-register/current', { token });
        setCash(mapCash(cr));
      }
      } catch (err: any) {
        if (handleAuthError(err, onLogout)) {
          clearToken();
          clearSessionCookie();
          return;
        }
        if (!silent) toast.error(err?.message || 'Error al cargar datos.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token, onLogout],
  );

  const load = useCallback(() => loadTab(tab), [loadTab, tab]);
  const refreshTab = useCallback(() => loadTab(tab, true), [loadTab, tab]);

  useEffect(() => {
    loadTab(tab);
  }, [loadTab, tab]);

  // Cash badge for the header — independent of the active tab
  useEffect(() => {
    apiFetch<any | null>('/cash-register/current', { token })
      .then((cr) => setCash(mapCash(cr)))
      .catch(() => {});
  }, [token]);

  const userName =
    getSessionUser()?.email?.split('@')[0] || 'Equipo';

  const navGroups = [
    {
      title: 'OPERACIÓN & VENTAS',
      items: [
        { key: 'resumen' as TabKey, label: 'Dashboard', icon: LayoutDashboard },
        { key: 'ordenes' as TabKey, label: 'Pedidos / OMS', icon: ShoppingBag },
        { key: 'entregas' as TabKey, label: 'Logística Metro', icon: Truck },
        { key: 'calendario' as TabKey, label: 'Calendario', icon: CalendarDays },
      ],
    },
    {
      title: 'ERP & CADENA DE SUMINISTRO',
      items: [
        { key: 'productos' as TabKey, label: 'Productos / Precios', icon: Boxes },
        { key: 'inventario' as TabKey, label: 'Inventario / Stock', icon: Boxes },
        { key: 'compras' as TabKey, label: 'Compras & OCR', icon: ShoppingBag },
        { key: 'proveedores' as TabKey, label: 'Proveedores', icon: Truck },
      ],
    },
    {
      title: 'CRM & CLIENTES',
      items: [
        { key: 'clientes' as TabKey, label: 'Clientes (CRM 360)', icon: Users },
        { key: 'desk' as TabKey, label: 'Desk / Atención', icon: LifeBuoy },
        { key: 'marketing' as TabKey, label: 'Marketing & Cupones', icon: Megaphone },
      ],
    },
    {
      title: 'FINANZAS & CONTROL',
      items: [
        { key: 'caja' as TabKey, label: 'Caja / Turnos', icon: Wallet },
        { key: 'reportes' as TabKey, label: 'Analítica & Reportes', icon: BarChart3 },
        { key: 'ia' as TabKey, label: 'Copiloto IA', icon: Bot, highlight: true },
        { key: 'configuracion' as TabKey, label: 'Configuración', icon: Settings },
      ],
    },
  ];

  const allTabs = navGroups.flatMap((g) => g.items);

  return (
    <div className="min-h-screen bg-surface pb-28 lg:pb-8">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur px-4 py-2.5 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-line lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sport-green text-black font-black text-sm shadow-sm">
                N
              </span>
              <div>
                <p className="text-[17px] font-medium leading-tight text-ink">Hola, {userName}</p>
                <div className="mt-0.5">
                  {cash?.status === 'OPEN' ? (
                    <span className="ds-badge ds-badge-success">Caja abierta</span>
                  ) : (
                    <span className="ds-badge ds-badge-muted">Caja cerrada</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <Button variant="default" size="sm" onClick={onSell} className="bg-sport-green text-black font-extrabold hover:bg-sport-greenLight">
              <ShoppingCart size={13} /> Cobrar en POS
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="mx-auto max-w-[1600px] px-3 sm:px-6 py-4 flex gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-6">
          <div className="rounded-3xl border border-line bg-paper p-3 shadow-sm space-y-5">
            {navGroups.map((group) => (
              <div key={group.title}>
                <p className="px-3 text-[10px] font-black uppercase tracking-wider text-muted mb-1.5">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = tab === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          setTab(item.key);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                          active
                            ? 'bg-ink text-paper shadow-sm'
                            : item.highlight
                            ? 'bg-sport-green/10 text-sport-green hover:bg-sport-green/20'
                            : 'text-muted hover:bg-surface hover:text-ink'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon size={15} className={active ? 'text-sport-green' : ''} />
                          <span>{item.label}</span>
                        </div>
                        {active && <ChevronRight size={13} className="text-sport-green" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-line bg-paper p-3.5 text-xs text-muted shadow-sm space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-ink">
              <Building size={13} className="text-sport-green" /> NutriFit Chile
            </div>
            <p className="text-[11px]">Santiago · Metro Delivery</p>
            <p className="text-[10px] text-muted pt-1 border-t border-line">Fuente única de verdad activa</p>
          </div>
        </aside>

        {/* Mobile Slide-Over Menu */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-4/5 max-w-xs bg-paper p-4 overflow-y-auto shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sport-green text-black font-black text-xs">
                    N
                  </span>
                  <span className="font-display text-sm uppercase tracking-wide text-ink">
                    NUTRIFIT <span className="text-sport-green">OS</span>
                  </span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-muted hover:text-ink">
                  <X size={18} />
                </button>
              </div>

              {navGroups.map((group) => (
                <div key={group.title}>
                  <p className="px-2 text-[10px] font-black uppercase tracking-wider text-muted mb-1">
                    {group.title}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = tab === item.key;
                      return (
                        <button
                          key={item.key}
                          onClick={() => {
                            setTab(item.key);
                            setSidebarOpen(false);
                            window.scrollTo({ top: 0 });
                          }}
                          className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                            active ? 'bg-ink text-paper' : 'text-muted hover:bg-surface hover:text-ink'
                          }`}
                        >
                          <Icon size={15} className={active ? 'text-sport-green' : ''} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          <AdminErrorGuard key={tab}>
            {loading && <TabSkeleton />}
            {!loading && (
              <Suspense fallback={<TabSkeleton />}>
                {tab === 'resumen' && <Resumen stats={stats} goals={goals} inventory={inventory} token={token} onChanged={load} />}
                {tab === 'ordenes' && <Ordenes token={token} />}
                {tab === 'entregas' && <Entregas token={token} />}
                {tab === 'calendario' && <Calendario token={token} />}
                {tab === 'productos' && <Productos products={products} token={token} onChanged={refreshTab} />}
                {tab === 'inventario' && <Inventario token={token} />}
                {tab === 'compras' && <Compras token={token} />}
                {tab === 'proveedores' && <Proveedores token={token} />}
                {tab === 'clientes' && <Clientes token={token} />}
                {tab === 'desk' && <Desk token={token} />}
                {tab === 'marketing' && <Marketing token={token} />}
                {tab === 'caja' && <Caja cash={cash} token={token} onChanged={refreshTab} />}
                {tab === 'reportes' && <Reportes token={token} />}
                {tab === 'ia' && <IaCopilot token={token} />}
                {tab === 'configuracion' && <Configuracion token={token} onRefresh={load} onPassword={() => setShowPassword(true)} onLogout={onLogout} />}
              </Suspense>
            )}
          </AdminErrorGuard>
        </main>
      </div>

      {showPassword && (
        <PasswordModal token={token} onClose={() => setShowPassword(false)} onChanged={load} />
      )}

      {/* Mobile Bottom Navigation */}
      <AdminErrorGuard>
        <AdminBottomNav
          tabs={allTabs}
          tab={tab}
          setTab={(t) => {
            setTab(t as TabKey);
            window.scrollTo({ top: 0 });
          }}
        />
      </AdminErrorGuard>
    </div>
  );
}
