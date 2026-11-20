import type { AdminProduct, AdminVariant } from '@/types/admin';

type ApiProductVariant = {
  id: string;
  variantName?: string;
  name?: string;
  sku?: string;
  barcode?: string | null;
  price?: number;
  costPrice?: number;
  stock?: number;
  physicalStock?: number;
  lowStockAlert?: number;
  isActive?: boolean;
};

type ApiProduct = {
  id: string;
  name?: string;
  slug?: string;
  sku?: string;
  barcode?: string | null;
  brand?: { id: string; name: string } | string | null;
  category?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
  supplierId?: string | null;
  basePrice?: number;
  price?: number;
  costPrice?: number;
  comparePrice?: number;
  description?: string;
  registroIsp?: string | null;
  imageUrl?: string | null;
  size?: string | null;
  servings?: number | null;
  ingredients?: string | null;
  descriptionShort?: string | null;
  seoTitle?: string | null;
  lowStockThreshold?: number;
  isActive?: boolean;
  variants?: ApiProductVariant[];
  [key: string]: unknown;
};

export function mapApiProduct(x: ApiProduct): AdminProduct {
  return {
    id: x.id,
    name: x.name || x.sku || 'Producto sin nombre',
    slug: x.slug,
    sku: x.sku || '',
    barcode: x.barcode || null,
    brand: typeof x.brand === 'object' && x.brand ? x.brand : undefined,
    brandName: typeof x.brand === 'string' ? x.brand : typeof x.brand === 'object' && x.brand ? x.brand.name : undefined,
    category: x.category ? { id: x.category.id, name: x.category.name } : null,
    supplier: x.supplier || undefined,
    supplierId: x.supplier?.id ?? x.supplierId ?? null,
    price: x.basePrice ?? x.price ?? 0,
    costPrice: x.costPrice ?? 0,
    comparePrice: x.comparePrice,
    description: x.description,
    registroIsp: x.registroIsp ?? null,
    imageUrl: x.imageUrl ?? null,
    size: x.size ?? null,
    servings: x.servings ?? null,
    ingredients: x.ingredients ?? null,
    descriptionShort: x.descriptionShort ?? null,
    seoTitle: x.seoTitle ?? null,
    lowStockThreshold: x.lowStockThreshold,
    active: x.isActive !== false,
    variants: (x.variants || []).map((v) => ({
      id: v.id,
      name: v.variantName || v.name || 'Sin variante',
      sku: v.sku || '',
      barcode: v.barcode || null,
      price: v.price ?? 0,
      costPrice: (v.costPrice || 0) || (x.costPrice || 0),
      stock: v.physicalStock ?? v.stock ?? 0,
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
