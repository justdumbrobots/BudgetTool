/**
 * SQLite database layer for PayPeriod.
 *
 * Uses expo-sqlite's synchronous API (SDK 51+) for simple, reliable
 * local persistence. All user data lives on-device; no network required.
 *
 * Tables:
 *   user_profile  — one row per installation
 *   bills         — recurring bills
 *   extra_items   — one-time per-period entries
 *   app_settings  — key/value store for flags (isOnboarded, etc.)
 */

import * as SQLite from 'expo-sqlite';
import { UserProfile, Bill, ExtraItem } from '../types';

let _db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('payperiod.db');
  }
  return _db;
}

// ─── Schema Setup ─────────────────────────────────────────────────────────────

export function initDatabase(): void {
  const db = getDb();

  db.execSync(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY,
      payFrequency TEXT NOT NULL,
      anchorPayDate TEXT NOT NULL,
      incomePerPeriod REAL NOT NULL DEFAULT 0,
      sideIncome REAL NOT NULL DEFAULT 0,
      startingBalance REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      dueDay INTEGER,
      frequency TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS extra_items (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      periodIndex INTEGER NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      category TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const row = getDb().getFirstSync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb().runSync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    [key, value],
  );
}

// ─── UserProfile ──────────────────────────────────────────────────────────────

export function loadProfile(): UserProfile | null {
  const row = getDb().getFirstSync<UserProfile>(
    'SELECT * FROM user_profile LIMIT 1',
  );
  return row ?? null;
}

export function saveProfile(profile: UserProfile): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO user_profile
      (id, payFrequency, anchorPayDate, incomePerPeriod, sideIncome, startingBalance, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      profile.id,
      profile.payFrequency,
      profile.anchorPayDate,
      profile.incomePerPeriod,
      profile.sideIncome,
      profile.startingBalance,
      profile.createdAt,
    ],
  );
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export function loadBills(userId: string): Bill[] {
  return getDb().getAllSync<Bill>(
    'SELECT * FROM bills WHERE userId = ? ORDER BY sortOrder ASC, createdAt ASC',
    [userId],
  );
}

export function saveBill(bill: Bill): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO bills
      (id, userId, name, amount, dueDay, frequency, category, status, sortOrder, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      bill.id,
      bill.userId,
      bill.name,
      bill.amount,
      bill.dueDay ?? null,
      bill.frequency,
      bill.category,
      bill.status,
      bill.sortOrder,
      bill.createdAt,
    ],
  );
}

export function deleteBill(id: string): void {
  getDb().runSync('DELETE FROM bills WHERE id = ?', [id]);
}

// ─── Extra Items ──────────────────────────────────────────────────────────────

export function loadExtras(userId: string): ExtraItem[] {
  return getDb().getAllSync<ExtraItem>(
    'SELECT * FROM extra_items WHERE userId = ? ORDER BY periodIndex ASC, createdAt ASC',
    [userId],
  );
}

export function saveExtra(item: ExtraItem): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO extra_items
      (id, userId, periodIndex, amount, note, category, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.userId,
      item.periodIndex,
      item.amount,
      item.note ?? null,
      item.category ?? null,
      item.createdAt,
    ],
  );
}

export function deleteExtra(id: string): void {
  getDb().runSync('DELETE FROM extra_items WHERE id = ?', [id]);
}
