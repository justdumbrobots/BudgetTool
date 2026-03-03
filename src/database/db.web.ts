/**
 * localStorage-based database layer for PayPeriod (web / PWA).
 *
 * Mirrors the exact same API as db.ts so the Zustand store needs no changes.
 * Metro automatically resolves this file on the web platform instead of db.ts.
 *
 * Data is stored as JSON in localStorage under the following keys:
 *   payperiod.settings  — key/value settings (e.g. isOnboarded)
 *   payperiod.profile   — UserProfile object
 *   payperiod.bills     — Bill[]
 *   payperiod.extras    — ExtraItem[]
 */

import { UserProfile, Bill, ExtraItem } from '../types';

const KEYS = {
  settings: 'payperiod.settings',
  profile: 'payperiod.profile',
  bills: 'payperiod.bills',
  extras: 'payperiod.extras',
} as const;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Schema Setup ─────────────────────────────────────────────────────────────

// localStorage is always available — nothing to initialize.
export function initDatabase(): void {}

// ─── App Settings ─────────────────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const settings = read<Record<string, string>>(KEYS.settings) ?? {};
  return settings[key] ?? null;
}

export function setSetting(key: string, value: string): void {
  const settings = read<Record<string, string>>(KEYS.settings) ?? {};
  settings[key] = value;
  write(KEYS.settings, settings);
}

// ─── UserProfile ──────────────────────────────────────────────────────────────

export function loadProfile(): UserProfile | null {
  return read<UserProfile>(KEYS.profile);
}

export function saveProfile(profile: UserProfile): void {
  write(KEYS.profile, profile);
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export function loadBills(userId: string): Bill[] {
  const bills = read<Bill[]>(KEYS.bills) ?? [];
  return bills
    .filter((b) => b.userId === userId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

export function saveBill(bill: Bill): void {
  const bills = read<Bill[]>(KEYS.bills) ?? [];
  const idx = bills.findIndex((b) => b.id === bill.id);
  if (idx >= 0) {
    bills[idx] = bill;
  } else {
    bills.push(bill);
  }
  write(KEYS.bills, bills);
}

export function deleteBill(id: string): void {
  const bills = (read<Bill[]>(KEYS.bills) ?? []).filter((b) => b.id !== id);
  write(KEYS.bills, bills);
}

// ─── Extra Items ──────────────────────────────────────────────────────────────

export function loadExtras(userId: string): ExtraItem[] {
  const extras = read<ExtraItem[]>(KEYS.extras) ?? [];
  return extras
    .filter((e) => e.userId === userId)
    .sort((a, b) => a.periodIndex - b.periodIndex || a.createdAt.localeCompare(b.createdAt));
}

export function saveExtra(item: ExtraItem): void {
  const extras = read<ExtraItem[]>(KEYS.extras) ?? [];
  const idx = extras.findIndex((e) => e.id === item.id);
  if (idx >= 0) {
    extras[idx] = item;
  } else {
    extras.push(item);
  }
  write(KEYS.extras, extras);
}

export function deleteExtra(id: string): void {
  const extras = (read<ExtraItem[]>(KEYS.extras) ?? []).filter((e) => e.id !== id);
  write(KEYS.extras, extras);
}
