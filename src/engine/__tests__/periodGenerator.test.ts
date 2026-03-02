/**
 * Period Generator Tests
 *
 * Validates that pay periods are generated correctly for all frequencies.
 */

import { generatePayPeriods, getCurrentPeriodIndex } from '../periodGenerator';

describe('generatePayPeriods — bi-weekly', () => {
  const anchor = '2026-01-09'; // Jan 9, 2026 (a Friday)

  test('generates 800 periods', () => {
    const periods = generatePayPeriods(anchor, 'bi-weekly');
    expect(periods).toHaveLength(800);
  });

  test('first period starts on anchor date', () => {
    const periods = generatePayPeriods(anchor, 'bi-weekly');
    const p0 = periods[0];
    expect(p0.payDate.getFullYear()).toBe(2026);
    expect(p0.payDate.getMonth()).toBe(0); // January (0-indexed)
    expect(p0.payDate.getDate()).toBe(9);
  });

  test('second period is 14 days after anchor', () => {
    const periods = generatePayPeriods(anchor, 'bi-weekly');
    const p1 = periods[1];
    expect(p1.payDate.getDate()).toBe(23); // Jan 9 + 14 = Jan 23
    expect(p1.payDate.getMonth()).toBe(0);
  });

  test('next pay date of period N equals pay date of period N+1', () => {
    const periods = generatePayPeriods(anchor, 'bi-weekly');
    for (let i = 0; i < 10; i++) {
      expect(periods[i].nextPayDate.getTime()).toBe(periods[i + 1].payDate.getTime());
    }
  });

  test('period indices are sequential 0-based', () => {
    const periods = generatePayPeriods(anchor, 'bi-weekly');
    periods.forEach((p, i) => expect(p.index).toBe(i));
  });
});

describe('generatePayPeriods — weekly', () => {
  const anchor = '2026-01-05'; // Jan 5, 2026

  test('generates 800 periods', () => {
    expect(generatePayPeriods(anchor, 'weekly')).toHaveLength(800);
  });

  test('periods are 7 days apart', () => {
    const periods = generatePayPeriods(anchor, 'weekly');
    const MS_PER_DAY = 86_400_000;
    for (let i = 0; i < 10; i++) {
      const diff = periods[i + 1].payDate.getTime() - periods[i].payDate.getTime();
      expect(diff).toBe(7 * MS_PER_DAY);
    }
  });
});

describe('generatePayPeriods — monthly', () => {
  const anchor = '2026-01-01';

  test('generates 800 periods', () => {
    expect(generatePayPeriods(anchor, 'monthly')).toHaveLength(800);
  });

  test('each period is one month apart', () => {
    const periods = generatePayPeriods(anchor, 'monthly');
    // Period 0: Jan 1, Period 1: Feb 1, Period 2: Mar 1
    expect(periods[1].payDate.getMonth()).toBe(1); // February
    expect(periods[2].payDate.getMonth()).toBe(2); // March
    expect(periods[12].payDate.getFullYear()).toBe(2027);
  });
});

describe('getCurrentPeriodIndex', () => {
  test('returns 0 when today is before first period', () => {
    // Anchor far in the future
    const periods = generatePayPeriods('2050-01-01', 'bi-weekly');
    const idx = getCurrentPeriodIndex(periods);
    expect(idx).toBe(0);
  });

  test('returns an index within bounds', () => {
    const periods = generatePayPeriods('2020-01-01', 'bi-weekly');
    const idx = getCurrentPeriodIndex(periods);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(periods.length);
  });
});
