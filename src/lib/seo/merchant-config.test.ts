import type { Product } from '@/types';
import { PRODUCTS } from '@/data/seed';
import { DEFAULT_SETTINGS } from '@/lib/store';
import { RETURN_DAYS } from '@/lib/policies';
import {
  MERCHANT_RETURN_POLICY,
  SHIPPING_ZONES,
  buildOfferShippingDetails,
  buildProductJsonLd,
  priceValidUntil,
} from './merchant-config';

const SKU_RE = /^[A-Z0-9-]{1,50}$/;

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 999999,
    slug: 'producto-de-prueba',
    name: 'Producto de Prueba',
    brand: 'Marca',
    category: 'proteinas',
    categoryLabel: 'Proteínas',
    price: 16000,
    desc: 'Descripción de prueba',
    benefits: [],
    stock: 5,
    sku: 'NF-PROT-PROBA-1KG',
    rating: 4.9,
    reviews: 3,
    image: '/img/prueba.jpg',
    modoUso: 'Modo de uso',
    nutrientes: [],
    ingredientes: [],
    goal: [],
    tags: [],
    ...overrides,
  };
}

describe('SKU de catálogo ( Merchant Center )', () => {
  const skus = PRODUCTS.map((p) => p.sku).filter((s): s is string => !!s);

  it('todos los productos tienen sku', () => {
    expect(PRODUCTS.length).toBeGreaterThan(0);
    PRODUCTS.forEach((p) => {
      expect(typeof p.sku).toBe('string');
      expect(p.sku!.length).toBeGreaterThan(0);
    });
  });

  it('formato válido: 1-50 caracteres, mayúsculas, sin espacios ni tildes', () => {
    skus.forEach((sku) => expect(sku).toMatch(SKU_RE));
  });

  it('sin duplicados', () => {
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('ningún sku es el slug ni el nombre del producto', () => {
    PRODUCTS.forEach((p) => {
      expect(p.sku).not.toBe(p.slug);
      expect(p.sku).not.toBe(p.name);
      expect(p.sku).not.toContain(' ');
    });
  });
});

describe('buildProductJsonLd — campos mínimos', () => {
  const json = buildProductJsonLd(makeProduct());

  it('estructura base', () => {
    expect(json['@context']).toBe('https://schema.org');
    expect(json['@type']).toBe('Product');
    expect(json.name).toBe('Producto de Prueba');
    expect(json.image).toContain('/img/prueba.jpg');
    expect(json.description).toBe('Descripción de prueba');
    expect(json.sku).toBe('NF-PROT-PROBA-1KG');
    expect(json.brand).toEqual({ '@type': 'Brand', name: 'Marca' });
  });

  it('offers completo', () => {
    const offers = json.offers as any;
    expect(offers['@type']).toBe('Offer');
    expect(offers.price).toBe(16000);
    expect(offers.priceCurrency).toBe('CLP');
    expect(offers.availability).toBe('https://schema.org/InStock');
    expect(offers.url).toContain('/productos/producto-de-prueba');
    expect(offers.priceValidUntil).toBe(priceValidUntil());
  });

  it('priceValidUntil es una fecha futura (ISO 8601)', () => {
    expect(priceValidUntil()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(priceValidUntil()).getTime()).toBeGreaterThan(Date.now());
  });

  it('hasMerchantReturnPolicy completo', () => {
    const rp = (json.offers as any).hasMerchantReturnPolicy;
    expect(rp).toEqual(MERCHANT_RETURN_POLICY);
    expect(rp.applicableCountry).toBe('CL');
    expect(rp.merchantReturnDays).toBe(RETURN_DAYS);
    expect(rp.returnPolicyCategory).toContain('MerchantReturnFiniteReturnWindow');
  });

  it('shippingDetails: una OfferShippingDetails por zona', () => {
    const sd = (json.offers as any).shippingDetails;
    expect(Array.isArray(sd)).toBe(true);
    expect(sd).toHaveLength(SHIPPING_ZONES.length);
    sd.forEach((d: any, i: number) => {
      expect(d['@type']).toBe('OfferShippingDetails');
      expect(d.shippingRate.value).toBe(SHIPPING_ZONES[i].rate);
      expect(d.shippingRate.currency).toBe('CLP');
      expect(d.shippingDestination.addressCountry).toBe('CL');
      expect(d.deliveryTime.handlingTime.unitCode).toBe('DAY');
      expect(d.deliveryTime.transitTime.unitCode).toBe('DAY');
    });
  });

  it('shippingDetails: región solo cuando aplica (starken no tiene)', () => {
    const sd = (json.offers as any).shippingDetails as any[];
    expect(sd[0].shippingDestination.addressRegion).toBe('RM');
    expect(sd[1].shippingDestination.addressRegion).toBe('RM');
    expect(sd[2].shippingDestination.addressRegion).toBeUndefined();
  });

  it('shippingDetails: plazos coherentes (min <= max)', () => {
    SHIPPING_ZONES.forEach((z) => {
      const d = buildOfferShippingDetails(z) as any;
      expect(d.deliveryTime.handlingTime.minValue).toBeLessThanOrEqual(
        d.deliveryTime.handlingTime.maxValue,
      );
      expect(d.deliveryTime.transitTime.minValue).toBeLessThanOrEqual(
        d.deliveryTime.transitTime.maxValue,
      );
    });
  });
});

describe('buildProductJsonLd — casos borde', () => {
  it('sin sku: no emite el campo (nunca string vacío)', () => {
    const json = buildProductJsonLd(makeProduct({ sku: undefined }));
    expect('sku' in json).toBe(false);
  });

  it('sku vacío: no emite el campo', () => {
    const json = buildProductJsonLd(makeProduct({ sku: '' }));
    expect('sku' in json).toBe(false);
  });

  it('sku de exactamente 50 caracteres es válido', () => {
    const sku50 = 'A'.repeat(50);
    const json = buildProductJsonLd(makeProduct({ sku: sku50 }));
    expect(json.sku).toBe(sku50);
  });

  it('sin stock → OutOfStock', () => {
    const json = buildProductJsonLd(makeProduct({ stock: 0 }));
    expect((json.offers as any).availability).toBe('https://schema.org/OutOfStock');
  });

  it('precio 0 se mantiene (no se oculta)', () => {
    const json = buildProductJsonLd(makeProduct({ price: 0 }));
    expect((json.offers as any).price).toBe(0);
  });

  it('con variantes: hasVariant con sku si la variante lo tiene', () => {
    const json = buildProductJsonLd(
      makeProduct({
        variants: [
          { name: 'Vainilla', image: '/img/v.jpg', stock: 3, sku: 'NF-PROT-PROBA-1KG-VAN' },
          { name: 'Chocolate', image: '/img/c.jpg', stock: 0 },
        ],
      }),
    );
    const hv = json.hasVariant as any[];
    expect(hv).toHaveLength(2);
    expect(hv[0].sku).toBe('NF-PROT-PROBA-1KG-VAN');
    expect('sku' in hv[1]).toBe(false);
  });
});

describe('SHIPPING_ZONES vs lo que cobra el checkout', () => {
  it('la zona metro cobra lo mismo que DEFAULT_SETTINGS.shipping', () => {
    const metro = SHIPPING_ZONES.find((z) => z.id === 'metro');
    expect(metro?.rate).toBe(DEFAULT_SETTINGS.shipping);
  });

  it('todas las zonas tienen tarifa, destino y plazos válidos', () => {
    SHIPPING_ZONES.forEach((z) => {
      expect(z.rate).toBeGreaterThan(0);
      expect(z.destination.country).toBe('CL');
      expect(z.transit[0]).toBeLessThanOrEqual(z.transit[1]);
      expect(z.handling[0]).toBeLessThanOrEqual(z.handling[1]);
    });
  });

  it('ids únicos y regiones válidas', () => {
    expect(new Set(SHIPPING_ZONES.map((z) => z.id)).size).toBe(SHIPPING_ZONES.length);
    SHIPPING_ZONES.forEach((z) => {
      if (z.destination.region) expect(z.destination.region).toMatch(/^[A-Z]{2}$/);
    });
  });
});
