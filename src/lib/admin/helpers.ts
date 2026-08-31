import type { AdminProduct, AdminVariant } from '@/types/admin';

type ApiProductVariant = {
  id: string;
  variantName?: string;
  name?: string;
  sku?: string;
  price?: number;
  costPrice?: number;
  stock?: number;
  lowStockAlert?: number;
  isActive?: boolean;
};

type ApiProduct = {
  id: string;
  name?: string;
  sku?: string;
  brand?: { id: string; name: string } | string | null;
  category?: { id: string; name: string } | null;
  basePrice?: number;
  price?: number;
  costPrice?: number;
  comparePrice?: number;
  description?: string;
  isActive?: boolean;
  variants?: ApiProductVariant[];
  [key: string]: unknown;
};

export function mapApiProduct(x: ApiProduct): AdminProduct {
  return {
    id: x.id,
    name: x.name || x.sku || 'Producto sin nombre',
    sku: x.sku || '',
    brand: typeof x.brand === 'object' && x.brand ? x.brand : undefined,
    brandName: typeof x.brand === 'string' ? x.brand : typeof x.brand === 'object' && x.brand ? x.brand.name : undefined,
    category: x.category ? { id: x.category.id, name: x.category.name } : null,
    price: x.basePrice ?? x.price ?? 0,
    costPrice: x.costPrice ?? 0,
    comparePrice: x.comparePrice,
    description: x.description,
    active: x.isActive !== false,
    variants: (x.variants || []).map((v) => ({
      id: v.id,
      name: v.variantName || v.name || 'Sin variante',
      sku: v.sku || '',
      price: v.price ?? 0,
      costPrice: (v.costPrice || 0) || (x.costPrice || 0),
      stock: v.stock ?? 0,
      lowStockAlert: v.lowStockAlert ?? 5,
      active: v.isActive !== false,
    })),
  };
}

export function handleAuthError(err: any, onLogout: () => void): boolean {
  if (err?.status === 401) {
    onLogout();
    return true;
  }
  return false;
}
