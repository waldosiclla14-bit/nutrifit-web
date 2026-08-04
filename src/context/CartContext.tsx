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
import type { CartItem } from '@/types';
import { getSettings } from '@/lib/store';

type CartValue = {
  items: CartItem[];
  isOpen: boolean;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  itemCount: number;
  freeShippingFrom: number;
  addItem: (item: Omit<CartItem, 'key'>) => void;
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

  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, hydrated]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback((item: Omit<CartItem, 'key'>) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.key === existing.key ? { ...i, quantity: i.quantity + item.quantity } : i,
        );
      }
      return [...prev, { ...item, key: `p${item.productId}-${Date.now()}` }];
    });
    setIsOpen(true);
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, quantity } : i)),
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartValue>(() => {
    const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const discount = items.reduce((acc, i) => acc + i.discount * i.quantity, 0);
    const settings = getSettings();
    const shipping =
      subtotal === 0 || subtotal >= settings.freeShippingFrom ? 0 : settings.shipping;
    const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);
    return {
      items,
      isOpen,
      subtotal,
      discount,
      shipping,
      total: subtotal - discount + shipping,
      itemCount,
      freeShippingFrom: settings.freeShippingFrom,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      openCart,
      closeCart,
    };
  }, [items, isOpen, addItem, updateQuantity, removeItem, clearCart, openCart, closeCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}
