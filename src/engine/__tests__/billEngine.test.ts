/**
 * Bill Engine Test Suite
 *
 * Validates that the bill engine produces identical results to the Excel formula
 * engine as specified in PRD Appendix B.
 *
 * Test cases from Appendix B:
 *   1. BW bills only (no monthly due)   → $935
 *   2. Monthly rent (due 1st)           → $2,635
 *   3. Monthly + BW mix                 → $3,077+
 *   4. Paused bill excluded             → $0 for that bill
 *   5. Ended bill excluded              → $0 for that bill
 */

import { computePeriod } from '../billEngine';
import { Bill } from '../../types';

// ─── Test bill factory ────────────────────────────────────────────────────────

function makeBill(overrides: Partial<Bill> & Pick<Bill, 'name' | 'amount' | 'frequency'>): Bill {
  return {
    id: overrides.name ?? 'test',
    userId: 'user1',
    dueDay: null,
    category: 'other',
    status: 'active',
    sortOrder: 0,
    createdAt: '',
    ...overrides,
  };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day); // month is 1-indexed here for readability
}

// ─── Test Cases ───────────────────────────────────────────────────────────────

describe('Bill Engine — Appendix B Test Cases', () => {

  // Test 1: BW bills only, Pay Date 02/20/26, Next Pay 03/06/26
  test('BW bills only (no monthly bills) → $935', () => {
    const bills: Bill[] = [
      makeBill({ name: 'Intoxalock', amount: 55,  frequency: 'bi-weekly' }),
      makeBill({ name: 'Gas',        amount: 80,  frequency: 'bi-weekly' }),
      makeBill({ name: 'Misc',       amount: 800, frequency: 'bi-weekly' }),
    ];

    const result = computePeriod(
      0,
      d(2026, 2, 20), // Feb 20, 2026
      d(2026, 3,  6), // Mar  6, 2026
      bills,
      [],
      3000, // income doesn't affect bill total
      0,
    );

    expect(result.billTotal).toBe(935);
    expect(result.billDetails).toHaveLength(3);
  });

  // Test 2: Monthly rent (due 1st) + BW bills, same date range
  // Mar 1 falls in [Feb 20, Mar 6) → rent is included
  test('Monthly rent (due 1st) in 02/20/26–03/06/26 window → $2,635', () => {
    const bills: Bill[] = [
      makeBill({ name: 'Rent',       amount: 1700, frequency: 'monthly',   dueDay: 1 }),
      makeBill({ name: 'Intoxalock', amount: 55,   frequency: 'bi-weekly' }),
      makeBill({ name: 'Gas',        amount: 80,   frequency: 'bi-weekly' }),
      makeBill({ name: 'Misc',       amount: 800,  frequency: 'bi-weekly' }),
    ];

    const result = computePeriod(
      0,
      d(2026, 2, 20),
      d(2026, 3,  6),
      bills,
      [],
      3000,
      0,
    );

    expect(result.billTotal).toBe(2635);
    // Rent should be assigned because Mar 1 ∈ [Feb 20, Mar 6)
    const rentEntry = result.billDetails.find((b) => b.bill.name === 'Rent');
    expect(rentEntry).toBeDefined();
    expect(rentEntry?.amount).toBe(1700);
  });

  // Test 3: Various monthly bills + BW, 01/09/26–01/23/26
  // Bills with due days that fall in this window are included
  test('Monthly + BW mix for 01/09/26–01/23/26', () => {
    const bills: Bill[] = [
      // Monthly bills with due day=15 → Jan 15 ∈ [Jan 9, Jan 23) ✓
      makeBill({ name: 'Rent',    amount: 1700, frequency: 'monthly', dueDay: 15 }),
      makeBill({ name: 'Tax',     amount: 200,  frequency: 'monthly', dueDay: 12 }),
      makeBill({ name: 'ATT',     amount: 85,   frequency: 'monthly', dueDay: 10 }),
      makeBill({ name: 'Gym',     amount: 40,   frequency: 'monthly', dueDay: 18 }),
      makeBill({ name: 'CoServ',  amount: 120,  frequency: 'monthly', dueDay: 20 }),
      // Monthly with due day=1 → Jan 1 NOT in [Jan 9, Jan 23); Feb 1 NOT in range → excluded
      makeBill({ name: 'Ins',     amount: 150,  frequency: 'monthly', dueDay: 1 }),
      // BW always included
      makeBill({ name: 'Intoxalock', amount: 55,  frequency: 'bi-weekly' }),
      makeBill({ name: 'Gas',        amount: 80,  frequency: 'bi-weekly' }),
      makeBill({ name: 'Misc',       amount: 800, frequency: 'bi-weekly' }),
    ];

    const result = computePeriod(
      0,
      d(2026, 1,  9), // Jan 9, 2026
      d(2026, 1, 23), // Jan 23, 2026
      bills,
      [],
      3000,
      0,
    );

    // BW bills: 55 + 80 + 800 = 935
    // Monthly with due day in [Jan 9, Jan 23): Tax(12)=200, ATT(10)=85, Rent(15)=1700, Gym(18)=40, CoServ(20)=120
    //   → 200 + 85 + 1700 + 40 + 120 = 2145
    // Ins (due 1) → Jan 1 < Jan 9 (not in range), Feb 1 > Jan 23 (not in range) → 0
    // Total: 935 + 2145 = 3080
    expect(result.billTotal).toBeGreaterThanOrEqual(3077); // PRD says "$3077+"

    // Insurance due on 1st should NOT be in this period
    const insEntry = result.billDetails.find((b) => b.bill.name === 'Ins');
    expect(insEntry).toBeUndefined();
  });

  // Test 4: Paused bill is excluded
  test('Paused bill contributes $0 to period', () => {
    const bills: Bill[] = [
      makeBill({ name: 'Active',  amount: 100, frequency: 'bi-weekly', status: 'active' }),
      makeBill({ name: 'Paused',  amount: 500, frequency: 'bi-weekly', status: 'paused' }),
    ];

    const result = computePeriod(
      0,
      d(2026, 2, 20),
      d(2026, 3,  6),
      bills,
      [],
      3000,
      0,
    );

    expect(result.billTotal).toBe(100);
    const pausedEntry = result.billDetails.find((b) => b.bill.name === 'Paused');
    expect(pausedEntry).toBeUndefined();
  });

  // Test 5: Ended bill is excluded
  test('Ended bill contributes $0 to period', () => {
    const bills: Bill[] = [
      makeBill({ name: 'Active', amount: 200, frequency: 'weekly', status: 'active' }),
      makeBill({ name: 'Ended',  amount: 999, frequency: 'weekly', status: 'ended' }),
    ];

    const result = computePeriod(
      0,
      d(2026, 2, 20),
      d(2026, 3,  6),
      bills,
      [],
      3000,
      0,
    );

    expect(result.billTotal).toBe(200);
    const endedEntry = result.billDetails.find((b) => b.bill.name === 'Ended');
    expect(endedEntry).toBeUndefined();
  });

  // Additional: monthly bill due on last day of period (exclusive boundary)
  test('Monthly bill due exactly on nextPayDate is excluded (exclusive upper bound)', () => {
    const bills: Bill[] = [
      // Due on Mar 6 → nextPayDate is Mar 6 → excluded (interval is [payDate, nextPayDate))
      makeBill({ name: 'ExactEnd', amount: 300, frequency: 'monthly', dueDay: 6 }),
    ];

    const result = computePeriod(
      0,
      d(2026, 2, 20), // Feb 20
      d(2026, 3,  6), // Mar 6  (exclusive)
      bills,
      [],
      3000,
      0,
    );

    // Mar 6 is NOT < Mar 6 (exclusive end), so bill is excluded
    const entry = result.billDetails.find((b) => b.bill.name === 'ExactEnd');
    expect(entry).toBeUndefined();
    expect(result.billTotal).toBe(0);
  });

  // Additional: running balance threads correctly
  test('Running balance propagates from previousBalance', () => {
    const bills: Bill[] = [
      makeBill({ name: 'Gas', amount: 100, frequency: 'bi-weekly' }),
    ];

    const result = computePeriod(
      0,
      d(2026, 2, 20),
      d(2026, 3,  6),
      bills,
      [],
      1000, // income
      500,  // starting balance
    );

    // net = 1000 - 100 = 900; balance = 500 + 900 = 1400
    expect(result.net).toBe(900);
    expect(result.runningBalance).toBe(1400);
  });

  // Additional: extra items are summed into extraTotal
  test('Extra items contribute to extraTotal and reduce net', () => {
    const bills: Bill[] = [];
    const extras = [
      { id: 'e1', userId: 'u1', periodIndex: 0, amount: 200,  note: 'Car repair',    category: null, createdAt: '' },
      { id: 'e2', userId: 'u1', periodIndex: 0, amount: -100, note: 'Side gig',      category: null, createdAt: '' },
      { id: 'e3', userId: 'u1', periodIndex: 1, amount: 9999, note: 'Other period', category: null, createdAt: '' }, // should be filtered
    ];

    const result = computePeriod(0, d(2026, 2, 20), d(2026, 3, 6), bills, extras, 2000, 0);

    // extraTotal = 200 + (-100) = 100
    expect(result.extraTotal).toBe(100);
    // net = 2000 - (0 + 100) = 1900
    expect(result.net).toBe(1900);
    // Only extras for period 0 included
    expect(result.extraItems).toHaveLength(2);
  });
});

describe('Bill Engine — Monthly date-window edge cases', () => {
  test('Monthly bill due on 28th is handled without crashing in Feb', () => {
    const bills: Bill[] = [
      makeBill({ name: 'LateMonthly', amount: 100, frequency: 'monthly', dueDay: 28 }),
    ];

    // No crash expected for any date range
    expect(() =>
      computePeriod(0, d(2026, 2, 14), d(2026, 2, 28), bills, [], 1000, 0),
    ).not.toThrow();
  });

  test('Monthly bill with dueDay=null returns 0', () => {
    const bills: Bill[] = [
      makeBill({ name: 'NoDueDay', amount: 500, frequency: 'monthly', dueDay: null }),
    ];

    const result = computePeriod(0, d(2026, 2, 20), d(2026, 3, 6), bills, [], 1000, 0);
    expect(result.billTotal).toBe(0);
  });
});
