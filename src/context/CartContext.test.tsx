/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { CartProvider, useCart } from './CartContext';
import { PRODUCTS } from '@/data/seed';

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

beforeEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
});

describe('CartContext.addItem', () => {
  it('populates variantId from the local catalog', () => {
    const product = PRODUCTS.find((p) => (p.variants?.length ?? 0) > 0);
    expect(product).toBeDefined();
    const variantName = product!.variants![0].name;

    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({
        productId: product!.id,
        slug: product!.slug,
        name: product!.name,
        price: product!.price,
        discount: 0,
        image: product!.image,
        quantity: 1,
        variant: variantName,
      });
    });

    expect(result.current.items).toHaveLength(1);
    // El variantId es lo que el checkout envía al backend (fix $1)
    expect(result.current.items[0].variantId).toBeDefined();
    expect(result.current.items[0].variant).toBe(variantName);
  });

  it('merges quantity when adding the same product+variant twice', () => {
    const product = PRODUCTS[0];

    const { result } = renderHook(() => useCart(), { wrapper });
    const item = {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      discount: 0,
      image: product.image,
      quantity: 1,
    };

    act(() => {
      result.current.addItem(item);
    });
    act(() => {
      result.current.addItem(item);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.itemCount).toBe(2);
  });

  it('computes subtotal from price x quantity', () => {
    const product = PRODUCTS[0];

    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: 16000,
        discount: 0,
        image: product.image,
        quantity: 3,
      });
    });

    expect(result.current.subtotal).toBe(48000);
  });

  it('updateQuantity and removeItem work', () => {
    const product = PRODUCTS[0];

    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: 10000,
        discount: 0,
        image: product.image,
        quantity: 1,
      });
    });
    const key = result.current.items[0].key;

    act(() => {
      result.current.updateQuantity(key, 5);
    });
    expect(result.current.items[0].quantity).toBe(5);

    act(() => {
      result.current.removeItem(key);
    });
    expect(result.current.items).toHaveLength(0);
  });
});
