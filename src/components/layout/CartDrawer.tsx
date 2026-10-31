'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  Banknote,
  Check,
  CheckCircle2,
  Gift,
  Landmark,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/lib/store-hooks';
import { BUNDLES, PRODUCTS } from '@/data/seed';
import { METRO_LINES } from '@/data/metro';
import { formatPrice, uid, verifiedOldPrice, lineDiscount } from '@/lib/utils';
import { buildWhatsAppMessage, openWhatsApp, paymentLabel, normalizeChilePhone } from '@/lib/whatsapp';
import { getSettings, getCustomerProfile, saveCustomerProfile, takePendingCoupon, saveOrder } from '@/lib/store';
import { submitStoreOrder } from '@/lib/api';
import { siteConfig } from '@/lib/site-config';
import type { Order, OrderItem, PaymentChoice } from '@/types';

/** Campos del checkout que muestran error en línea (Fase 2.1). */
type FieldName = 'name' | 'phone' | 'metroLine' | 'metroStation';

const PAYMENT_OPTIONS: Array<{
  value: PaymentChoice;
  label: string;
  hint: string;
  icon: typeof Banknote;
}> = [
  { value: 'efectivo', label: 'Efectivo', hint: 'al recibir', icon: Banknote },
  { value: 'transferencia', label: 'Transferencia', hint: 'datos por WhatsApp', icon: Landmark },
];

/** Borde de error sobre la clase `.input` compartida. */
function fieldClass(invalid: boolean) {
  return invalid ? 'input !border-red-500' : 'input';
}

export default function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    subtotal,
    rewardDiscount,
    couponDiscount,
    couponCode,
    couponPhone,
    couponPercent,
    activeDiscount,
    shipping,
    total,
    itemCount,
    clearCart,
    addItem,
    applyCoupon,
    clearCoupon,
  } = useCart();
  const settings = useSettings();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [metroLine, setMetroLine] = useState('');
  const [metroStation, setMetroStation] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [payment, setPayment] = useState<PaymentChoice>('efectivo');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [placed, setPlaced] = useState(false);
  const [offerAdded, setOfferAdded] = useState<number | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [syncStatus, setSyncStatus] = useState<'ok' | 'offline'>('ok');
  const [waFailed, setWaFailed] = useState(false);
  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    metroLine: useRef<HTMLSelectElement>(null),
    metroStation: useRef<HTMLSelectElement>(null),
  };

  const clearFieldError = (field: FieldName) =>
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!metroLine) return;
    setMetroStation((prev) => (prev && METRO_LINES.some((l) => l.line === metroLine && l.stations.includes(prev)) ? prev : ''));
  }, [metroLine]);

  // Precarga los datos del cliente en compras recurrentes (una sola vez).
  useEffect(() => {
    const profile = getCustomerProfile();
    if (profile) {
      setName((v) => v || profile.name);
      setPhone((v) => v || profile.phone);
      if (profile.metroLine) setMetroLine((v) => v || profile.metroLine!);
      if (profile.metroStation) setMetroStation((v) => v || profile.metroStation!);
      if (profile.paymentMethod) setPayment(profile.paymentMethod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Consume un cupón pendiente (p. ej. del modal de primera compra) al abrir
  // el carrito. Si ya hay teléfono, se aplica automáticamente.
  const pendingHandled = useRef(false);
  useEffect(() => {
    if (!isOpen || pendingHandled.current) return;
    pendingHandled.current = true;
    const code = takePendingCoupon();
    if (!code) return;
    setCouponInput(code);
    if (phone.trim() && items.length > 0) {
      applyCoupon(code, phone)
        .then(() => setCouponInput(''))
        .catch((err: unknown) => setCouponError((err as Error)?.message || 'Cupón inválido.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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

  useEffect(() => {
    if (!couponCode || !couponPhone) return;
    const currentPhone = phone.replace(/\D/g, '');
    if (currentPhone && currentPhone !== couponPhone) {
      clearCoupon();
      setCouponInput('');
      setCouponError('El cupón está ligado a otro teléfono. Vuelve a aplicarlo.');
    }
  }, [phone, couponCode, couponPhone, clearCoupon]);

  const cartIds = useMemo(() => new Set(items.map((i) => i.productId)), [items]);
  const cartCategories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      const product = PRODUCTS.find((p) => p.id === i.productId);
      if (product) set.add(product.category);
    });
    return set;
  }, [items]);

  // Venta cruzada: complementa el pedido, no repite lo que ya está.
  // Primero categorías ausentes del carrito (proteína ⇒ creatina, etc.);
  // solo si no quedan, se ofrecen más productos de una categoría presente.
  const suggested = useMemo(() => {
    const available = PRODUCTS.filter((p) => p.stock > 0 && !cartIds.has(p.id));
    const newCategory = available.filter((p) => !cartCategories.has(p.category));
    const sameCategory = available.filter((p) => cartCategories.has(p.category));
    return (newCategory.length > 0 ? newCategory : sameCategory)
      .sort((a, b) => b.rating - a.rating || a.price - b.price)
      .slice(0, 2);
  }, [cartIds, cartCategories]);

  // Aviso del pack: si el carrito ya contiene todos sus productos, se muestra
  // el precio de pack y el ahorro real. No se cambia el precio automáticamente:
  // el pedido se cierra por WhatsApp y ahí se confirma (Fase 2.5).
  const bundleOffer = useMemo(() => {
    const paid = items.filter((i) => !i.isGift);
    return BUNDLES.find(
      (b) =>
        b.pricing === 'fixed' &&
        !!b.fixedPrice &&
        b.items.every(
          (bi) => paid.find((i) => i.productId === bi.productId)?.quantity === bi.quantity,
        ),
    );
  }, [items]);
  const bundleSaving = bundleOffer
    ? bundleOffer.items.reduce((acc, bi) => {
        const product = PRODUCTS.find((p) => p.id === bi.productId);
        return acc + (product?.price ?? 0) * bi.quantity;
      }, 0) - (bundleOffer.fixedPrice ?? 0)
    : 0;

  const toOrderItems = (): OrderItem[] =>
    items.map((i) => ({
      productId: i.productId,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      image: i.image,
    }));

  const validateCheckout = (): Partial<Record<FieldName, string>> => {
    const next: Partial<Record<FieldName, string>> = {};
    if (!name.trim()) next.name = 'Escribe tu nombre.';
    if (!phone.trim()) next.phone = 'Escribe tu teléfono.';
    else if (!normalizeChilePhone(phone)) next.phone = 'Usa un celular chileno: 9 1234 5678.';
    else if (couponCode && couponPhone && phone.replace(/\D/g, '') !== couponPhone) {
      next.phone = 'El cupón está ligado a otro teléfono.';
    }
    if (!metroLine) next.metroLine = 'Elige tu línea.';
    if (!metroStation) next.metroStation = 'Elige tu estación.';
    return next;
  };

  const checkout = (e: FormEvent) => {
    e.preventDefault();
    const errors = validateCheckout();
    setFieldErrors(errors);
    const order_: FieldName[] = ['name', 'phone', 'metroLine', 'metroStation'];
    const firstInvalid = order_.find((field) => errors[field]);
    if (firstInvalid) {
      // Lleva el foco al primer campo con error: en móvil el botón queda lejos
      // del formulario y sin esto el usuario no sabe qué corregir (Fase 2.1).
      fieldRefs[firstInvalid].current?.focus({ preventScroll: true });
      fieldRefs[firstInvalid].current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    const order: Order = {
      id: uid('NF'),
      name: name.trim(),
      phone: phone.trim(),
      metroLine,
      metroStation: metroStation.trim(),
      paymentMethod: payment,
      couponCode: couponCode || undefined,
      items: toOrderItems(),
      subtotal,
      discount: activeDiscount || undefined,
      shipping,
      total,
      status: 'nuevo',
      createdAt: Date.now(),
    };

    saveOrder(order);
    saveCustomerProfile({
      name: order.name,
      phone: order.phone,
      deliveryMethod: 'metro',
      metroLine: order.metroLine,
      metroStation: order.metroStation,
      paymentMethod: payment,
    });
    // Copia el pedido al portapapeles de respaldo: si WhatsApp no precarga el
    // texto, el cliente lo pega y el pedido no se pierde.
    setWaFailed(
      openWhatsApp(getSettings().whatsapp, buildWhatsAppMessage(order), { copy: true }) ===
        'invalid_phone',
    );
    setLastOrder(order);
    setPlaced(true);
    setFieldErrors({});

    submitStoreOrder(order)
      .then(() => setSyncStatus('ok'))
      .catch((err) => {
        console.error('[store sync]', err?.prismaCode ? { prismaCode: err.prismaCode, meta: err.meta, message: err.message } : err);
        setSyncStatus('offline');
      });
  };

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponInput.trim()) {
      setCouponError('Ingresa un código.');
      return;
    }
    if (!phone.trim()) {
      setCouponError('Ingresa tu teléfono antes de aplicar el cupón.');
      return;
    }
    setCouponLoading(true);
    try {
      await applyCoupon(couponInput, phone);
      setCouponInput('');
    } catch (err: any) {
      setCouponError(err?.message || 'Cupón inválido.');
    } finally {
      setCouponLoading(false);
    }
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
    // El envío del pedido original se mantiene: si era a domicilio, se cobra
    // la tarifa Blue Express de la talla elegida, no la de Metro.
    const shippingNext = settings.shipping;
    const message = buildWhatsAppMessage({
      ...lastOrder,
      items: itemsNext,
      subtotal: subtotalNext,
      shipping: shippingNext,
      total: Math.max(0, subtotalNext - (lastOrder.discount ?? 0) + shippingNext),
    });
    openWhatsApp(getSettings().whatsapp, message, { copy: true });
    setOfferAdded(p.id);
  };

  // Recompra: misma lógica de complemento que la venta cruzada del carrito.
  const offerProducts = lastOrder
    ? (() => {
        const inOrder = new Set(lastOrder.items.map((i) => i.productId));
        const orderCategories = new Set(
          lastOrder.items
            .map((i) => PRODUCTS.find((p) => p.id === i.productId)?.category)
            .filter((c): c is string => !!c),
        );
        const available = PRODUCTS.filter((p) => p.stock > 0 && !inOrder.has(p.id));
        const newCategory = available.filter((p) => !orderCategories.has(p.category));
        const sameCategory = available.filter((p) => orderCategories.has(p.category));
        return (newCategory.length > 0 ? newCategory : sameCategory)
          .sort((a, b) => b.rating - a.rating || a.price - b.price)
          .slice(0, 2);
      })()
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
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-sport-card shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Carrito de compras"
      >
        <div className="flex items-center justify-between border-b border-sport-border px-5 py-4">
          <h3 className="font-display text-xl uppercase tracking-wide">
            {placed ? 'Pedido enviado' : 'Tu Carrito'}
            {!placed && itemCount > 0 && (
              <span className="ml-1 text-sm font-normal text-sport-textMuted">({itemCount})</span>
            )}
          </h3>
          <button
            type="button"
            onClick={placed ? finishOrder : closeCart}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-sport-surface"
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
              className="flex h-16 w-16 items-center justify-center rounded-full bg-sport-green text-white"
            >
              <CheckCircle2 size={32} />
            </motion.div>
            <p className="font-display text-2xl uppercase tracking-wide">¡Pedido casi listo!</p>
            <p className="text-sm leading-relaxed text-sport-textMuted">
              Abrimos WhatsApp con tu pedido listo para enviar. Solo presiona enviar y te
              confirmamos el punto de entrega en tu estación de metro.
            </p>
            <p className="text-xs leading-relaxed text-sport-textMuted">
              ¿WhatsApp se abrió sin el mensaje? Pega con Ctrl/Cmd+V: tu pedido quedó en el
              portapapeles.
            </p>
            {waFailed && (
              <p className="text-xs font-semibold text-red-300">
                No pudimos abrir WhatsApp (número del local inválido). Copiá el mensaje de
                WhatsApp a mano o avísanos por Instagram para coordinar tu pedido.
              </p>
            )}
            <p
              className={`text-xs font-semibold ${
                syncStatus === 'ok' ? 'text-sport-orange' : 'text-sport-textMuted'
              }`}
            >
              {syncStatus === 'ok'
                ? '✓ Pedido registrado en el sistema del local'
                : 'No pudimos sincronizar con el local; tu pedido va por WhatsApp igualmente.'}
            </p>

            {offerProducts.length > 0 && (
              <div className="mt-2 w-full rounded-3xl border border-sport-green/60 bg-sport-green/10 p-5 text-left">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-sport-orange">
                  <Plus size={13} /> ¿Agregas un complemento?
                </p>
                <p className="mt-2 text-sm font-semibold text-sport-text">
                  Añádelo a tu pedido y lo despachamos con el mismo envío
                </p>
                <div className="mt-4 grid gap-3">
                  {offerProducts.map((p) => {
                    const added = offerAdded === p.id;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 rounded-2xl border border-sport-border bg-sport-card p-3"
                      >
                        <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-sport-surface">
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
                          <p className="text-xs text-sport-textMuted">{formatPrice(p.price)}</p>
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
            <p className="text-sm text-sport-textMuted">Agrega tus suplementos favoritos y finaliza tu pedido por WhatsApp.</p>
            <Link href="/productos" onClick={closeCart} className="btn-primary mt-2">
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
            {(giftEnabled || (!couponCode && rewardEnabled)) && (
            <div className="border-b border-sport-border px-5 py-3">

              {giftEnabled && (
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-sport-surface">
                    <motion.div
                      className="h-full rounded-full bg-sport-orange"
                      initial={{ width: 0 }}
                      animate={{ width: `${giftProgress}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  {hasGift && giftProduct ? (
                    <div className="mt-2 flex items-center gap-2 rounded-xl bg-sport-green/20 px-3 py-2">
                      <Gift size={14} className="shrink-0 text-sport-orange" />
                      <p className="text-xs font-semibold text-sport-text">
                        ¡Recibes un regalo! {giftProduct.name}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-sport-textMuted">
                      Te faltan{' '}
                      <span className="font-semibold text-sport-text">{formatPrice(giftRemaining)}</span>{' '}
                      para {settings.giftLabel ?? 'recibir un regalo'}
                    </p>
                  )}
                </div>
              )}

              {!couponCode && rewardEnabled && (
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-sport-surface">
                    <motion.div
                      className="h-full rounded-full bg-sport-green"
                      initial={{ width: 0 }}
                      animate={{ width: `${rewardProgress}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-sport-textMuted">
                    {rewardDiscount > 0 ? (
                      <span className="font-semibold text-sport-orange">
                        ¡Tienes {settings.rewardPercent}% de descuento aplicado!
                      </span>
                    ) : (
                      <>
                        Te faltan{' '}
                        <span className="font-semibold text-sport-text">
                          {formatPrice(rewardRemaining)}
                        </span>{' '}
                        para un {settings.rewardPercent}% de descuento
                      </>
                    )}
                  </p>
                </div>
              )}

              <p className="mt-3 text-[11px] font-semibold text-sport-textMuted">
                <span className="text-sport-orange">Retiro en Metro de Santiago</span> · Líneas 1, 2,
                3, 4, 4A, 5 y 6 · o{' '}
                <span className="text-sport-orange">envío a domicilio</span> en Santiago
              </p>
            </div>
            )}

            <div className="px-5 py-4">
              <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-sport-orange">
                1 · Tu pedido
              </p>
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
                          className="h-[72px] w-[72px] rounded-xl border border-sport-border object-cover"
                        />
                      </Link>
                      <div className="flex flex-1 flex-col">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug">{item.name}</p>
                        {item.isGift && (
                          <span className="mt-1 w-fit rounded-full bg-sport-green/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sport-orange">
                            Regalo
                          </span>
                        )}
                        <div className="mt-1 flex items-center justify-between">
                          {item.isGift ? (
                            <span className="text-xs font-semibold text-sport-orange">Gratis</span>
                          ) : (
                            <div className="flex items-center rounded-full border border-sport-border">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.key, item.quantity - 1)}
                                aria-label="Disminuir cantidad"
                                className="flex h-7 w-7 items-center justify-center rounded-l-full transition-colors hover:bg-sport-surface"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.key, item.quantity + 1)}
                                aria-label="Aumentar cantidad"
                                className="flex h-7 w-7 items-center justify-center rounded-r-full transition-colors hover:bg-sport-surface"
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
                              className="flex h-8 w-8 items-center justify-center rounded-full text-sport-textMuted transition-colors hover:bg-red-900/30 hover:text-red-500"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          {item.discount > 0 && !item.isGift && (
                            <span className="text-xs text-sport-textMuted line-through">
                              {formatPrice((item.price + item.discount) * item.quantity)}
                            </span>
                          )}
                          <span className={`text-sm font-bold ${item.isGift ? 'text-sport-orange' : 'text-sport-orange'}`}>
                            {item.isGift ? 'Gratis' : formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              {bundleOffer && bundleSaving > 0 && (
                <div className="mt-4 rounded-xl border border-sport-green bg-sport-green/10 p-3">
                  <p className="text-xs font-semibold text-sport-text">
                    Tu carrito calza con el {bundleOffer.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-sport-textMuted">
                    En pack queda en {formatPrice(bundleOffer.fixedPrice ?? 0)}: ahorras{' '}
                    <span className="font-semibold text-sport-text">{formatPrice(bundleSaving)}</span>.
                    Dilo en el WhatsApp si quieres llevarlo así.
                  </p>
                </div>
              )}

              {suggested.length > 0 && (
                <div className="mt-6 border-t border-sport-border pt-5">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-sport-textMuted">
                    Completa tu pedido
                  </p>
                  <div className="flex flex-col gap-3">
                    {suggested.map((p) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-sport-surface">
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
                            className="block truncate text-sm font-semibold hover:text-sport-orange"
                          >
                            {p.name}
                          </Link>
                          <p className="text-xs text-sport-textMuted">{formatPrice(p.price)}</p>
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
                              oldPrice: verifiedOldPrice(p),
                              discount: lineDiscount(p),
                              image: p.image,
                              quantity: 1,
                            })
                          }
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sport-orange text-paper transition-colors hover:bg-sport-green hover:text-white"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-sport-border px-5 py-4">
              <form id="checkout-form" onSubmit={checkout} noValidate className="space-y-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-sport-orange">
                  2 · Tus datos
                </p>

                <fieldset>
                  <legend className="mb-2 text-xs font-semibold text-sport-text">
                    ¿Cómo quieres pagar?
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_OPTIONS.map((option) => {
                      const active = payment === option.value;
                      return (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 text-center transition-colors focus-within:ring-2 focus-within:ring-sport-orange/70 ${
                            active
                              ? 'border-sport-orange bg-sport-orange/10'
                              : 'border-sport-border bg-white hover:border-sport-orange/60'
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment-method"
                            value={option.value}
                            checked={active}
                            onChange={() => setPayment(option.value)}
                            className="sr-only"
                          />
                          <span className="flex items-center gap-1.5 text-xs font-bold text-sport-text">
                            <option.icon
                              size={14}
                              className={active ? 'text-sport-orange' : 'text-sport-textMuted'}
                            />
                            {option.label}
                          </span>
                          <span className="text-[10px] text-sport-textMuted">{option.hint}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-sport-textMuted">
                    {payment === 'transferencia'
                      ? 'Coordinamos los datos de la transferencia por WhatsApp antes de la entrega.'
                      : 'Pagas en efectivo al recibir tu pedido.'}
                  </p>
                </fieldset>
                <div>
                  <label
                    htmlFor="checkout-name"
                    className="mb-1 block text-xs font-semibold text-sport-text"
                  >
                    Nombre completo
                  </label>
                  <input
                    id="checkout-name"
                    ref={fieldRefs.name}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearFieldError('name');
                    }}
                    autoComplete="name"
                    placeholder="Ej: Ana Pérez"
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={fieldErrors.name ? 'checkout-name-error' : undefined}
                    className={fieldClass(!!fieldErrors.name)}
                  />
                  {fieldErrors.name && (
                    <p id="checkout-name-error" className="mt-1 text-[11px] font-semibold text-red-500">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="checkout-phone"
                    className="mb-1 block text-xs font-semibold text-sport-text"
                  >
                    Teléfono
                  </label>
                  <input
                    id="checkout-phone"
                    ref={fieldRefs.phone}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearFieldError('phone');
                    }}
                    placeholder="9 1234 5678"
                    aria-invalid={!!fieldErrors.phone}
                    aria-describedby={
                      fieldErrors.phone ? 'checkout-phone-error' : 'checkout-phone-help'
                    }
                    className={fieldClass(!!fieldErrors.phone)}
                  />
                  {fieldErrors.phone ? (
                    <p id="checkout-phone-error" className="mt-1 text-[11px] font-semibold text-red-500">
                      {fieldErrors.phone}
                    </p>
                  ) : (
                    <p id="checkout-phone-help" className="mt-1 text-[11px] text-sport-textMuted">
                      Celular chileno, con 9 adelante. Lo usamos para coordinar tu entrega.
                    </p>
                  )}
                </div>
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold text-sport-text">
                    Punto de entrega en Metro
                  </legend>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="checkout-line"
                        className="mb-1 block text-[11px] font-semibold text-sport-textMuted"
                      >
                        Línea
                      </label>
                      <select
                        id="checkout-line"
                        ref={fieldRefs.metroLine}
                        value={metroLine}
                        onChange={(e) => {
                          setMetroLine(e.target.value);
                          clearFieldError('metroLine');
                        }}
                        aria-invalid={!!fieldErrors.metroLine}
                        aria-describedby={fieldErrors.metroLine ? 'checkout-line-error' : undefined}
                        className={fieldClass(!!fieldErrors.metroLine)}
                      >
                        <option value="">Elige…</option>
                        {METRO_LINES.map((l) => (
                          <option key={l.line} value={l.line}>
                            Línea {l.line}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.metroLine && (
                        <p
                          id="checkout-line-error"
                          className="mt-1 text-[11px] font-semibold text-red-500"
                        >
                          {fieldErrors.metroLine}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-station"
                        className="mb-1 block text-[11px] font-semibold text-sport-textMuted"
                      >
                        Estación
                      </label>
                      <select
                        id="checkout-station"
                        ref={fieldRefs.metroStation}
                        value={metroStation}
                        onChange={(e) => {
                          setMetroStation(e.target.value);
                          clearFieldError('metroStation');
                        }}
                        aria-invalid={!!fieldErrors.metroStation}
                        aria-describedby={
                          fieldErrors.metroStation ? 'checkout-station-error' : undefined
                        }
                        className={fieldClass(!!fieldErrors.metroStation)}
                      >
                        <option value="">Elige…</option>
                        {selectedLine?.stations.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.metroStation && (
                        <p
                          id="checkout-station-error"
                          className="mt-1 text-[11px] font-semibold text-red-500"
                        >
                          {fieldErrors.metroStation}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 text-[11px] text-sport-textMuted">
                    Coordinamos el punto exacto de entrega por WhatsApp.
                  </p>
                </fieldset>
                <div>
                  {couponCode ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-sport-green bg-sport-green/10 px-3 py-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-sport-text">
                          Cupón aplicado
                        </p>
                        <p className="text-[11px] text-sport-textMuted">
                          {couponCode} · {couponPercent}% OFF
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          clearCoupon();
                          setCouponInput('');
                          setCouponError('');
                        }}
                        className="text-[11px] font-bold text-sport-orange"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setCouponOpen((v) => !v)}
                        aria-expanded={couponOpen}
                        aria-controls="checkout-coupon"
                        className="text-xs font-semibold text-sport-orange underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sport-orange/70"
                      >
                        {couponOpen ? 'Ocultar cupón' : '¿Tienes un cupón?'}
                      </button>
                      {couponOpen && (
                        <div
                          id="checkout-coupon"
                          className="mt-2 rounded-xl border border-sport-border bg-sport-surface/60 p-3"
                        >
                          <div className="flex gap-2">
                            <input
                              value={couponInput}
                              onChange={(e) => {
                                setCouponInput(e.target.value.toUpperCase());
                                setCouponError('');
                              }}
                              placeholder="Código de cupón"
                              aria-label="Código de cupón"
                              autoComplete="off"
                              className="input uppercase"
                            />
                            <button
                              type="button"
                              onClick={handleApplyCoupon}
                              disabled={couponLoading}
                              className="btn-outline shrink-0 !px-4 !py-3 text-xs"
                            >
                              {couponLoading ? 'Validando…' : 'Aplicar'}
                            </button>
                          </div>
                          {couponError && (
                            <p className="mt-2 text-[11px] font-semibold text-red-500" role="alert">
                              {couponError}
                            </p>
                          )}
                          {!phone.trim() && (
                            <p className="mt-2 text-[11px] text-sport-textMuted">
                              Escribe tu teléfono arriba para aplicar el cupón.
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1 text-[11px] font-semibold text-sport-textMuted">
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={13} className="text-sport-orange" /> {siteConfig.warranty.short}
                  </span>
                  <span className="flex items-center gap-1">
                    <BadgeCheck size={13} className="text-sport-orange" /> Productos originales
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle size={13} className="text-sport-orange" /> Confirmación por WhatsApp
                  </span>
                </div>
              </form>
            </div>
            </div>

            <div className="shrink-0 border-t border-sport-border bg-sport-card px-5 py-4">
              <div className="flex items-center justify-between text-xs text-sport-textMuted">
                <span>Subtotal {formatPrice(subtotal)}</span>
                <span>Entrega Metro {shipping === 0 ? 'GRATIS' : formatPrice(shipping)}</span>
              </div>
              {activeDiscount > 0 && (
                <p className="mt-1 text-[11px] font-semibold text-sport-orange">
                  Incluye descuento de {formatPrice(activeDiscount)}
                  {couponCode ? ` · cupón ${couponCode}` : ''}
                </p>
              )}
              <div className="mb-3 mt-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-sport-textMuted">Total</span>
                <span className="font-display text-xl">{formatPrice(total)}</span>
              </div>
              {Object.values(fieldErrors).some(Boolean) && (
                <p className="mb-2 text-xs font-semibold text-red-500" role="alert">
                  Revisa los campos marcados en «Tus datos».
                </p>
              )}
              <button type="submit" form="checkout-form" className="btn-accent w-full">
                <MessageCircle size={16} /> Enviar pedido por WhatsApp
              </button>
              <p className="mt-2 text-center text-[11px] leading-relaxed text-sport-textMuted">
                Se abre WhatsApp con tu pedido listo. Coordinamos la entrega y el pago por ahí.
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
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sport-surface">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sport-textMuted" role="img" aria-label="Carrito vacío">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    </div>
  );
}
