// ─── Pay Schedule ───────────────────────────────────────────────────────────

export type PayFrequency = 'bi-weekly' | 'weekly' | 'semi-monthly' | 'monthly';

// ─── Bill Types ──────────────────────────────────────────────────────────────

export type BillFrequency = 'monthly' | 'bi-weekly' | 'weekly' | 'semi-monthly';

export type BillStatus = 'active' | 'paused' | 'ended';

export type BillCategory =
  | 'housing'
  | 'utilities'
  | 'auto'
  | 'insurance'
  | 'subscriptions'
  | 'health'
  | 'taxes'
  | 'discretionary'
  | 'debt'
  | 'family'
  | 'other';

// ─── Entity Interfaces ───────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  payFrequency: PayFrequency;
  anchorPayDate: string; // ISO date string: YYYY-MM-DD
  incomePerPeriod: number;
  sideIncome: number;
  startingBalance: number;
  createdAt: string;
}

export interface Bill {
  id: string;
  userId: string;
  name: string;
  amount: number;
  dueDay: number | null; // 1–28 for monthly; null for bi-weekly/weekly
  frequency: BillFrequency;
  category: BillCategory;
  status: BillStatus;
  sortOrder: number;
  createdAt: string;
}

export interface ExtraItem {
  id: string;
  userId: string;
  periodIndex: number; // 0-based index into generated periods
  amount: number; // positive = expense, negative = income/credit
  note: string | null;
  category: BillCategory | null;
  createdAt: string;
}

// ─── Computed/Derived Types ──────────────────────────────────────────────────

export interface PayPeriod {
  index: number;
  payDate: Date;
  nextPayDate: Date;
}

export interface BillPeriodResult {
  bill: Bill;
  amount: number;
}

export interface ComputedPeriod {
  index: number;
  payDate: Date;
  nextPayDate: Date;
  billDetails: BillPeriodResult[];
  billTotal: number;
  extraItems: ExtraItem[];
  extraTotal: number;
  income: number;
  net: number;
  runningBalance: number;
}

// ─── Category Metadata ───────────────────────────────────────────────────────

export interface CategoryMeta {
  label: string;
  color: string;
}

export const CATEGORY_META: Record<BillCategory, CategoryMeta> = {
  housing:       { label: 'Housing',        color: '#4FC3F7' },
  utilities:     { label: 'Utilities',      color: '#66BB6A' },
  auto:          { label: 'Auto/Transport', color: '#FFA726' },
  insurance:     { label: 'Insurance',      color: '#AB47BC' },
  subscriptions: { label: 'Subscriptions',  color: '#EF5350' },
  health:        { label: 'Health/Fitness', color: '#26A69A' },
  taxes:         { label: 'Taxes',          color: '#78909C' },
  discretionary: { label: 'Discretionary',  color: '#FFD54F' },
  debt:          { label: 'Debt Payments',  color: '#E57373' },
  family:        { label: 'Family/Personal',color: '#7986CB' },
  other:         { label: 'Other',          color: '#90A4AE' },
};

export const ALL_CATEGORIES: BillCategory[] = Object.keys(CATEGORY_META) as BillCategory[];

export const BILL_FREQUENCIES: BillFrequency[] = ['monthly', 'bi-weekly', 'weekly', 'semi-monthly'];

export const PAY_FREQUENCIES: PayFrequency[] = ['bi-weekly', 'weekly', 'semi-monthly', 'monthly'];

export const FREQUENCY_LABELS: Record<BillFrequency | PayFrequency, string> = {
  'bi-weekly':    'Bi-Weekly',
  'weekly':       'Weekly',
  'semi-monthly': 'Semi-Monthly',
  'monthly':      'Monthly',
};

// ─── Navigation Types ────────────────────────────────────────────────────────

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  PeriodDetail: { periodIndex: number };
  AddBill: { billId?: string };
  AddExtra: { periodIndex: number };
};
