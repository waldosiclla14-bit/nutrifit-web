'use client';

import { useEffect, useState } from 'react';
import { PRODUCTS } from '@/data/seed';
import type { Settings } from '@/types';
import { getSettings, loadDB, subscribeStore } from '@/lib/store';

export function useSettings(): Settings {
  const [settings, setSettings] = useState<Settings>(() => getSettings());

  useEffect(() => {
    const refresh = () => setSettings(getSettings());
    return subscribeStore(refresh);
  }, []);

  return settings;
}

export function useProductBySlug(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function useRelatedProducts(productId: number, category: string, limit = 4) {
  return PRODUCTS.filter((p) => p.id !== productId && p.category === category).slice(
    0,
    limit,
  );
}

export function useSearchProducts(query: string) {
  const q = query.trim().toLowerCase();
  return PRODUCTS.filter((product) => {
    if (!q) return true;
    const haystack = [product.name, product.category, product.brand, ...(product.tags ?? [])]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function useOrders() {
  const [orders, setOrders] = useState(() => loadDB().orders);

  useEffect(() => {
    const refresh = () => setOrders(loadDB().orders);
    return subscribeStore(refresh);
  }, []);

  return orders;
}
