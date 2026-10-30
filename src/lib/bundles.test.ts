import { bundleComponents, bundleImages } from './bundles';
import type { Bundle, Product } from '@/types';

const product = (id: number, name: string, image: string): Product =>
  ({ id, name, image }) as Product;

const bundle: Bundle = {
  id: 'pack-test',
  title: 'Pack de prueba',
  subtitle: '',
  items: [
    { productId: 4, quantity: 1 },
    { productId: 31, quantity: 2 },
    { productId: 999, quantity: 1 },
  ],
  pricing: 'fixed',
  fixedPrice: 27500,
};

const products = [
  product(4, 'Whey', '/img/whey.webp'),
  product(31, 'Creatina', '/img/creatina.png'),
];

describe('bundleComponents', () => {
  it('resuelve los productos del pack y descarta ids inexistentes', () => {
    const result = bundleComponents(bundle, (id) => products.find((p) => p.id === id));
    expect(result.map((r) => r.product.id)).toEqual([4, 31]);
    expect(result.map((r) => r.quantity)).toEqual([1, 2]);
  });
});

describe('bundleImages', () => {
  it('devuelve una imagen por producto del pack, en su orden', () => {
    const result = bundleImages(bundle, (id) => products.find((p) => p.id === id));
    expect(result).toEqual([
      { productId: 4, name: 'Whey', image: '/img/whey.webp' },
      { productId: 31, name: 'Creatina', image: '/img/creatina.png' },
    ]);
  });

  it('no devuelve la imagen de un producto que el pack no contiene', () => {
    const result = bundleImages(bundle, (id) => products.find((p) => p.id === id));
    expect(result.some((r) => r.image === '/img/producto1.webp')).toBe(false);
  });
});
