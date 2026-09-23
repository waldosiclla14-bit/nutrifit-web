import { marginOf, marginCls, stockLevel, progressPct } from './format';

describe('marginOf', () => {
  it('computes margin percent', () => {
    expect(marginOf(20000, 12000)).toBe(40);
  });

  it('returns 0 for zero/negative price', () => {
    expect(marginOf(0, 5000)).toBe(0);
    expect(marginOf(-100, 50)).toBe(0);
  });

  it('treats missing cost as 0', () => {
    expect(marginOf(10000, 0)).toBe(100);
  });
});

describe('marginCls', () => {
  it('tiers by margin', () => {
    expect(marginCls(40)).toMatch(/emerald/);
    expect(marginCls(20)).toMatch(/accent/);
    expect(marginCls(5)).toMatch(/red/);
  });
});

describe('stockLevel', () => {
  it('flags out of stock first', () => {
    expect(stockLevel(0, 5).label).toBe('agotado');
    expect(stockLevel(-2, null).label).toBe('agotado');
  });

  it('handles unknown threshold', () => {
    expect(stockLevel(10, null).label).toBe('—');
  });

  it('flags low vs ok', () => {
    expect(stockLevel(3, 5).label).toBe('bajo');
    expect(stockLevel(6, 5).label).toBe('ok');
  });
});

describe('progressPct', () => {
  it('computes and caps at 100', () => {
    expect(progressPct(50, 200)).toBe(25);
    expect(progressPct(300, 200)).toBe(100);
  });

  it('returns 0 for invalid goal', () => {
    expect(progressPct(50, 0)).toBe(0);
    expect(progressPct(50, -10)).toBe(0);
  });
});
