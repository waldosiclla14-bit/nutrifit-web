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

type FavoritesValue = {
  ids: number[];
  count: number;
  isFavorite: (productId: number) => boolean;
  toggleFavorite: (productId: number) => void;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

const FAV_KEY = 'nutrifit:favorites';

function loadFavorites(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FAV_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIds(loadFavorites());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(FAV_KEY, JSON.stringify(ids));
    } catch {
      // ignore
    }
  }, [ids, hydrated]);

  const isFavorite = useCallback((productId: number) => ids.includes(productId), [ids]);

  const toggleFavorite = useCallback((productId: number) => {
    setIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  }, []);

  const value = useMemo<FavoritesValue>(
    () => ({ ids, count: ids.length, isFavorite, toggleFavorite }),
    [ids, isFavorite, toggleFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites debe usarse dentro de FavoritesProvider');
  return ctx;
}
