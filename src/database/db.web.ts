/**
 * localStorage-based database layer for PayPeriod (web / PWA).
 *
 * Mirrors the exact same API as db.ts so the Zustand store needs no changes.
 * Metro automatically resolves this file on the web platform instead of db.ts.
 *
 * All user data is namespaced by userId so multiple accounts work on the
 * same browser without collision:
 *   payperiod.settings.<userId>  — per-user settings (e.g. isOnboarded)
 *   payperiod.profile.<userId>   — UserProfile object
 *   payperiod.bills.<userId>     — Bill[]
 *   payperiod.extras.<userId>    — ExtraItem[]
 *
 * Global settings (not user-scoped) use:
 *   payperiod.settings.__global
 */

import { UserProfile, Bill, ExtraItem } from '../types';

function userKeys(userId: string) {
  return {
    settings: `payperiod.settings.${userId}`,
    profile:  `payperiod.profile.${userId}`,
    bills:    `payperiod.bills.${userId}`,
    extras:   `payperiod.extras.${userId}`,
  };
}

const GLOBAL_SETTINGS_KEY = 'payperiod.settings.__global';

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

export function initDatabase(): void {}

// ─── App Settings ─────────────────────────────────────────────────────────────
// Settings without a userId (e.g., app-wide flags) use the global key.
// Settings with a userId (e.g., isOnboarded_<id>) are stored per-user.
// The caller encodes the userId into the key string, so we just need a bucket.

export function getSetting(key: string): string | null {
  const settings = read<Record<string, string>>(GLOBAL_SETTINGS_KEY) ?? {};
  return settings[key] ?? null;
}

export function setSetting(key: string, value: string): void {
  const settings = read<Record<string, string>>(GLOBAL_SETTINGS_KEY) ?? {};
  settings[key] = value;
  write(GLOBAL_SETTINGS_KEY, settings);
}

// ─── UserProfile ──────────────────────────────────────────────────────────────

export function loadProfile(userId: string): UserProfile | null {
  return read<UserProfile>(userKeys(userId).profile);
}

export function saveProfile(profile: UserProfile): void {
  write(userKeys(profile.id).profile, profile);
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export function loadBills(userId: string): Bill[] {
  const bills = read<Bill[]>(userKeys(userId).bills) ?? [];
  return bills.sort(
    (a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt),
  );
}

export function saveBill(bill: Bill): void {
  const bills = read<Bill[]>(userKeys(bill.userId).bills) ?? [];
  const idx = bills.findIndex((b) => b.id === bill.id);
  if (idx >= 0) {
    bills[idx] = bill;
  } else {
    bills.push(bill);
  }
  write(userKeys(bill.userId).bills, bills);
}

export function deleteBill(id: string): void {
  // We don't know the userId here, so scan all user bill buckets.
  // In practice the caller always holds a reference to the bill, but the
  // db API only exposes the id. As a workaround we check all known user
  // buckets by iterating localStorage keys.
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('payperiod.bills.')) {
      const bills = (read<Bill[]>(key) ?? []).filter((b) => b.id !== id);
      write(key, bills);
    }
  }
}

// ─── Extra Items ──────────────────────────────────────────────────────────────

export function loadExtras(userId: string): ExtraItem[] {
  const extras = read<ExtraItem[]>(userKeys(userId).extras) ?? [];
  return extras.sort(
    (a, b) => a.periodIndex - b.periodIndex || a.createdAt.localeCompare(b.createdAt),
  );
}

export function saveExtra(item: ExtraItem): void {
  const extras = read<ExtraItem[]>(userKeys(item.userId).extras) ?? [];
  const idx = extras.findIndex((e) => e.id === item.id);
  if (idx >= 0) {
    extras[idx] = item;
  } else {
    extras.push(item);
  }
  write(userKeys(item.userId).extras, extras);
}

export function deleteExtra(id: string): void {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('payperiod.extras.')) {
      const extras = (read<ExtraItem[]>(key) ?? []).filter((e) => e.id !== id);
      write(key, extras);
    }
  }
}
