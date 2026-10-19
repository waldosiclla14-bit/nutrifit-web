import type { Product } from '@/types';
import { BRAND } from '@/data/seed';

/**
 * Configuración central de datos estructurados de comercio (Google Merchant /
 * Fichas de comerciantes). Única fuente de verdad para:
 *   - Política de devoluciones (hasMerchantReturnPolicy)
 *   - Tarifas y plazos de envío (shippingDetails)
 *   - SKU y formato de códigos de producto
 *
 * Editar aquí y en ningún otro lado. Ver docs/SEO-MERCHANT.md.
 */

export const MERCHANT_RETURN_POLICY = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'CL',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 30,
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/ReturnShippingFees',
} as const;

export type ShippingZone = {
  id: string;
  label: string;
  rate: number;
  destination: { country: string; region?: string };
  handling: [number, number];
  transit: [number, number];
};

/**
 * Zonas de envío declaradas en el JSON-LD. Debe coincidir con lo que cobra el
 * checkout (ver test merchant-config.test.ts que compara metro.rate con
 * DEFAULT_SETTINGS.shipping). Blue Express y Starken están declaradas para
 * Google aunque hoy el checkout solo ofrezca Metro.
 */
export const SHIPPING_ZONES: ShippingZone[] = [
  {
    id: 'metro',
    label: 'Metro Santiago (cualquier estación)',
    rate: 1000,
    destination: { country: 'CL', region: 'RM' },
    handling: [0, 1],
    transit: [0, 1],
  },
  {
    id: 'blue',
    label: 'Blue Express (Santiago centro)',
    rate: 4000,
    destination: { country: 'CL', region: 'RM' },
    handling: [0, 1],
    transit: [1, 2],
  },
  {
    id: 'starken',
    label: 'Starken (regiones)',
    rate: 4000,
    destination: { country: 'CL' },
    handling: [0, 1],
    transit: [3, 4],
  },
];

export function buildOfferShippingDetails(zone: ShippingZone) {
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: zone.rate, currency: 'CLP' },
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: zone.destination.country,
      ...(zone.destination.region ? { addressRegion: zone.destination.region } : {}),
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: {
        '@type': 'QuantitativeValue',
        minValue: zone.handling[0],
        maxValue: zone.handling[1],
        unitCode: 'DAY',
      },
      transitTime: {
        '@type': 'QuantitativeValue',
        minValue: zone.transit[0],
        maxValue: zone.transit[1],
        unitCode: 'DAY',
      },
    },
  };
}

/** priceValidUntil: último día del mes en curso (siempre futura, ISO 8601). */
export function priceValidUntil(): string {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.toISOString().slice(0, 10);
}

/**
 * Genera el JSON-LD de Product para una página de producto. Única función
 * generadora: ningún producto define su propio bloque.
 *
 * price y availability salen del mismo objeto `product` que renderiza la
 * página (src/components/product/ProductDetail.tsx), así que coinciden con lo
 * que ve el usuario en el estado inicial (sin variante seleccionada).
 */
export function buildProductJsonLd(product: Product) {
  const url = `${BRAND.url}/productos/${product.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: `${BRAND.url}${product.image}`,
    description: product.desc,
    ...(product.sku ? { sku: product.sku } : {}),
    brand: { '@type': 'Brand', name: product.brand },
    ...(product.variants && product.variants.length > 0
      ? {
          hasVariant: product.variants.map((v) => ({
            '@type': 'Product',
            name: `${product.name} ${v.name}`,
            ...(v.sku ? { sku: v.sku } : {}),
            image: `${BRAND.url}${v.image}`,
          })),
        }
      : {}),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviews,
    },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'CLP',
      price: product.price,
      availability:
        product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      priceValidUntil: priceValidUntil(),
      hasMerchantReturnPolicy: MERCHANT_RETURN_POLICY,
      shippingDetails: SHIPPING_ZONES.map(buildOfferShippingDetails),
    },
  };
}
