import { PayFrequency, PayPeriod } from '../types';
import { parseLocalDate } from '../utils/formatters';

const MAX_PERIODS = 800;

/**
 * Generate up to MAX_PERIODS pay periods starting from anchorPayDate.
 *
 * For bi-weekly: every 14 days
 * For weekly: every 7 days
 * For monthly: same day each month
 * For semi-monthly: alternates between two half-month anchors
 */
export function generatePayPeriods(
  anchorPayDate: string,
  frequency: PayFrequency,
): PayPeriod[] {
  const anchor = parseLocalDate(anchorPayDate);
  const periods: PayPeriod[] = [];

  for (let i = 0; i < MAX_PERIODS; i++) {
    const payDate = addPeriod(anchor, i, frequency);
    const nextPayDate = addPeriod(anchor, i + 1, frequency);
    periods.push({ index: i, payDate, nextPayDate });
  }

  return periods;
}

/**
 * Advance the anchor date by `count` pay periods.
 */
function addPeriod(anchor: Date, count: number, frequency: PayFrequency): Date {
  switch (frequency) {
    case 'weekly': {
      const d = new Date(anchor);
      d.setDate(d.getDate() + count * 7);
      return d;
    }
    case 'bi-weekly': {
      const d = new Date(anchor);
      d.setDate(d.getDate() + count * 14);
      return d;
    }
    case 'monthly': {
      const d = new Date(anchor);
      d.setMonth(d.getMonth() + count);
      return d;
    }
    case 'semi-monthly': {
      // Anchor is either the 1st-half or 2nd-half pay date.
      // Each pay cycle alternates: if anchor.day <= 15, pattern is
      // [anchor.day, 15+anchor.day] → every ~15 days.
      // We approximate: odd counts add 15 days, even counts add (month length - 15).
      return addSemiMonthly(anchor, count);
    }
  }
}

/**
 * Semi-monthly period advancement.
 *
 * Assumes payments on two fixed days per month, inferred from anchor:
 *   - If anchor.day ≤ 15 → pays on [anchor.day, anchor.day+15] each month
 *   - If anchor.day > 15  → pays on [anchor.day-15, anchor.day] each month
 *
 * Each call constructs the n-th pay date from scratch.
 */
function addSemiMonthly(anchor: Date, count: number): Date {
  const anchorDay = anchor.getDate();
  const isFirstHalf = anchorDay <= 15;
  const day1 = isFirstHalf ? anchorDay : anchorDay - 15;
  const day2 = isFirstHalf ? anchorDay + 15 : anchorDay;

  // Determine which month offset and which half.
  // count=0 → first pay date (anchor itself)
  // count=1 → second pay date (same month)
  // count=2 → first pay date of next month, etc.

  // Determine the "phase" at the anchor (0 = day1 pay, 1 = day2 pay)
  const anchorPhase = anchorDay === day1 ? 0 : 1;
  const totalPhase = anchorPhase + count;

  const monthOffset = Math.floor(totalPhase / 2);
  const phase = totalPhase % 2;

  const d = new Date(anchor);
  d.setMonth(d.getMonth() + monthOffset);
  d.setDate(phase === 0 ? day1 : day2);
  return d;
}

/**
 * Find the index of the current pay period (the one that contains today).
 * Returns 0 if today is before the first period, or the last index if past all periods.
 */
export function getCurrentPeriodIndex(periods: PayPeriod[]): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = 0; i < periods.length; i++) {
    const start = new Date(periods[i].payDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(periods[i].nextPayDate);
    end.setHours(0, 0, 0, 0);

    if (now >= start && now < end) return i;
  }

  // Before the first period → scroll to 0
  if (now < periods[0].payDate) return 0;

  // After all periods → return last
  return periods.length - 1;
}

/**
 * Find the period index that contains the given date.
 * Returns -1 if the date falls outside all generated periods.
 */
export function getPeriodIndexForDate(date: Date, periods: PayPeriod[]): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  for (let i = 0; i < periods.length; i++) {
    const start = new Date(periods[i].payDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(periods[i].nextPayDate);
    end.setHours(0, 0, 0, 0);
    if (d >= start && d < end) return i;
  }

  return -1;
}

/**
 * Find the most recently completed period (payDate ≤ today).
 * Used for the dashboard "current balance" reading.
 */
export function getMostRecentPeriodIndex(periods: PayPeriod[]): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = periods.length - 1; i >= 0; i--) {
    const start = new Date(periods[i].payDate);
    start.setHours(0, 0, 0, 0);
    if (start <= now) return i;
  }

  return 0;
}
