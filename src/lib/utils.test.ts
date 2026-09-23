import {
  formatPrice,
  formatTime12,
  slugify,
  discountOf,
  clamp,
  bundlePricing,
} from './utils';

describe('formatPrice', () => {
  it('formats CLP without decimals', () => {
    expect(formatPrice(16500)).toMatch(/16\.500/);
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toMatch(/0/);
  });
});

describe('formatTime12', () => {
  it('converts afternoon hours', () => {
    expect(formatTime12('14:30')).toBe('2:30 PM');
  });

  it('handles midnight and noon', () => {
    expect(formatTime12('00:15')).toBe('12:15 AM');
    expect(formatTime12('12:00')).toBe('12:00 PM');
  });

  it('pads minutes', () => {
    expect(formatTime12('09:05')).toBe('9:05 AM');
  });

  it('returns input when unparseable', () => {
    expect(formatTime12('cualquiera')).toBe('cualquiera');
  });
});

describe('slugify', () => {
  it('lowercases and strips accents', () => {
    expect(slugify('Proteína Whey 1kg')).toBe('proteina-whey-1kg');
  });

  it('collapses separators', () => {
    expect(slugify('  FullEnergic   100%  ')).toBe('fullenergic-100');
  });
});

describe('discountOf', () => {
  it('computes percent off', () => {
    expect(discountOf(16000, 20000)).toBe(20);
  });

  it('returns undefined when no real discount', () => {
    expect(discountOf(20000, 20000)).toBeUndefined();
    expect(discountOf(20000)).toBeUndefined();
    expect(discountOf(22000, 20000)).toBeUndefined();
  });
});

describe('clamp', () => {
  it('clamps both ends', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe('bundlePricing', () => {
  const resolve = (id: number) => ({ 1: { price: 16000 }, 2: { price: 9000 } }[id]);

  it('sums lines for sum pricing', () => {
    const r = bundlePricing(
      { items: [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 2 }], pricing: 'sum' },
      resolve,
    );
    expect(r.sum).toBe(34000);
    expect(r.price).toBe(34000);
    expect(r.saving).toBe(0);
  });

  it('applies fixed price with saving and percent', () => {
    const r = bundlePricing(
      { items: [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 2 }], pricing: 'fixed', fixedPrice: 30000 },
      resolve,
    );
    expect(r.price).toBe(30000);
    expect(r.saving).toBe(4000);
    expect(r.percent).toBe(Math.round((4000 / 34000) * 100));
  });

  it('ignores unknown products', () => {
    const r = bundlePricing({ items: [{ productId: 999, quantity: 1 }], pricing: 'sum' }, resolve);
    expect(r.sum).toBe(0);
    expect(r.percent).toBe(0);
  });
});
