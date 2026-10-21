/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { CartProvider, useCart } from './CartContext';
import { PRODUCTS } from '@/data/seed';
import { BLUE_DOMICILIO_SANTIAGO } from '@/lib/policies';
import { BLUE_DEFAULT_SIZE, sizeForOrder } from '@/lib/blue-express';
import { DEFAULT_SETTINGS } from '@/lib/store';

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

  it('updateQuantity and removeItem work', () => {    const product = PRODUCTS[0];

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

describe('CartContext.shipping según método de entrega', () => {
  function addProduct(result: { current: ReturnType<typeof useCart> }) {
    const product = PRODUCTS[0];
    act(() => {
      result.current.addItem({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: 16000,
        discount: 0,
        image: product.image,
        quantity: 1,
      });
    });
  }

  it('usa la tarifa de metro por defecto', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    addProduct(result);

    expect(result.current.deliveryMethod).toBe('metro');
    expect(result.current.shipping).toBe(DEFAULT_SETTINGS.shipping);
  });

  it('aplica la tarifa Blue Express al elegir domicilio', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    addProduct(result);

    act(() => {
      result.current.setDeliveryMethod('domicilio');
    });

    const rate = BLUE_DOMICILIO_SANTIAGO[result.current.blueSize];
    expect(result.current.shipping).toBe(rate);
    expect(result.current.total).toBe(
      result.current.subtotal - result.current.activeDiscount + rate,
    );
  });

  it('la talla la determina el local a partir del empaque, no el cliente', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    addProduct(result);

    act(() => {
      result.current.setDeliveryMethod('domicilio');
    });

    // El catálogo tiene peso y medidas reales: la talla se calcula sola.
    const product = PRODUCTS[0];
    const expected = sizeForOrder([{ productId: product.id, quantity: 1 }], PRODUCTS);
    expect(result.current.blueSize).toBe(expected);
    expect(result.current.shipping).toBe(BLUE_DOMICILIO_SANTIAGO[expected]);
  });

  it('no cobra envío con el carrito vacío', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.setDeliveryMethod('domicilio');
    });

    expect(result.current.shipping).toBe(0);
  });
});
