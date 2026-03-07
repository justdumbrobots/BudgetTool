/**
 * Zustand store — single source of truth for all app state.
 *
 * SQLite is the persistence layer; this store holds the in-memory view.
 * Call `initialize(userId)` whenever the authenticated user changes to
 * hydrate their data from the database.
 *
 * Call `reset()` on sign-out to wipe in-memory state.
 *
 * Computed periods are derived whenever profile, bills, or extras change.
 */

import { create } from 'zustand';
import {
  UserProfile,
  Bill,
  ExtraItem,
  PayPeriod,
  ComputedPeriod,
  BillCategory,
  BillFrequency,
  BillStatus,
  PayFrequency,
} from '../types';
import {
  initDatabase,
  loadProfile,
  saveProfile,
  loadBills,
  saveBill,
  deleteBill as dbDeleteBill,
  loadExtras,
  saveExtra,
  deleteExtra as dbDeleteExtra,
  getSetting,
  setSetting,
} from '../database/db';
import { generatePayPeriods } from '../engine/periodGenerator';
import { computeAllPeriods } from '../engine/billEngine';
import { generateId } from '../utils/formatters';

// ─── State Shape ──────────────────────────────────────────────────────────────

interface AppState {
  // Persisted
  userId: string | null;
  profile: UserProfile | null;
  bills: Bill[];
  extras: ExtraItem[];
  isOnboarded: boolean;

  // Computed (derived on each change)
  periods: PayPeriod[];
  computedPeriods: ComputedPeriod[];

  // UI
  isLoading: boolean;
  error: string | null;
}

// ─── Actions Shape ────────────────────────────────────────────────────────────

interface AppActions {
  initialize: (userId: string) => void;
  reset: () => void;
  completeOnboarding: () => void;

  // Profile
  saveProfileAction: (data: {
    payFrequency: PayFrequency;
    anchorPayDate: string;
    incomePerPeriod: number;
    sideIncome: number;
    startingBalance: number;
  }) => void;

  // Bills
  addBill: (data: {
    name: string;
    amount: number;
    dueDay: number | null;
    frequency: BillFrequency;
    category: BillCategory;
  }) => void;
  updateBill: (id: string, updates: Partial<Omit<Bill, 'id' | 'userId' | 'createdAt'>>) => void;
  removeBill: (id: string) => void;

  // Extras
  addExtra: (data: {
    periodIndex: number;
    amount: number;
    note: string | null;
    category: BillCategory | null;
  }) => void;
  updateExtra: (id: string, updates: Partial<Omit<ExtraItem, 'id' | 'userId' | 'createdAt'>>) => void;
  removeExtra: (id: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function recompute(
  profile: UserProfile | null,
  bills: Bill[],
  extras: ExtraItem[],
): { periods: PayPeriod[]; computedPeriods: ComputedPeriod[] } {
  if (!profile) return { periods: [], computedPeriods: [] };

  const periods = generatePayPeriods(profile.anchorPayDate, profile.payFrequency);
  const income = profile.incomePerPeriod + profile.sideIncome;
  const computedPeriods = computeAllPeriods(
    periods,
    bills,
    extras,
    income,
    profile.startingBalance,
  );
  return { periods, computedPeriods };
}

const INITIAL_STATE = {
  userId: null as string | null,
  profile: null as UserProfile | null,
  bills: [] as Bill[],
  extras: [] as ExtraItem[],
  isOnboarded: false,
  periods: [] as PayPeriod[],
  computedPeriods: [] as ComputedPeriod[],
  isLoading: true,
  error: null as string | null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  ...INITIAL_STATE,

  // ── Initialization ─────────────────────────────────────────────────────────
  // Called by AppNavigator whenever the authenticated user changes.
  // The userId comes from Supabase auth and becomes the profile's primary key.

  initialize(userId: string) {
    try {
      initDatabase();

      const isOnboarded = getSetting(`isOnboarded_${userId}`) === 'true';
      const profile = loadProfile(userId);
      const bills = profile ? loadBills(profile.id) : [];
      const extras = profile ? loadExtras(profile.id) : [];
      const { periods, computedPeriods } = recompute(profile, bills, extras);

      set({ userId, profile, bills, extras, isOnboarded, periods, computedPeriods, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: String(e) });
    }
  },

  // ── Reset ──────────────────────────────────────────────────────────────────
  // Called on sign-out to clear all in-memory user data.

  reset() {
    set({ ...INITIAL_STATE, isLoading: false });
  },

  completeOnboarding() {
    const { userId } = get();
    if (userId) setSetting(`isOnboarded_${userId}`, 'true');
    set({ isOnboarded: true });
  },

  // ── Profile ────────────────────────────────────────────────────────────────

  saveProfileAction(data) {
    const { userId, profile, bills, extras } = get();
    const resolvedId = userId ?? profile?.id ?? generateId();

    const newProfile: UserProfile = {
      id: resolvedId,
      ...data,
      createdAt: profile?.createdAt ?? new Date().toISOString(),
    };

    saveProfile(newProfile);

    const { periods, computedPeriods } = recompute(newProfile, bills, extras);
    set({ profile: newProfile, periods, computedPeriods });
  },

  // ── Bills ──────────────────────────────────────────────────────────────────

  addBill(data) {
    const { userId, profile, bills, extras } = get();
    if (!profile) return;

    const bill: Bill = {
      id: generateId(),
      userId: userId ?? profile.id,
      sortOrder: bills.length,
      status: 'active',
      createdAt: new Date().toISOString(),
      ...data,
    };

    saveBill(bill);

    const newBills = [...bills, bill];
    const { periods, computedPeriods } = recompute(profile, newBills, extras);
    set({ bills: newBills, periods, computedPeriods });
  },

  updateBill(id, updates) {
    const { profile, bills, extras } = get();
    if (!profile) return;

    const newBills = bills.map((b) => (b.id === id ? { ...b, ...updates } : b));
    const updated = newBills.find((b) => b.id === id);
    if (updated) saveBill(updated);

    const { periods, computedPeriods } = recompute(profile, newBills, extras);
    set({ bills: newBills, periods, computedPeriods });
  },

  removeBill(id) {
    dbDeleteBill(id);
    const { profile, bills, extras } = get();
    const newBills = bills.filter((b) => b.id !== id);
    const { periods, computedPeriods } = recompute(profile, newBills, extras);
    set({ bills: newBills, periods, computedPeriods });
  },

  // ── Extras ─────────────────────────────────────────────────────────────────

  addExtra(data) {
    const { userId, profile, bills, extras } = get();
    if (!profile) return;

    const item: ExtraItem = {
      id: generateId(),
      userId: userId ?? profile.id,
      createdAt: new Date().toISOString(),
      ...data,
    };

    saveExtra(item);

    const newExtras = [...extras, item];
    const { periods, computedPeriods } = recompute(profile, bills, newExtras);
    set({ extras: newExtras, periods, computedPeriods });
  },

  updateExtra(id, updates) {
    const { profile, bills, extras } = get();
    if (!profile) return;

    const newExtras = extras.map((e) => (e.id === id ? { ...e, ...updates } : e));
    const updated = newExtras.find((e) => e.id === id);
    if (updated) saveExtra(updated);

    const { periods, computedPeriods } = recompute(profile, bills, newExtras);
    set({ extras: newExtras, periods, computedPeriods });
  },

  removeExtra(id) {
    dbDeleteExtra(id);
    const { profile, bills, extras } = get();
    const newExtras = extras.filter((e) => e.id !== id);
    const { periods, computedPeriods } = recompute(profile, bills, newExtras);
    set({ extras: newExtras, periods, computedPeriods });
  },
}));
