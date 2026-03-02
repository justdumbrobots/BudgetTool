/**
 * Bill Engine — Core computation logic for PayPeriod.
 *
 * Replicates the proven Excel-based per-bill-per-period algorithm described in
 * PRD Section 4.2. Each bill independently determines its amount for a given
 * pay period based on its frequency and due day. No array aggregation — pure
 * deterministic loop.
 *
 * Algorithm (from PRD Section 4.2.1):
 *   For each pay period P with pay date D and next pay date N:
 *     For each bill B:
 *       - If B.status ≠ "Active": skip (amount = 0)
 *       - If B.frequency is "Bi-Weekly" or "Weekly": amount = B.amount (always)
 *       - If B.frequency is "Monthly":
 *           Check if DATE(YEAR(D), MONTH(D), B.dueDay) falls in [D, N).
 *           Also check next month: DATE(YEAR(D), MONTH(D)+1, B.dueDay).
 *           If either falls in range → amount = B.amount, else 0.
 *       - If B.frequency is "Semi-Monthly":
 *           Same window check but with two due days per month.
 *     Period total = SUM of all bill amounts for that period.
 */

import { Bill, ExtraItem, BillPeriodResult, ComputedPeriod } from '../types';

/**
 * Compute a single pay period's financial summary.
 *
 * @param index          Period index (0-based)
 * @param payDate        Pay date for this period
 * @param nextPayDate    Pay date for the NEXT period (exclusive end of window)
 * @param bills          All user bills (filtered internally by status)
 * @param extras         All extra items (filtered by periodIndex === index)
 * @param income         Income per period (take-home + side income)
 * @param previousBalance Running balance from the prior period
 */
export function computePeriod(
  index: number,
  payDate: Date,
  nextPayDate: Date,
  bills: Bill[],
  extras: ExtraItem[],
  income: number,
  previousBalance: number,
): ComputedPeriod {
  const billDetails: BillPeriodResult[] = [];
  let billTotal = 0;

  for (const bill of bills) {
    if (bill.status !== 'active') continue;

    const amount = getBillAmount(bill, payDate, nextPayDate);

    if (amount > 0) {
      billDetails.push({ bill, amount });
    }
    billTotal += amount;
  }

  const periodExtras = extras.filter((e) => e.periodIndex === index);
  const extraTotal = periodExtras.reduce((sum, e) => sum + e.amount, 0);
  const net = income - (billTotal + extraTotal);
  const runningBalance = previousBalance + net;

  return {
    index,
    payDate,
    nextPayDate,
    billDetails,
    billTotal,
    extraItems: periodExtras,
    extraTotal,
    income,
    net,
    runningBalance,
  };
}

/**
 * Determine the amount a bill contributes to a pay period.
 *
 * Returns 0 if the bill does not fall in this period.
 */
function getBillAmount(bill: Bill, payDate: Date, nextPayDate: Date): number {
  switch (bill.frequency) {
    case 'bi-weekly':
    case 'weekly':
      // Always included in every period.
      return bill.amount;

    case 'monthly':
      return getMonthlyAmount(bill, payDate, nextPayDate);

    case 'semi-monthly':
      return getSemiMonthlyAmount(bill, payDate, nextPayDate);
  }
}

/**
 * Monthly bill: check if bill.dueDay falls in [payDate, nextPayDate) for
 * the current month OR the next month.
 *
 * Using Date(year, month, day) with JS 0-indexed months:
 *   month of payDate  → payDate.getMonth()
 *   next month        → payDate.getMonth() + 1
 *
 * Note: new Date(year, 13, 1) correctly wraps to Feb of year+1.
 */
function getMonthlyAmount(bill: Bill, payDate: Date, nextPayDate: Date): number {
  if (bill.dueDay === null) return 0;

  const year = payDate.getFullYear();
  const month = payDate.getMonth(); // 0-indexed

  // Due date in the same month as payDate
  const d1 = new Date(year, month, bill.dueDay);
  // Due date in the following month
  const d2 = new Date(year, month + 1, bill.dueDay);

  if (dateInWindow(d1, payDate, nextPayDate) || dateInWindow(d2, payDate, nextPayDate)) {
    return bill.amount;
  }
  return 0;
}

/**
 * Semi-monthly bill: charged twice per month.
 * The two due days are dueDay and dueDay + 15.
 * (e.g. dueDay=1 → due on 1st and 16th of each month)
 *
 * Checks all four candidate dates (current month × 2 due days, next month × 2).
 */
function getSemiMonthlyAmount(bill: Bill, payDate: Date, nextPayDate: Date): number {
  if (bill.dueDay === null) return 0;

  const year = payDate.getFullYear();
  const month = payDate.getMonth();

  const dueDay1 = bill.dueDay;
  const dueDay2 = bill.dueDay + 15 <= 28 ? bill.dueDay + 15 : 15; // second occurrence

  const candidates = [
    new Date(year, month, dueDay1),
    new Date(year, month, dueDay2),
    new Date(year, month + 1, dueDay1),
    new Date(year, month + 1, dueDay2),
  ];

  for (const candidate of candidates) {
    if (dateInWindow(candidate, payDate, nextPayDate)) {
      return bill.amount;
    }
  }
  return 0;
}

/**
 * Returns true if `date` falls in the half-open interval [start, end).
 * All comparisons at day resolution (time-of-day ignored via normalization).
 */
function dateInWindow(date: Date, start: Date, end: Date): boolean {
  const d = normalizeDate(date);
  const s = normalizeDate(start);
  const e = normalizeDate(end);
  return d >= s && d < e;
}

/**
 * Strip time component for reliable date comparison.
 */
function normalizeDate(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Compute all periods in sequence, threading the running balance forward.
 *
 * @param periods     Generated pay period date ranges
 * @param bills       User's bill list
 * @param extras      All extra items
 * @param income      Income per period
 * @param startBal    Initial running balance (defaults to 0)
 */
export function computeAllPeriods(
  periods: { index: number; payDate: Date; nextPayDate: Date }[],
  bills: Bill[],
  extras: ExtraItem[],
  income: number,
  startBal = 0,
): ComputedPeriod[] {
  const results: ComputedPeriod[] = [];
  let balance = startBal;

  for (const p of periods) {
    const computed = computePeriod(
      p.index,
      p.payDate,
      p.nextPayDate,
      bills,
      extras,
      income,
      balance,
    );
    balance = computed.runningBalance;
    results.push(computed);
  }

  return results;
}
