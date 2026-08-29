'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CheckCircle2, Copy, MessageCircle, Minus, Plus, Search, ShoppingCart, Store, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { METRO_LINES } from '@/data/metro';
import { buildDeliveryOrderMessage, openWhatsApp } from '@/lib/whatsapp';
import { toast } from '@/lib/feedback';
import {
  ApiProduct,
  CartLine,
  CashRegister,
  PAYMENT_LABELS,
  TIME_SLOTS,
  lineKey,
  tomorrowISO,
  todayISO,
  marginOf,
} from '@/components/pos/posTypes';

export function Pos({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [discountPct, setDiscountPct] = useState(0);
  const [discountMode, setDiscountMode] = useState<'percent' | 'amount'>('percent');
  const [discountAmountInput, setDiscountAmountInput] = useState(0);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [payment, setPayment] = useState('EFECTIVO');
  const [mode, setMode] = useState<'LOCAL' | 'METRO'>('LOCAL');
  const [metroLine, setMetroLine] = useState('');
  const [metroStation, setMetroStation] = useState('');
  const [deliveryDay, setDeliveryDay] = useState(tomorrowISO());
  const [deliveryTime, setDeliveryTime] = useState('11:00');
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [shippingInput, setShippingInput] = useState(1000);
  const [cash, setCash] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [saleMsg, setSaleMsg] = useState<string | null>(null);
  const [salePhone, setSalePhone] = useState('');
  const [copied, setCopied] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const load = useCallback(async (initial = true) => {
    if (initial) setLoading(true);
    try {
      const [p, cr] = await Promise.all([
        apiFetch<any[]>('/products/internal', { token }),
        apiFetch<any | null>('/cash-register/current', { token }),
      ]);
      setProducts(
        (p || []).map((x) => ({
          id: x.id,
          name: x.name,
          brand: x.brand,
          sku: x.sku,
          price: x.basePrice ?? x.price,
          costPrice: x.costPrice ?? 0,
          stock: x.stock,
          active: x.isActive !== false,
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
      setCash(
        cr
          ? { id: cr.id, status: cr.isOpen ? 'OPEN' : 'CLOSED', initialAmount: cr.initialAmount, openedAt: cr.openedAt }
          : null,
      );
    } catch (err: any) {
      toast.error(err?.message || 'Error al cargar datos.');
    } finally {
      if (initial) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = products;
    if (category !== 'all') list = list.filter((p) => p.category?.name === category);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => `${p.name} ${p.brand?.name || ''} ${p.sku || ''}`.toLowerCase().includes(q));
    return list;
  }, [products, query, category]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.category?.name) set.add(p.category.name);
    return [...set];
  }, [products]);

  const addToCart = (p: ApiProduct, variantId: string | null) => {
    const v = variantId ? p.variants?.find((x) => x.id === variantId) : null;
    const unitPrice = v?.price ?? p.price;
    const stock = v?.stock ?? p.stock ?? 0;
    const key = variantId ?? p.id;
    setCart((cart) => {
      const existing = cart.find((l) => lineKey(l) === key);
      if (existing) {
        if (existing.quantity >= stock) return cart;
        return cart.map((l) => (lineKey(l) === key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...cart,
        {
          productId: p.id,
          variantId,
          productName: p.name,
          variantName: v?.name || '',
          sku: v?.sku || '',
          unitPrice,
          quantity: 1,
          stock,
        },
      ];
    });
    setDone(null);
    setSaleMsg(null);
  };

  const setQty = (key: string, quantity: number) => {
    setCart((cart) =>
      cart
        .map((l) => (lineKey(l) === key ? { ...l, quantity: Math.max(0, Math.min(l.stock, quantity)) } : l))
        .filter((l) => l.quantity > 0),
    );
  };

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0), [cart]);
  const discountAmount = useMemo(() => {
    if (discountMode === 'amount') return Math.min(subtotal, Math.max(0, discountAmountInput));
    return Math.round((subtotal * discountPct) / 100);
  }, [subtotal, discountPct, discountMode, discountAmountInput]);
  const shippingCost = mode === 'METRO' ? Math.max(0, shippingInput) : 0;
  const total = Math.max(0, subtotal - discountAmount + shippingCost);

  const openRegister = async () => {
    try {
      await apiFetch('/cash-register/open', { method: 'POST', token, body: { initialAmount: 0 } });
      await load(false);
    } catch (err: any) {
      toast.error(err?.message || 'Error al abrir caja.');
    }
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Ingresa nombre y teléfono del cliente.');
      return;
    }
    if (mode === 'METRO' && (!metroLine || !metroStation || !deliveryDay || !deliveryTime)) {
      toast.error('Completa línea, estación, día y hora de entrega.');
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
          deliveryType: mode === 'METRO' ? 'METRO' : 'RETIRO_TIENDA',
          metroLine: mode === 'METRO' ? metroLine : undefined,
          metroStation: mode === 'METRO' ? metroStation : undefined,
          deliveryDay: mode === 'METRO' ? deliveryDay : undefined,
          deliveryTime: mode === 'METRO' ? deliveryTime : undefined,
          subtotal,
          discount: discountAmount,
          shippingCost,
          total,
          paymentMethod: payment,
          items: cart.map((l) => ({
            productId: l.productId,
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
      if (mode === 'LOCAL' || paymentReceived) {
        await apiFetch(`/orders/${order.id}/payment`, {
          method: 'PATCH',
          token,
          body: { paymentMethod: payment, paymentNotes: 'Pago registrado en POS' },
        });
      }
      setDone(order.orderNumber);
      toast.success(mode === 'LOCAL' || paymentReceived ? `Venta ${order.orderNumber} registrada y pagada.` : `Venta ${order.orderNumber} registrada.`);
      if (mode === 'METRO') {
        setSalePhone(customerPhone.trim());
        setSaleMsg(
          buildDeliveryOrderMessage({
            name: customerName.trim(),
            phone: customerPhone.trim(),
            orderNumber: order.orderNumber,
            items: cart.map((l) => ({
              productName: l.productName,
              variantName: l.variantName || undefined,
              quantity: l.quantity,
              total: l.unitPrice * l.quantity,
            })),
            subtotal,
            discount: discountAmount,
            shippingCost,
            total,
            paymentLabel: PAYMENT_LABELS[payment] ?? payment,
            paymentReceived,
            metroLine,
            metroStation,
            deliveryDay,
            deliveryTime,
          }),
        );
      }
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDiscountPct(0);
      setPaymentReceived(false);
      await load(false);
    } catch (err: any) {
      toast.error(err?.message || 'Error al cobrar.');
    } finally {
      setSaving(false);
    }
  };

  const copyMessage = async () => {
    if (!saleMsg) return;
    try {
      await navigator.clipboard.writeText(saleMsg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar. Copia el mensaje manualmente.');
    }
  };

  return (
    <div className="container-px py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">PUNTO DE VENTA</p>
          <h1 className="mt-1 font-display text-2xl uppercase tracking-wide">
            {mode === 'LOCAL' ? 'Cobrar en local' : 'Venta con entrega en metro'}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex overflow-hidden rounded-full border border-line bg-paper">
            <button
              onClick={() => setMode('LOCAL')}
              className={`flex items-center gap-1.5 px-4 py-2 font-bold transition ${mode === 'LOCAL' ? 'bg-ink text-paper' : 'text-muted'}`}
            >
              <Store size={14} /> Local
            </button>
            <button
              onClick={() => setMode('METRO')}
              className={`flex items-center gap-1.5 px-4 py-2 font-bold transition ${mode === 'METRO' ? 'bg-ink text-paper' : 'text-muted'}`}
            >
              <CalendarDays size={14} /> Entrega en metro
            </button>
          </div>
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
          <CheckCircle2 size={20} />
          {mode === 'METRO' && !paymentReceived
            ? `Venta ${done} registrada con entrega agendada. Pago pendiente (contra entrega).`
            : `Venta ${done} registrada y pagada.`}
        </div>
      )}

      {saleMsg && salePhone && (
        <div className="mt-4 rounded-3xl border border-accent/30 bg-paper p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-display text-lg uppercase tracking-wide text-ink">
              <MessageCircle size={18} className="text-emerald-600" />
              Mensaje para el cliente (WhatsApp)
            </p>
            <div className="flex gap-2">
              <button onClick={copyMessage} className="btn-outline px-4 py-2 text-xs">
                <Copy size={13} /> {copied ? '¡Copiado!' : 'Copiar'}
              </button>
              <button
                onClick={() => openWhatsApp(salePhone, saleMsg)}
                className="btn-accent px-4 py-2 text-xs"
              >
                <MessageCircle size={13} /> Enviar por WhatsApp
              </button>
            </div>
          </div>
          <pre className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-line bg-soft/50 p-4 font-mono text-xs leading-relaxed text-ink">
            {saleMsg}
          </pre>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto o SKU… (F1)"
              className="input pl-10"
            />
          </div>
          {categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategory('all')}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${category === 'all' ? 'bg-ink text-paper' : 'border border-line bg-paper text-muted'}`}
              >
                Todos
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${category === c ? 'bg-ink text-paper' : 'border border-line bg-paper text-muted'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
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
                          <span className="flex flex-col items-end">
                            <span className="text-sm font-bold">{formatPrice(v.price)}</span>
                            <span className={`text-[10px] font-semibold ${marginOf(v.price, v.costPrice) >= 35 ? 'text-emerald-600' : marginOf(v.price, v.costPrice) >= 15 ? 'text-accent' : 'text-red-500'}`}>
                              margen {marginOf(v.price, v.costPrice)}%
                            </span>
                          </span>
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
              <div key={lineKey(l)} className="flex items-center gap-2 rounded-2xl border border-line bg-soft/50 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{l.productName}</p>
                  {l.variantName && <p className="truncate text-[11px] text-muted">{l.variantName}</p>}
                  <p className="text-[11px] font-semibold">{formatPrice(l.unitPrice)}</p>
                </div>
                <button onClick={() => setQty(lineKey(l), l.quantity - 1)} className="rounded-full border border-line p-1">
                  <Minus size={12} />
                </button>
                <span className="w-6 text-center text-sm font-bold">{l.quantity}</span>
                <button onClick={() => setQty(lineKey(l), l.quantity + 1)} className="rounded-full border border-line p-1">
                  <Plus size={12} />
                </button>
                <button onClick={() => setQty(lineKey(l), 0)} className="rounded-full p-1 text-red-500">
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

          {mode === 'METRO' && (
            <div className="mt-4 rounded-2xl border border-line bg-soft/40 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Agendar entrega</p>
              <div className="mt-3 space-y-2">
                <select
                  value={metroLine}
                  onChange={(e) => {
                    setMetroLine(e.target.value);
                    setMetroStation('');
                  }}
                  className="input"
                >
                  <option value="">Línea de metro…</option>
                  {METRO_LINES.map((l) => (
                    <option key={l.line} value={l.line}>
                      Línea {l.line}
                    </option>
                  ))}
                </select>
                <select
                  value={metroStation}
                  onChange={(e) => setMetroStation(e.target.value)}
                  disabled={!metroLine}
                  className="input"
                >
                  <option value="">Estación…</option>
                  {(METRO_LINES.find((l) => l.line === metroLine)?.stations || []).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={deliveryDay}
                  min={todayISO()}
                  onChange={(e) => setDeliveryDay(e.target.value)}
                  className="input"
                />
                <select value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} className="input">
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>
                      {t} hrs
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted">Envío ($)</span>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={shippingInput}
                    onChange={(e) => setShippingInput(Math.max(0, Number(e.target.value) || 0))}
                    className="input w-full text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={paymentReceived}
                    onChange={(e) => setPaymentReceived(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Ya recibí el pago ({PAYMENT_LABELS[payment] ?? payment})
                </label>
              </div>
            </div>
          )}

          {cart.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Descuento</p>
                <div className="flex rounded-full border border-line">
                  <button
                    onClick={() => { setDiscountMode('percent'); setDiscountAmountInput(0); }}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${discountMode === 'percent' ? 'bg-ink text-white' : 'text-muted'}`}
                  >
                    %
                  </button>
                  <button
                    onClick={() => { setDiscountMode('amount'); setDiscountPct(0); }}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${discountMode === 'amount' ? 'bg-ink text-white' : 'text-muted'}`}
                  >
                    $
                  </button>
                </div>
              </div>
              {discountMode === 'percent' ? (
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setDiscountPct(pct)}
                      className={`rounded-full border px-1 py-1.5 text-[11px] font-bold transition ${discountPct === pct ? 'border-accent bg-accent text-ink' : 'border-line bg-paper text-muted'}`}
                    >
                      {pct === 0 ? '0%' : `-${pct}%`}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm font-bold text-muted">$</span>
                  <input
                    type="number"
                    min={0}
                    max={subtotal}
                    step={100}
                    value={discountAmountInput || ''}
                    onChange={(e) => setDiscountAmountInput(Math.min(subtotal, Math.max(0, Number(e.target.value) || 0)))}
                    placeholder="0"
                    className="input w-full text-sm"
                  />
                  <button
                    onClick={() => setDiscountAmountInput(0)}
                    className="shrink-0 rounded-full border border-line px-2 py-1 text-[10px] font-bold text-muted hover:border-ink hover:text-ink"
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 border-t border-line pt-3 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Descuento ({discountMode === 'percent' ? `-${discountPct}%` : `-${formatPrice(discountAmount)}`})</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            {shippingCost > 0 && (
              <div className="flex justify-between text-muted">
                <span>Envío (metro)</span>
                <span>{formatPrice(shippingCost)}</span>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted">Total</span>
              <span className="font-display text-2xl">{formatPrice(total)}</span>
            </div>
          </div>
          <button onClick={checkout} disabled={saving || cart.length === 0} className="btn-accent mt-3 w-full">
            {saving ? 'Procesando…' : mode === 'METRO' ? 'Registrar venta con entrega' : 'Cobrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
