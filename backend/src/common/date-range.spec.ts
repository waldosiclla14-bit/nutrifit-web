import { chileDayRange, rangeBound, startOfChileDay, todayChileISO } from './date-range';

describe('chile date-range helpers', () => {
  it('starts a summer day at 03:00Z (UTC-3 DST)', () => {
    // January = DST in Chile (UTC-3)
    const start = startOfChileDay('2026-01-15');
    expect(start.toISOString()).toBe('2026-01-15T03:00:00.000Z');
  });

  it('starts a winter day at 04:00Z (UTC-4)', () => {
    const start = startOfChileDay('2026-07-15');
    expect(start.toISOString()).toBe('2026-07-15T04:00:00.000Z');
  });

  it('covers the full local day regardless of DST', () => {
    const summer = chileDayRange('2026-01-15');
    expect(summer.gte.toISOString()).toBe('2026-01-15T03:00:00.000Z');
    expect(summer.lt.toISOString()).toBe('2026-01-16T03:00:00.000Z');

    const winter = chileDayRange('2026-07-15');
    expect(winter.gte.toISOString()).toBe('2026-07-15T04:00:00.000Z');
    expect(winter.lt.toISOString()).toBe('2026-07-16T04:00:00.000Z');
  });

  it('rangeBound resolves bare dates to Chile day edges', () => {
    expect(rangeBound('2026-09-22', false).toISOString()).toBe('2026-09-22T03:00:00.000Z');
    // end bound is inclusive-safe: last millisecond of the local day
    expect(rangeBound('2026-09-22', true).toISOString()).toBe('2026-09-23T02:59:59.999Z');
  });

  it('rangeBound keeps full datetimes untouched', () => {
    expect(rangeBound('2026-09-22T10:00:00.000Z', true).toISOString()).toBe('2026-09-22T10:00:00.000Z');
  });

  it('rejects invalid dates', () => {
    expect(() => startOfChileDay('no-fecha')).toThrow('Fecha inválida');
    expect(() => startOfChileDay('2026-13-40')).toThrow('Fecha inválida');
    expect(() => rangeBound('no-fecha', false)).toThrow('Fecha inválida');
  });

  it('todayChileISO matches America/Santiago calendar', () => {
    // 2026-09-22 02:30 UTC is still Sep 21 in Chile (UTC-3)
    expect(todayChileISO(new Date('2026-09-22T02:30:00.000Z'))).toBe('2026-09-21');
    expect(todayChileISO(new Date('2026-09-22T03:30:00.000Z'))).toBe('2026-09-22');
  });
});
