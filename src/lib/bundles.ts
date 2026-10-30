import type { Bundle, Product } from '@/types';

export type BundleComponent = {
  productId: number;
  quantity: number;
  product: Product;
};

/** Resuelve los productos de un pack, descartando los que no existen. */
export function bundleComponents(
  bundle: Bundle,
  resolve: (productId: number) => Product | undefined,
): BundleComponent[] {
  return bundle.items
    .map((item) => ({ ...item, product: resolve(item.productId) }))
    .filter((item): item is BundleComponent => item.product !== undefined);
}

/**
 * Imágenes que debe mostrar un pack: una por producto que lo compone, en el
 * orden del pack. Antes se usaba `bundle.image`, que en varios sets apuntaba a
 * un producto que el pack no contiene.
 */
export function bundleImages(
  bundle: Bundle,
  resolve: (productId: number) => Product | undefined,
): Array<{ productId: number; name: string; image: string }> {
  return bundleComponents(bundle, resolve).map(({ product }) => ({
    productId: product.id,
    name: product.name,
    image: product.image,
  }));
}
