'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Bundle, CartItem, Settings } from '@/types';
import { PRODUCTS } from '@/data/seed';
import { getSettings, subscribeStore } from '@/lib/store';
import { trackEvent } from '@/lib/analytics';
import { apiFetch } from '@/lib/api';

type AppliedCoupon = {
  code: string;
  discountPercent: number;
  discountAmount: number;
  customerName: string;
  expiresAt: string | null;
  phone: string;
};

type CartValue = {
  items: CartItem[];
  isOpen: boolean;
  subtotal: number;
  discount: number;
  rewardDiscount: number;
  couponDiscount: number;
  couponCode: string | null;
  couponPhone: string | null;
  couponPercent: number;
  activeDiscount: number;
  shipping: number;
  total: number;
  itemCount: number;
  freeShippingFrom: number;
  addItem: (item: Omit<CartItem, 'key'>) => void;
  addBundle: (bundle: Bundle, variants?: Record<number, string>) => void;
  applyCoupon: (code: string, phone: string) => Promise<AppliedCoupon>;
  clearCoupon: () => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartValue | null>(null);

const CART_KEY = 'nutrifit:cart';

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => getSettings());
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);

  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
    return subscribeStore(() => setSettings(getSettings()));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, hydrated]);

  const giftThreshold = settings.giftThreshold ?? 0;
  const giftProductId = settings.giftProductId;
  const rewardThreshold = settings.rewardThreshold ?? 0;
  const rewardPercent = settings.rewardPercent ?? 0;

  useEffect(() => {
    if (!hydrated) return;
    if (!giftThreshold || !giftProductId) {
      setItems((prev) => (prev.some((i) => i.isGift) ? prev.filter((i) => !i.isGift) : prev));
      return;
    }
    const paid = items.filter((i) => !i.isGift).reduce((acc, i) => acc + i.price * i.quantity, 0);
    if (paid >= giftThreshold) {
      const product = PRODUCTS.find((p) => p.id === giftProductId);
      if (product && !items.some((i) => i.isGift && i.productId === product.id)) {
        setItems((prev) =>
          prev.some((i) => i.isGift && i.productId === product.id)
            ? prev
            : [
                ...prev,
                {
                  key: `gift-${product.id}`,
                  productId: product.id,
                  slug: product.slug,
                  name: product.name,
                  price: 0,
                  discount: 0,
                  image: product.image,
                  quantity: 1,
                  isGift: true,
                },
              ],
        );
      }
    } else {
      setItems((prev) => (prev.some((i) => i.isGift) ? prev.filter((i) => !i.isGift) : prev));
    }
  }, [items, hydrated, giftThreshold, giftProductId]);

  const openCart = useCallback(() => {
    setIsOpen(true);
    trackEvent('BeginCheckout', { currency: 'CLP' });
  }, []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback((item: Omit<CartItem, 'key'>) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) =>
          i.productId === item.productId &&
          (i.variant ?? '') === (item.variant ?? '') &&
          i.isGift === item.isGift,
      );
      if (existing) {
        return prev.map((i) =>
          i.key === existing.key ? { ...i, quantity: i.quantity + item.quantity } : i,
        );
      }
      return [...prev, { ...item, key: `p${item.productId}-${item.variant ?? 'base'}-${Date.now()}` }];
    });
    setIsOpen(true);
    trackEvent('AddToCart', {
      currency: 'CLP',
      value: item.price * item.quantity,
      content_ids: [String(item.productId)],
      content_name: item.name,
      content_type: 'product',
    });
  }, []);

  const addBundle = useCallback(
    (bundle: Bundle, variants?: Record<number, string>) => {
      const resolved = bundle.items
        .map((it) => {
          const p = PRODUCTS.find((x) => x.id === it.productId);
          if (!p || p.stock <= 0) return null;
          const variant = p.variants?.find(
            (v) => v.name === (variants?.[p.id] ?? p.variants?.[0]?.name),
          );
          return {
            item: it,
            product: p,
            variant,
            regularLine: p.price * it.quantity,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

      if (!resolved.length) return;

      const sum = resolved.reduce((acc, entry) => acc + entry.regularLine, 0);
      const targetPrice =
        bundle.pricing === 'fixed' && bundle.fixedPrice != null ? bundle.fixedPrice : sum;
      const totalDiscount = Math.max(0, sum - targetPrice);
      let remainingDiscount = totalDiscount;

      resolved.forEach((entry, index) => {
        const lineDiscount =
          index === resolved.length - 1
            ? remainingDiscount
            : Math.round((totalDiscount * entry.regularLine) / sum);
        remainingDiscount -= lineDiscount;
        const actualLine = Math.max(0, entry.regularLine - lineDiscount);
        const quantity = entry.item.quantity;
        const unitPrice = Math.round(actualLine / quantity);
        const unitDiscount = Math.round(lineDiscount / quantity);

        addItem({
          productId: entry.product.id,
          slug: entry.product.slug,
          name: entry.variant ? `${entry.product.name} (${entry.variant.name})` : entry.product.name,
          price: unitPrice,
          oldPrice: entry.product.oldPrice,
          discount: unitDiscount,
          image: entry.variant?.image ?? entry.product.image,
          quantity,
          variant: entry.variant?.name,
        });
      });
    },
    [addItem],
  );

  const clearCoupon = useCallback(() => setCoupon(null), []);

  const applyCoupon = useCallback(
    async (code: string, phone: string) => {
      const cleanCode = String(code || '').trim().toUpperCase();
      const cleanPhone = String(phone || '').replace(/\D/g, '');
      const currentSubtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
      if (!cleanCode) throw new Error('Ingresa un código de cupón.');
      if (!cleanPhone) throw new Error('Ingresa un teléfono válido.');
      const result = await apiFetch<Omit<AppliedCoupon, 'phone'>>('/coupons/validate', {
        method: 'POST',
        body: { code: cleanCode, phone: cleanPhone, subtotal: currentSubtotal },
      });
      const applied = { ...result, phone: cleanPhone };
      setCoupon(applied);
      return applied;
    },
    [items],
  );

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, quantity } : i)),
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.key === key);
      if (target?.isGift) return prev;
      return prev.filter((i) => i.key !== key);
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCoupon(null);
  }, []);

  useEffect(() => {
    if (items.length === 0 && coupon) setCoupon(null);
  }, [items.length, coupon]);

  const value = useMemo<CartValue>(() => {
    const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const discount = items.reduce((acc, i) => acc + i.discount * i.quantity, 0);
    const couponDiscount = coupon ? Math.min(subtotal, Math.round((subtotal * coupon.discountPercent) / 100)) : 0;
    const rewardDiscount =
      rewardThreshold > 0 && subtotal >= rewardThreshold
        ? Math.round((subtotal * rewardPercent) / 100)
        : 0;
    const activeDiscount = couponDiscount > 0 ? couponDiscount : rewardDiscount;
    const shipping =
      subtotal === 0 || subtotal >= settings.freeShippingFrom ? 0 : settings.shipping;
    const itemCount = items
      .filter((i) => !i.isGift)
      .reduce((acc, i) => acc + i.quantity, 0);
    return {
      items,
      isOpen,
      subtotal,
      discount,
      rewardDiscount,
      couponDiscount,
      couponCode: coupon?.code ?? null,
      couponPhone: coupon?.phone ?? null,
      couponPercent: coupon?.discountPercent ?? 0,
      activeDiscount,
      shipping,
      total: Math.max(0, subtotal - activeDiscount + shipping),
      itemCount,
      freeShippingFrom: settings.freeShippingFrom,
      addItem,
      addBundle,
      applyCoupon,
      clearCoupon,
      updateQuantity,
      removeItem,
      clearCart,
      openCart,
      closeCart,
    };
  }, [
    items,
    isOpen,
    settings.freeShippingFrom,
    settings.shipping,
    rewardThreshold,
    rewardPercent,
    coupon,
    addItem,
    addBundle,
    applyCoupon,
    clearCoupon,
    updateQuantity,
    removeItem,
    clearCart,
    openCart,
    closeCart,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}
