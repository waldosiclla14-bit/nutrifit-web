'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Minus, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { apiFetch, clearToken, getToken, setToken } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

type ApiProduct = {
  id: string;
  name: string;
  brand?: { id: string; name: string; slug: string } | null;
  sku?: string;
  price: number;
  stock?: number;
  active: boolean;
  variants?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    lowStockAlert: number | null;
    active: boolean;
  }[];
};

type CartLine = {
  variantId: string | null;
  productName: string;
  variantName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  stock: number;
};

type CashRegister = {
  id: string;
  status: 'OPEN' | 'CLOSED';
  initialAmount: number;
  openedAt: string;
};

export default function PosPage() {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    setTokenState(getToken());
  }, []);

  if (!token) return <LoginView onLogin={(t) => setTokenState(t)} />;
  return <Pos token={token} onLogout={() => { clearToken(); setTokenState(null); }} />;
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
      const res = await apiFetch<{ access_token: string }>('/auth/login', { method: 'POST', body: { email, password } });
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
        <p className="section-label">PUNTO DE VENTA</p>
        <h1 className="mt-2 font-display text-2xl uppercase tracking-wide">POS NutriFit</h1>
        <div className="mt-6 space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input" autoComplete="username" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" className="input" autoComplete="current-password" />
        </div>
        {error && <p className="mt-3 text-xs font-semibold text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="btn-accent mt-6 w-full">
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

function Pos({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [payment, setPayment] = useState('EFECTIVO');
  const [cash, setCash] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, cr] = await Promise.all([
        apiFetch<any[]>('/products', { token }),
        apiFetch<any | null>('/cash-register/current', { token }),
      ]);
      setProducts(
        (p || []).map((x) => ({
          id: x.id,
          name: x.name,
          brand: x.brand,
          sku: x.sku,
          price: x.basePrice ?? x.price,
          stock: x.stock,
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
      setCash(
        cr
          ? { id: cr.id, status: cr.isOpen ? 'OPEN' : 'CLOSED', initialAmount: cr.initialAmount, openedAt: cr.openedAt }
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => `${p.name} ${p.brand?.name || ''} ${p.sku || ''}`.toLowerCase().includes(q));  }, [products, query]);

  const addToCart = (p: ApiProduct, variantId: string | null) => {
    const v = variantId ? p.variants?.find((x) => x.id === variantId) : null;
    const unitPrice = v?.price ?? p.price;
    const stock = v?.stock ?? 0;
    setCart((cart) => {
      const existing = cart.find((l) => l.variantId === variantId);
      if (existing) {
        if (existing.quantity >= stock) return cart;
        return cart.map((l) => (l.variantId === variantId ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...cart,
        { variantId, productName: p.name, variantName: v?.name || '', sku: v?.sku || '', unitPrice, quantity: 1, stock },
      ];
    });
    setDone(null);
  };

  const setQty = (variantId: string | null, quantity: number) => {
    setCart((cart) =>
      cart
        .map((l) => (l.variantId === variantId ? { ...l, quantity: Math.max(0, Math.min(l.stock, quantity)) } : l))
        .filter((l) => l.quantity > 0),
    );
  };

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0), [cart]);

  const openRegister = async () => {
    try {
      await apiFetch('/cash-register/open', { method: 'POST', token, body: { initialAmount: 0 } });
      await load();
    } catch (err: any) {
      alert(err?.message || 'Error al abrir caja.');
    }
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Ingresa nombre y teléfono del cliente.');
      return;
    }
    setSaving(true);
    try {
      const customer = await apiFetch<{ id: string }>('/customers', {
        method: 'POST',
        body: { name: customerName.trim(), phone: customerPhone.trim() },
      });
      const order = await apiFetch<{ id: string; orderNumber: string }>('/orders', {
        method: 'POST',
        body: {
          customerId: customer.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          deliveryType: 'RETIRO_TIENDA',
          subtotal,
          discount: 0,
          shippingCost: 0,
          total: subtotal,
          paymentMethod: payment,
          items: cart.map((l) => ({
            productId: null,
            variantId: l.variantId,
            productName: l.productName,
            variantName: l.variantName,
            sku: l.sku,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            total: l.unitPrice * l.quantity,
          })),
        },
      });
      await apiFetch(`/orders/${order.id}/payment`, {
        method: 'PATCH',
        token,
        body: { paymentMethod: payment, paymentNotes: 'Pago en local (POS)' },
      });
      setDone(order.orderNumber);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      await load();
    } catch (err: any) {
      alert(err?.message || 'Error al cobrar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-px py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">PUNTO DE VENTA</p>
          <h1 className="mt-1 font-display text-2xl uppercase tracking-wide">Cobrar en local</h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {cash?.status === 'OPEN' ? (
            <span className="chip border-emerald-300 bg-emerald-100 text-emerald-800">Caja abierta</span>
          ) : (
            <button onClick={openRegister} className="btn-accent px-4 py-2 text-xs">
              Abrir caja
            </button>
          )}
          <button onClick={onLogout} className="btn-outline px-4 py-2 text-xs">
            Salir
          </button>
        </div>
      </div>

      {done && (
        <div className="mt-4 flex items-center gap-3 rounded-3xl border border-emerald-300 bg-emerald-100 px-5 py-4 text-sm font-bold text-emerald-800">
          <CheckCircle2 size={20} /> Venta {done} registrada y pagada.
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto…"
              className="input pl-10"
            />
          </div>
          {loading ? (
            <p className="py-10 text-center text-sm text-muted">Cargando…</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => {
                const variants = p.variants?.filter((v) => v.active) || [];
                const list = variants.length > 0 ? variants : [{ id: null as string | null, name: '', sku: p.sku || '', price: p.price, stock: p.stock ?? 999 }];
                return (
                  <div key={p.id} className="rounded-3xl border border-line bg-paper p-4">
                    <p className="font-bold text-ink">{p.name}</p>
                    <p className="text-xs text-muted">{p.brand?.name}</p>
                    <div className="mt-3 space-y-1.5">
                      {list.map((v: any) => (
                        <button
                          key={v.id ?? p.id}
                          onClick={() => addToCart(p, v.id)}
                          disabled={v.stock <= 0}
                          className="flex w-full items-center justify-between rounded-2xl border border-line bg-soft/50 px-3 py-2 text-left transition hover:border-accent disabled:opacity-40"
                        >
                          <span className="text-xs font-semibold">
                            {v.name || 'Sin variante'}
                            <span className="ml-1 font-normal text-muted">({v.stock} uds)</span>
                          </span>
                          <span className="text-sm font-bold">{formatPrice(v.price)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <p className="py-10 text-center text-sm text-muted">Sin resultados.</p>}
            </div>
          )}
        </div>

        <div className="h-fit rounded-3xl border border-line bg-paper p-5 lg:sticky lg:top-6">
          <p className="flex items-center gap-2 font-display text-lg uppercase">
            <ShoppingCart size={18} /> Venta
          </p>
          <div className="mt-4 max-h-[40vh] space-y-2 overflow-y-auto">
            {cart.map((l) => (
              <div key={l.variantId ?? l.sku} className="flex items-center gap-2 rounded-2xl border border-line bg-soft/50 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{l.productName}</p>
                  {l.variantName && <p className="truncate text-[11px] text-muted">{l.variantName}</p>}
                  <p className="text-[11px] font-semibold">{formatPrice(l.unitPrice)}</p>
                </div>
                <button onClick={() => setQty(l.variantId, l.quantity - 1)} className="rounded-full border border-line p-1">
                  <Minus size={12} />
                </button>
                <span className="w-6 text-center text-sm font-bold">{l.quantity}</span>
                <button onClick={() => setQty(l.variantId, l.quantity + 1)} className="rounded-full border border-line p-1">
                  <Plus size={12} />
                </button>
                <button onClick={() => setQty(l.variantId, 0)} className="rounded-full p-1 text-red-500">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {cart.length === 0 && <p className="py-6 text-center text-xs text-muted">Carrito vacío.</p>}
          </div>

          <div className="mt-4 space-y-2">
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nombre del cliente" className="input" />
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Teléfono" className="input" />
            <select value={payment} onChange={(e) => setPayment(e.target.value)} className="input">
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="TARJETA_MANUAL">Tarjeta</option>
              <option value="MIXTO">Mixto</option>
            </select>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <span className="text-sm font-semibold text-muted">Total</span>
            <span className="font-display text-2xl">{formatPrice(subtotal)}</span>
          </div>
          <button onClick={checkout} disabled={saving || cart.length === 0} className="btn-accent mt-3 w-full">
            {saving ? 'Cobrando…' : 'Cobrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
