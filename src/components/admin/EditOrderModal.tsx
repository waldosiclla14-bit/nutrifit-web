'use client';

import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Search } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { toast } from '@/lib/feedback';
import { METRO_LINES } from '@/data/metro';
import { PAYMENT_LABEL } from '@/lib/admin/constants';
import type { AdminOrder } from '@/types/admin';

export function EditOrderModal({
  order,
  token,
  busy,
  onClose,
  onSaved,
}: {
  order: AdminOrder;
  token: string;
  busy: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [lines, setLines] = useState<
    { key: string; productId?: string; variantId?: string; productName: string; variantName: string; sku: string; unitPrice: number; quantity: number }[]
  >(
    (order.items || []).map((i) => ({
      key: i.id,
      productId: i.productId || undefined,
      variantId: i.variantId || undefined,
      productName: i.productName,
      variantName: i.variantName || '',
      sku: i.sku || '',
      unitPrice: i.unitPrice,
      quantity: i.quantity,
    })),
  );
  const [deliveryType, setDeliveryType] = useState<'METRO' | 'STORE'>(order.deliveryType === 'METRO' ? 'METRO' : 'STORE');
  const [metroLine, setMetroLine] = useState(order.metroLine || '1');
  const [metroStation, setMetroStation] = useState(order.metroStation || '');
  const [deliveryDay, setDeliveryDay] = useState(order.deliveryDay || '');
  const [deliveryTime, setDeliveryTime] = useState(order.deliveryTime || '');
  const [method, setMethod] = useState(order.paymentMethod || 'TRANSFERENCIA');
  const [discount, setDiscount] = useState(String(order.discount || 0));
  const [shippingCost, setShippingCost] = useState(String(order.shippingCost || 0));

  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalog, setCatalog] = useState<{ id: string; name: string; variants: { id: string; variantName: string; sku: string; price: number }[] }[] | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<AdminOrder>(`/orders/${order.id}`, { token })
      .then((full) => {
        if (!active) return;
        setLines(
          (full.items || []).map((i) => ({
            key: i.id,
            productId: i.productId || undefined,
            variantId: i.variantId || undefined,
            productName: i.productName,
            variantName: i.variantName || '',
            sku: i.sku || '',
            unitPrice: i.unitPrice,
            quantity: i.quantity,
          })),
        );
        if (full.deliveryType) setDeliveryType(full.deliveryType === 'METRO' ? 'METRO' : 'STORE');
        if (full.metroLine) setMetroLine(full.metroLine);
        if (full.metroStation) setMetroStation(full.metroStation);
        if (full.deliveryDay) setDeliveryDay(full.deliveryDay);
        if (full.deliveryTime) setDeliveryTime(full.deliveryTime);
        if (full.paymentMethod) setMethod(full.paymentMethod);
        if (full.discount != null) setDiscount(String(full.discount));
        if (full.shippingCost != null) setShippingCost(String(full.shippingCost));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [order.id, token]);

  const subtotal = lines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0);
  const disc = Number(discount) || 0;
  const ship = Number(shippingCost) || 0;
  const total = Math.max(0, subtotal - disc + ship);

  const setQty = (key: string, qty: number) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, quantity: Math.max(0, qty) } : l)));

  const loadCatalog = async () => {
    if (catalog) return;
    setCatalogLoading(true);
    try {
      const p = await apiFetch<any[]>('/products/internal', { token });
      setCatalog(
        (p || []).map((x: any) => ({
          id: x.id,
          name: x.name || x.sku || 'Producto',
          variants: (x.variants || []).map((v: any) => ({
            id: v.id,
            variantName: v.variantName || v.name || 'Sin variante',
            sku: v.sku,
            price: v.price,
          })),
        })),
      );
    } catch {
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  };

  const catalogFiltered = useMemo(() => {
    if (!catalog) return [];
    const q = catalogQuery.trim().toLowerCase();
    return catalog.filter((p) => {
      const name = `${p.name}`.toLowerCase();
      const varMatch = p.variants.some((v) => `${v.variantName} ${v.sku}`.toLowerCase().includes(q));
      return name.includes(q) || varMatch;
    });
  }, [catalog, catalogQuery]);

  const addLine = (productId: string, productName: string, variant: { id: string; variantName: string; sku: string; price: number }) => {
    setLines((ls) => {
      const existing = ls.find((l) => l.variantId === variant.id);
      if (existing) {
        return ls.map((l) => (l.key === existing.key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...ls,
        {
          key: `${variant.id}-${Date.now()}`,
          productId,
          variantId: variant.id,
          productName,
          variantName: variant.variantName,
          sku: variant.sku,
          unitPrice: variant.price,
          quantity: 1,
        },
      ];
    });
  };

  const save = async () => {
    const validLines = lines.filter((l) => l.quantity > 0);
    if (validLines.length === 0) {
      toast.error('La orden debe tener al menos un producto.');
      return;
    }
    const items = validLines.map((l) => ({
      productId: l.productId ?? null,
      variantId: l.variantId ?? null,
      productName: l.productName,
      variantName: l.variantName,
      sku: l.sku,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      total: l.unitPrice * l.quantity,
    }));
    await apiFetch(`/orders/${order.id}`, {
      method: 'PATCH',
      token,
      body: {
        customerId: order.customer?.id,
        customerName: order.customer?.name || order.customerName || '',
        customerPhone: order.customer?.phone || order.customerPhone || '',
        deliveryType,
        metroLine: deliveryType === 'METRO' ? metroLine : undefined,
        metroStation: deliveryType === 'METRO' ? metroStation : undefined,
        deliveryDay: deliveryType === 'METRO' ? deliveryDay || null : null,
        deliveryTime: deliveryType === 'METRO' ? deliveryTime || null : null,
        subtotal,
        discount: disc,
        shippingCost: ship,
        total,
        paymentMethod: method,
        items,
      },
    });
    onSaved();
  };

  const stationOptions = METRO_LINES.find((l) => l.line === metroLine)?.stations || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-line bg-paper" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-line p-6">
          <p className="font-display text-xl uppercase">Editar orden</p>
          <p className="mt-1 text-sm text-muted">
            {order.orderNumber} · {order.customer?.name || ''} ({order.customer?.phone || ''})
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Productos</p>
          <div className="mt-2 space-y-2">
            {lines.filter((l) => l.quantity > 0).map((l) => (
              <div key={l.key} className="flex items-center gap-3 rounded-2xl border border-line bg-soft p-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{l.variantName || l.productName}</p>
                  <p className="text-[11px] text-muted">{formatPrice(l.unitPrice)} c/u</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setQty(l.key, l.quantity - 1)} className="rounded-full border border-line bg-paper px-2 py-1 text-sm font-bold">
                    <Minus size={13} />
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={l.quantity}
                    onChange={(e) => setQty(l.key, Number(e.target.value))}
                    className="input w-16 px-2 py-1 text-center"
                  />
                  <button onClick={() => setQty(l.key, l.quantity + 1)} className="rounded-full border border-line bg-paper px-2 py-1 text-sm font-bold">
                    <Plus size={13} />
                  </button>
                </div>
                <p className="w-20 text-right text-sm font-bold">{formatPrice(l.unitPrice * l.quantity)}</p>
              </div>
            ))}
            {lines.filter((l) => l.quantity > 0).length === 0 && (
              <p className="py-4 text-center text-sm text-muted">Sin productos. Agrega productos abajo.</p>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-line bg-soft p-3">
            <button onClick={loadCatalog} className="btn-outline px-3 py-1.5 text-[11px]">
              {catalogLoading ? 'Cargando…' : catalog ? 'Buscar producto' : 'Cargar catálogo'}
            </button>
            {catalog && (
              <div className="mt-2">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    value={catalogQuery}
                    onChange={(e) => setCatalogQuery(e.target.value)}
                    placeholder="Buscar producto o variante…"
                    className="input mt-0 pl-8"
                  />
                </div>
                <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                  {catalogFiltered.map((p) => (
                    <div key={p.id} className="rounded-xl border border-line bg-paper p-2">
                      <p className="text-xs font-semibold">{p.name}</p>
                      {p.variants.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => addLine(p.id, p.name, v)}
                          className="mt-1 flex w-full items-center justify-between rounded-lg px-2 py-1 text-[11px] text-left hover:bg-accent/10"
                        >
                          <span>{v.variantName || 'Único'} · {formatPrice(v.price)}</span>
                          <Plus size={12} />
                        </button>
                      ))}
                    </div>
                  ))}
                  {catalogFiltered.length === 0 && <p className="py-2 text-center text-xs text-muted">Sin resultados.</p>}
                </div>
              </div>
            )}
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-muted">Entrega</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-muted">Tipo</span>
              <select
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value as 'METRO' | 'STORE')}
                className="input mt-1"
              >
                <option value="METRO">Entrega en Metro</option>
                <option value="STORE">Retiro tienda</option>
              </select>
            </label>
            {deliveryType === 'METRO' && (
              <>
                <label className="block">
                  <span className="text-xs font-semibold text-muted">Línea</span>
                  <select
                    value={metroLine}
                    onChange={(e) => {
                      setMetroLine(e.target.value);
                      setMetroStation('');
                    }}
                    className="input mt-1"
                  >
                    {METRO_LINES.map((l) => (
                      <option key={l.line} value={l.line}>Línea {l.line}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted">Estación</span>
                  <select value={metroStation} onChange={(e) => setMetroStation(e.target.value)} className="input mt-1">
                    <option value="">Seleccionar…</option>
                    {stationOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted">Día</span>
                  <input type="date" value={deliveryDay} onChange={(e) => setDeliveryDay(e.target.value)} className="input mt-1" />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted">Hora</span>
                  <input type="time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} className="input mt-1" />
                </label>
              </>
            )}
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-muted">Cobro</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs font-semibold text-muted">Método de pago</span>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="input mt-1">
                {Object.keys(PAYMENT_LABEL).map((m) => (
                  <option key={m} value={m}>{PAYMENT_LABEL[m]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted">Descuento ($)</span>
              <input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} className="input mt-1" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted">Envío ($)</span>
              <input type="number" min={0} value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} className="input mt-1" />
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-4 text-sm">
            <span className="text-muted">Subtotal <b className="text-ink">{formatPrice(subtotal)}</b></span>
            <span className="text-muted">Total <b className="text-ink">{formatPrice(total)}</b></span>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line p-6">
          <button onClick={onClose} className="btn-outline px-4 py-2 text-xs">
            Cancelar
          </button>
          <button onClick={save} disabled={busy} className="btn-accent px-4 py-2 text-xs disabled:opacity-50">
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}