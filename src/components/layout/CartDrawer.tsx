'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  CheckCircle2,
  Gift,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/lib/store-hooks';
import { PRODUCTS } from '@/data/seed';
import { METRO_LINES } from '@/data/metro';
import { formatPrice, uid } from '@/lib/utils';
import { buildWhatsAppMessage, openWhatsApp } from '@/lib/whatsapp';
import { getSettings, saveOrder } from '@/lib/store';
import { submitStoreOrder } from '@/lib/api';
import TrustBadges from '@/components/ui/TrustBadges';
import type { Order, OrderItem } from '@/types';

const DELIVERY_TIME_OPTIONS = [
  'Lo antes posible',
  '09:00 – 11:00',
  '11:00 – 13:00',
  '13:00 – 15:00',
  '15:00 – 17:00',
  '17:00 – 19:00',
  '19:00 – 21:00',
];

export default function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    subtotal,
    rewardDiscount,
    shipping,
    total,
    itemCount,
    freeShippingFrom,
    clearCart,
    addItem,
  } = useCart();
  const settings = useSettings();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [metroLine, setMetroLine] = useState('');
  const [metroStation, setMetroStation] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [payment, setPayment] = useState('');
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState(false);
  const [offerAdded, setOfferAdded] = useState<number | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [syncStatus, setSyncStatus] = useState<'ok' | 'offline'>('ok');

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    setMetroStation('');
  }, [metroLine]);

  const giftEnabled = (settings.giftThreshold ?? 0) > 0 && !!settings.giftProductId;
  const giftProgress =
    subtotal === 0 || !giftEnabled
      ? 0
      : Math.min(100, (subtotal / (settings.giftThreshold ?? 1)) * 100);
  const giftRemaining = Math.max(0, (settings.giftThreshold ?? 0) - subtotal);
  const hasGift = items.some((i) => i.isGift);
  const giftProduct = hasGift
    ? PRODUCTS.find((p) => p.id === settings.giftProductId)
    : undefined;

  const rewardEnabled = (settings.rewardThreshold ?? 0) > 0;
  const rewardProgress =
    subtotal === 0 || !rewardEnabled
      ? 0
      : Math.min(100, (subtotal / (settings.rewardThreshold ?? 1)) * 100);
  const rewardRemaining = Math.max(0, (settings.rewardThreshold ?? 0) - subtotal);

  const selectedLine = METRO_LINES.find((l) => l.line === metroLine);
  const remaining = Math.max(0, freeShippingFrom - subtotal);
  const progress = Math.min(100, (subtotal / freeShippingFrom) * 100);

  const cartIds = useMemo(() => new Set(items.map((i) => i.productId)), [items]);
  const firstPaid = items.find((i) => !i.isGift);
  const firstCategory = firstPaid
    ? PRODUCTS.find((p) => p.id === firstPaid.productId)?.category
    : undefined;
  const suggested = useMemo(() => {
    const available = PRODUCTS.filter((p) => p.stock > 0 && !cartIds.has(p.id));
    const inCategory = available.filter((p) =>
      firstCategory ? p.category === firstCategory : true,
    );
    const otherCategory = available.filter((p) =>
      firstCategory ? p.category !== firstCategory : false,
    );
    return [...inCategory, ...otherCategory].slice(0, 2);
  }, [cartIds, firstCategory]);

  const toOrderItems = (): OrderItem[] =>
    items.map((i) => ({
      productId: i.productId,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      image: i.image,
    }));

  const checkout = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Completa tu nombre y teléfono.');
      return;
    }
    if (!metroLine || !metroStation) {
      setError('Elige tu línea y estación de metro.');
      return;
    }
    if (!deliveryTime) {
      setError('Elige la hora de entrega.');
      return;
    }
    if (!payment) {
      setError('Elige tu método de pago.');
      return;
    }

    const order: Order = {
      id: uid('NF'),
      name: name.trim(),
      phone: phone.trim(),
      metroLine,
      metroStation: metroStation.trim(),
      deliveryTime,
      payment,
      items: toOrderItems(),
      subtotal,
      discount: rewardDiscount || undefined,
      shipping,
      total,
      status: 'nuevo',
      createdAt: Date.now(),
    };

    saveOrder(order);
    openWhatsApp(getSettings().whatsapp, buildWhatsAppMessage(order));
    setLastOrder(order);
    setPlaced(true);
    setError('');

    submitStoreOrder(order)
      .then(() => setSyncStatus('ok'))
      .catch(() => setSyncStatus('offline'));
  };

  const finishOrder = () => {
    clearCart();
    setPlaced(false);
    setOfferAdded(null);
    setLastOrder(null);
    closeCart();
  };

  const addToOrder = (p: (typeof PRODUCTS)[number]) => {
    if (!lastOrder) return;
    const itemsNext: OrderItem[] = [...lastOrder.items];
    const existing = itemsNext.find((i) => i.productId === p.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      itemsNext.push({ productId: p.id, name: p.name, price: p.price, quantity: 1, image: p.image });
    }
    const subtotalNext = lastOrder.subtotal + p.price;
    const shippingNext =
      subtotalNext >= settings.freeShippingFrom ? 0 : settings.shipping;
    const message = buildWhatsAppMessage({
      ...lastOrder,
      items: itemsNext,
      subtotal: subtotalNext,
      shipping: shippingNext,
      total: Math.max(0, subtotalNext - (lastOrder.discount ?? 0) + shippingNext),
    });
    openWhatsApp(getSettings().whatsapp, message);
    setOfferAdded(p.id);
  };

  const offerProducts = lastOrder
    ? PRODUCTS.filter(
        (p) =>
          p.stock > 0 && !lastOrder.items.some((i) => i.productId === p.id),
      )
        .sort((a, b) => {
          const aSame = a.category === firstCategory ? 0 : 1;
          const bSame = b.category === firstCategory ? 0 : 1;
          return aSame - bSame || a.price - b.price;
        })
        .slice(0, 2)
    : [];

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={placed ? finishOrder : closeCart}
        aria-hidden="true"
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-paper shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Carrito de compras"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-display text-xl uppercase tracking-wide">
            {placed ? 'Pedido enviado' : 'Tu Carrito'}
            {!placed && itemCount > 0 && (
              <span className="ml-1 text-sm font-normal text-muted">({itemCount})</span>
            )}
          </h3>
          <button
            type="button"
            onClick={placed ? finishOrder : closeCart}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-soft"
          >
            <X size={18} />
          </button>
        </div>

        {placed ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-6 py-8 text-center">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-ink"
            >
              <CheckCircle2 size={32} />
            </motion.div>
            <p className="font-display text-2xl uppercase tracking-wide">¡Pedido casi listo!</p>
            <p className="text-sm leading-relaxed text-muted">
              Abrimos WhatsApp con tu pedido listo para enviar. Solo presiona enviar y te
              confirmamos el punto de entrega en tu estación de metro.
            </p>
            <p
              className={`text-xs font-semibold ${
                syncStatus === 'ok' ? 'text-accentDeep' : 'text-muted'
              }`}
            >
              {syncStatus === 'ok'
                ? '✓ Pedido registrado en el sistema del local'
                : 'No pudimos sincronizar con el local; tu pedido va por WhatsApp igualmente.'}
            </p>

            {offerProducts.length > 0 && (
              <div className="mt-2 w-full rounded-3xl border border-accent/60 bg-accent/10 p-5 text-left">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-accentDeep">
                  <Plus size={13} /> ¿Agregas un complemento?
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  Añádelo a tu pedido y lo incluimos sin costo de envío
                </p>
                <div className="mt-4 grid gap-3">
                  {offerProducts.map((p) => {
                    const added = offerAdded === p.id;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-3"
                      >
                        <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-soft">
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            sizes="56px"
                            className="object-contain p-1"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{p.name}</p>
                          <p className="text-xs text-muted">{formatPrice(p.price)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addToOrder(p)}
                          disabled={added}
                          className="btn-accent !px-4 !py-2 text-xs"
                        >
                          {added ? 'Añadido' : 'Añadir'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Link href="/productos" onClick={finishOrder} className="btn-primary">
                Seguir comprando
              </Link>
              <button type="button" onClick={finishOrder} className="btn-outline">
                Volver al inicio
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <ShoppingBagEmpty />
            <p className="font-semibold">Tu carrito está vacío</p>
            <p className="text-sm text-muted">Agrega tus suplementos favoritos y finaliza tu pedido por WhatsApp.</p>
            <Link href="/productos" onClick={closeCart} className="btn-primary mt-2">
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="border-b border-line px-5 py-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-muted">
                  <Truck size={14} /> Envío gratis en metro
                </span>
                <span className="text-accentDeep">
                  {remaining > 0 ? `Te faltan ${formatPrice(remaining)}` : '¡Aplicado!'}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-soft2">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>

              {giftEnabled && (
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-soft2">
                    <motion.div
                      className="h-full rounded-full bg-ink"
                      initial={{ width: 0 }}
                      animate={{ width: `${giftProgress}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  {hasGift && giftProduct ? (
                    <div className="mt-2 flex items-center gap-2 rounded-xl bg-accent/20 px-3 py-2">
                      <Gift size={14} className="shrink-0 text-accentDeep" />
                      <p className="text-xs font-semibold text-ink">
                        ¡Recibes un regalo! {giftProduct.name}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted">
                      Te faltan{' '}
                      <span className="font-semibold text-ink">{formatPrice(giftRemaining)}</span>{' '}
                      para {settings.giftLabel ?? 'recibir un regalo'}
                    </p>
                  )}
                </div>
              )}

              {rewardEnabled && (
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-soft2">
                    <motion.div
                      className="h-full rounded-full bg-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${rewardProgress}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {rewardDiscount > 0 ? (
                      <span className="font-semibold text-accentDeep">
                        ¡Tienes {settings.rewardPercent}% de descuento aplicado!
                      </span>
                    ) : (
                      <>
                        Te faltan{' '}
                        <span className="font-semibold text-ink">
                          {formatPrice(rewardRemaining)}
                        </span>{' '}
                        para un {settings.rewardPercent}% de descuento
                      </>
                    )}
                  </p>
                </div>
              )}

              <p className="mt-3 text-[11px] font-semibold text-muted">
                <span className="text-accentDeep">Entrega en Metro de Santiago</span> · Líneas 1, 2,
                3, 4, 4A, 5 y 6
              </p>
            </div>

            <div className="px-5 py-4">
              <ul className="space-y-4">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.li
                      key={item.key}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      className="flex gap-3.5"
                    >
                      <Link href={`/productos/${item.slug}`} onClick={closeCart} className="shrink-0">
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={72}
                          height={72}
                          className="h-[72px] w-[72px] rounded-xl border border-line object-cover"
                        />
                      </Link>
                      <div className="flex flex-1 flex-col">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug">{item.name}</p>
                        {item.isGift && (
                          <span className="mt-1 w-fit rounded-full bg-accent/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accentDeep">
                            Regalo
                          </span>
                        )}
                        <div className="mt-1 flex items-center justify-between">
                          {item.isGift ? (
                            <span className="text-xs font-semibold text-accentDeep">Gratis</span>
                          ) : (
                            <div className="flex items-center rounded-full border border-line">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.key, item.quantity - 1)}
                                aria-label="Disminuir cantidad"
                                className="flex h-7 w-7 items-center justify-center rounded-l-full transition-colors hover:bg-soft"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.key, item.quantity + 1)}
                                aria-label="Aumentar cantidad"
                                className="flex h-7 w-7 items-center justify-center rounded-r-full transition-colors hover:bg-soft"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          )}
                          {!item.isGift && (
                            <button
                              type="button"
                              onClick={() => removeItem(item.key)}
                              aria-label="Eliminar producto"
                              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          {item.discount > 0 && !item.isGift && (
                            <span className="text-xs text-muted line-through">
                              {formatPrice((item.price + item.discount) * item.quantity)}
                            </span>
                          )}
                          <span className={`text-sm font-bold ${item.isGift ? 'text-accentDeep' : 'text-accentDeep'}`}>
                            {item.isGift ? 'Gratis' : formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              {suggested.length > 0 && (
                <div className="mt-6 border-t border-line pt-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted">
                    Completa tu pedido
                  </p>
                  <div className="flex flex-col gap-3">
                    {suggested.map((p) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-soft">
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            sizes="56px"
                            className="object-contain p-1"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/productos/${p.slug}`}
                            onClick={closeCart}
                            className="block truncate text-sm font-semibold hover:text-accentDeep"
                          >
                            {p.name}
                          </Link>
                          <p className="text-xs text-muted">{formatPrice(p.price)}</p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Agregar ${p.name}`}
                          onClick={() =>
                            addItem({
                              productId: p.id,
                              slug: p.slug,
                              name: p.name,
                              price: p.price,
                              oldPrice: p.oldPrice,
                              discount: Math.max(0, (p.oldPrice ?? p.price) - p.price),
                              image: p.image,
                              quantity: 1,
                            })
                          }
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition-colors hover:bg-accent hover:text-ink"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-line px-5 py-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Subtotal</span>
                  <span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>
                {rewardDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-accentDeep">Descuento meta ({settings.rewardPercent}%)</span>
                    <span className="font-semibold text-accentDeep">
                      -{formatPrice(rewardDiscount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted">Entrega en metro</span>
                  <span className={`font-semibold ${shipping === 0 ? 'text-accentDeep' : ''}`}>
                    {shipping === 0 ? 'GRATIS' : formatPrice(shipping)}
                  </span>
                </div>
              </div>

              <TrustBadges className="mt-4" />

              <form id="checkout-form" onSubmit={checkout} className="mt-4 space-y-2.5">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre completo"
                  aria-label="Nombre completo"
                  className="input"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Teléfono (ej: 9 8765 4321)"
                  aria-label="Teléfono"
                  className="input"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <select
                    value={metroLine}
                    onChange={(e) => setMetroLine(e.target.value)}
                    aria-label="Línea de Metro"
                    className="input"
                  >
                    <option value="">Línea...</option>
                    {METRO_LINES.map((l) => (
                      <option key={l.line} value={l.line}>
                        Línea {l.line}
                      </option>
                    ))}
                  </select>
                  <select
                    value={metroStation}
                    onChange={(e) => setMetroStation(e.target.value)}
                    aria-label="Estación de metro"
                    className="input"
                  >
                    <option value="">Estación...</option>
                    {selectedLine?.stations.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <select
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  aria-label="Hora de entrega"
                  className="input"
                >
                  <option value="">Hora de entrega...</option>
                  {DELIVERY_TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                  aria-label="Método de pago"
                  className="input"
                >
                  <option value="">Método de pago...</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                </select>
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1 text-[11px] font-semibold text-muted">
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={13} className="text-accentDeep" /> Garantía 30 días
                  </span>
                  <span className="flex items-center gap-1">
                    <BadgeCheck size={13} className="text-accentDeep" /> Productos originales
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle size={13} className="text-accentDeep" /> Confirmación por WhatsApp
                  </span>
                </div>
              </form>
            </div>
            </div>

            <div className="shrink-0 border-t border-line bg-paper px-5 py-4">
              {error && <p className="mb-2 text-xs font-semibold text-red-500">{error}</p>}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-muted">Total</span>
                <span className="font-display text-xl">{formatPrice(total)}</span>
              </div>
              <button type="submit" form="checkout-form" className="btn-accent w-full">
                Finalizar compra por WhatsApp
              </button>
              <p className="mt-2 text-center text-[11px] leading-relaxed text-muted">
                Abrirás WhatsApp con tu pedido listo para confirmar. Coordinamos la entrega en tu
                estación de metro.
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function ShoppingBagEmpty() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-soft">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    </div>
  );
}
