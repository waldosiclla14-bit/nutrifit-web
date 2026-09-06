import { marginOf, marginCls, stockLevel } from './format';

describe('admin/format.ts', () => {
  describe('marginOf', () => {
    it('calculates margin correctly', () => {
      expect(marginOf(10000, 7000)).toBe(30);
      expect(marginOf(10000, 5000)).toBe(50);
      expect(marginOf(10000, 10000)).toBe(0);
    });

    it('returns 0 when price is 0', () => {
      expect(marginOf(0, 5000)).toBe(0);
    });

    it('returns 0 when both are 0', () => {
      expect(marginOf(0, 0)).toBe(0);
    });

    it('handles cost higher than price (negative margin)', () => {
      expect(marginOf(5000, 10000)).toBe(-100);
    });
  });

  describe('marginCls', () => {
    it('returns green for high margin', () => {
      const cls = marginCls(50);
      expect(cls).toContain('emerald');
    });

    it('returns yellow for medium margin', () => {
      const cls = marginCls(20);
      expect(cls).toContain('amber');
    });

    it('returns red for low margin', () => {
      const cls = marginCls(5);
      expect(cls).toContain('red');
    });
  });

  describe('stockLevel', () => {
    it('returns OK for high stock', () => {
      const result = stockLevel(50, 5);
      expect(result.label).toBe('OK');
      expect(result.cls).toContain('emerald');
    });

    it('returns BAJO for low stock', () => {
      const result = stockLevel(3, 5);
      expect(result.label).toBe('BAJO');
      expect(result.cls).toContain('amber');
    });

    it('returns AGOTADO for zero stock', () => {
      const result = stockLevel(0, 5);
      expect(result.label).toBe('AGOTADO');
      expect(result.cls).toContain('red');
    });

    it('uses default threshold of 5 when alert is null', () => {
      const result = stockLevel(3, null);
      expect(result.label).toBe('BAJO');
    });

    it('uses custom threshold', () => {
      const result = stockLevel(8, 10);
      expect(result.label).toBe('BAJO');
    });
  });
});
