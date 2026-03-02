/**
 * Onboarding flow — 4-step wizard to configure the user's budget.
 *
 * Step 1: Pay Schedule (frequency + anchor date)
 * Step 2: Income (take-home pay + side income)
 * Step 3: Bills (add recurring bills with quick-add carousel)
 * Step 4: Review (first 4 periods preview)
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import {
  PayFrequency,
  BillFrequency,
  BillCategory,
  CATEGORY_META,
  FREQUENCY_LABELS,
  PAY_FREQUENCIES,
  BILL_FREQUENCIES,
} from '../types';
import { formatCurrency, formatDate, toISODate } from '../utils/formatters';
import { PickerModal } from '../components/PickerModal';
import { generatePayPeriods } from '../engine/periodGenerator';
import { computeAllPeriods } from '../engine/billEngine';

// ─── Quick-add bill templates ─────────────────────────────────────────────────

interface BillTemplate {
  name: string;
  amount: string;
  frequency: BillFrequency;
  dueDay: number | null;
  category: BillCategory;
}

const QUICK_BILLS: BillTemplate[] = [
  { name: 'Rent',          amount: '1500', frequency: 'monthly',   dueDay: 1,  category: 'housing' },
  { name: 'Electric',      amount: '120',  frequency: 'monthly',   dueDay: 15, category: 'utilities' },
  { name: 'Internet',      amount: '60',   frequency: 'monthly',   dueDay: 10, category: 'utilities' },
  { name: 'Phone',         amount: '80',   frequency: 'monthly',   dueDay: 20, category: 'utilities' },
  { name: 'Car Payment',   amount: '400',  frequency: 'monthly',   dueDay: 1,  category: 'auto' },
  { name: 'Car Insurance', amount: '150',  frequency: 'monthly',   dueDay: 1,  category: 'auto' },
  { name: 'Health Ins.',   amount: '300',  frequency: 'monthly',   dueDay: 1,  category: 'insurance' },
  { name: 'Netflix',       amount: '18',   frequency: 'monthly',   dueDay: 15, category: 'subscriptions' },
  { name: 'Gym',           amount: '40',   frequency: 'monthly',   dueDay: 1,  category: 'health' },
  { name: 'Gas',           amount: '80',   frequency: 'bi-weekly', dueDay: null, category: 'auto' },
];

// ─── Step 1: Pay Schedule ─────────────────────────────────────────────────────

interface Step1Props {
  frequency: PayFrequency;
  anchorDate: string;
  onFrequencyChange: (f: PayFrequency) => void;
  onAnchorDateChange: (d: string) => void;
}

function Step1({ frequency, anchorDate, onFrequencyChange, onAnchorDateChange }: Step1Props) {
  const [showFreqPicker, setShowFreqPicker] = useState(false);

  const freqOptions = PAY_FREQUENCIES.map((f) => ({ label: FREQUENCY_LABELS[f], value: f }));

  return (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Pay Schedule</Text>
      <Text style={styles.stepSubtitle}>
        How often do you get paid and when is your next paycheck?
      </Text>

      <Text style={styles.fieldLabel}>Pay Frequency</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowFreqPicker(true)}>
        <Text style={styles.pickerBtnText}>{FREQUENCY_LABELS[frequency]}</Text>
        <Text style={styles.pickerArrow}>▼</Text>
      </TouchableOpacity>

      <Text style={styles.fieldLabel}>Next Pay Date</Text>
      <Text style={styles.fieldHint}>Enter as YYYY-MM-DD (e.g. 2026-03-06)</Text>
      <TextInput
        style={styles.input}
        value={anchorDate}
        onChangeText={onAnchorDateChange}
        placeholder="2026-03-06"
        placeholderTextColor={Colors.textMuted}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />

      <PickerModal
        visible={showFreqPicker}
        title="Pay Frequency"
        options={freqOptions}
        selected={frequency}
        onSelect={onFrequencyChange}
        onClose={() => setShowFreqPicker(false)}
      />
    </ScrollView>
  );
}

// ─── Step 2: Income ───────────────────────────────────────────────────────────

interface Step2Props {
  income: string;
  sideIncome: string;
  startingBalance: string;
  onIncomeChange: (v: string) => void;
  onSideIncomeChange: (v: string) => void;
  onStartingBalanceChange: (v: string) => void;
}

function Step2({ income, sideIncome, startingBalance, onIncomeChange, onSideIncomeChange, onStartingBalanceChange }: Step2Props) {
  return (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Your Income</Text>
      <Text style={styles.stepSubtitle}>
        Enter your net take-home pay per paycheck (after taxes and deductions).
      </Text>

      <Text style={styles.fieldLabel}>Take-Home Pay Per Paycheck</Text>
      <TextInput
        style={styles.input}
        value={income}
        onChangeText={onIncomeChange}
        placeholder="2500.00"
        placeholderTextColor={Colors.textMuted}
        keyboardType="decimal-pad"
      />

      <Text style={styles.fieldLabel}>Side Income Per Period (optional)</Text>
      <TextInput
        style={styles.input}
        value={sideIncome}
        onChangeText={onSideIncomeChange}
        placeholder="0.00"
        placeholderTextColor={Colors.textMuted}
        keyboardType="decimal-pad"
      />

      <Text style={styles.fieldLabel}>Current Account Balance (starting point)</Text>
      <TextInput
        style={styles.input}
        value={startingBalance}
        onChangeText={onStartingBalanceChange}
        placeholder="0.00"
        placeholderTextColor={Colors.textMuted}
        keyboardType="decimal-pad"
      />
    </ScrollView>
  );
}

// ─── Step 3: Bills ────────────────────────────────────────────────────────────

interface BillDraft {
  name: string;
  amount: string;
  frequency: BillFrequency;
  dueDay: string;
  category: BillCategory;
}

const emptyBill = (): BillDraft => ({
  name: '',
  amount: '',
  frequency: 'monthly',
  dueDay: '1',
  category: 'other',
});

interface Step3Props {
  bills: BillDraft[];
  onBillsChange: (bills: BillDraft[]) => void;
}

function Step3({ bills, onBillsChange }: Step3Props) {
  const [draft, setDraft] = useState<BillDraft>(emptyBill());
  const [showFreqPicker, setShowFreqPicker] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const freqOptions = BILL_FREQUENCIES.map((f) => ({ label: FREQUENCY_LABELS[f], value: f }));
  const catOptions = Object.entries(CATEGORY_META).map(([k, v]) => ({
    label: v.label,
    value: k as BillCategory,
  }));

  const applyTemplate = (t: BillTemplate) => {
    setDraft({
      name: t.name,
      amount: t.amount,
      frequency: t.frequency,
      dueDay: t.dueDay != null ? String(t.dueDay) : '1',
      category: t.category,
    });
  };

  const commitBill = () => {
    if (!draft.name.trim()) {
      Alert.alert('Name required', 'Please enter a bill name.');
      return;
    }
    const amount = parseFloat(draft.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid positive amount.');
      return;
    }
    const dueDay =
      draft.frequency === 'monthly' || draft.frequency === 'semi-monthly'
        ? parseInt(draft.dueDay, 10) || 1
        : null;

    const newBill: BillDraft = { ...draft, dueDay: dueDay != null ? String(dueDay) : '' };
    if (editIndex !== null) {
      const updated = [...bills];
      updated[editIndex] = newBill;
      onBillsChange(updated);
      setEditIndex(null);
    } else {
      onBillsChange([...bills, newBill]);
    }
    setDraft(emptyBill());
  };

  const removeBill = (idx: number) => {
    onBillsChange(bills.filter((_, i) => i !== idx));
  };

  const needsDueDay = draft.frequency === 'monthly' || draft.frequency === 'semi-monthly';

  return (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Your Bills</Text>
      <Text style={styles.stepSubtitle}>
        Add your recurring bills. You can always add more later.
      </Text>

      {/* Quick-add carousel */}
      <Text style={styles.fieldLabel}>Quick Add</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
        {QUICK_BILLS.map((t) => (
          <TouchableOpacity key={t.name} style={styles.chip} onPress={() => applyTemplate(t)}>
            <Text style={styles.chipText}>{t.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bill form */}
      <View style={styles.billForm}>
        <TextInput
          style={styles.input}
          value={draft.name}
          onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
          placeholder="Bill name"
          placeholderTextColor={Colors.textMuted}
          maxLength={40}
        />

        <TextInput
          style={styles.input}
          value={draft.amount}
          onChangeText={(v) => setDraft((d) => ({ ...d, amount: v }))}
          placeholder="Amount (e.g. 1200.00)"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
        />

        <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowFreqPicker(true)}>
          <Text style={styles.fieldLabelInline}>Frequency:</Text>
          <Text style={styles.pickerBtnText}>{FREQUENCY_LABELS[draft.frequency]}</Text>
          <Text style={styles.pickerArrow}>▼</Text>
        </TouchableOpacity>

        {needsDueDay && (
          <View style={styles.row}>
            <Text style={styles.fieldLabelInline}>Due on the</Text>
            <TextInput
              style={[styles.input, styles.dueDayInput]}
              value={draft.dueDay}
              onChangeText={(v) => setDraft((d) => ({ ...d, dueDay: v }))}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.fieldLabelInline}>of each month</Text>
          </View>
        )}

        <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowCatPicker(true)}>
          <Text style={styles.fieldLabelInline}>Category:</Text>
          <Text style={styles.pickerBtnText}>{CATEGORY_META[draft.category].label}</Text>
          <Text style={styles.pickerArrow}>▼</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addBillBtn} onPress={commitBill}>
          <Text style={styles.addBillBtnText}>
            {editIndex !== null ? '✓ Update Bill' : '+ Add Bill'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Added bills list */}
      {bills.length > 0 && (
        <View style={styles.addedBills}>
          <Text style={styles.sectionTitle}>Added Bills ({bills.length})</Text>
          {bills.map((b, i) => (
            <View key={i} style={styles.addedBillRow}>
              <View style={[styles.catDot, { backgroundColor: CATEGORY_META[b.category].color }]} />
              <Text style={styles.addedBillName} numberOfLines={1}>{b.name}</Text>
              <Text style={styles.addedBillAmount}>{formatCurrency(parseFloat(b.amount) || 0)}</Text>
              <TouchableOpacity onPress={() => removeBill(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.removeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <PickerModal
        visible={showFreqPicker}
        title="Bill Frequency"
        options={freqOptions}
        selected={draft.frequency}
        onSelect={(v) => setDraft((d) => ({ ...d, frequency: v }))}
        onClose={() => setShowFreqPicker(false)}
      />
      <PickerModal
        visible={showCatPicker}
        title="Category"
        options={catOptions}
        selected={draft.category}
        onSelect={(v) => setDraft((d) => ({ ...d, category: v }))}
        onClose={() => setShowCatPicker(false)}
      />
    </ScrollView>
  );
}

// ─── Step 4: Review ───────────────────────────────────────────────────────────

interface Step4Props {
  frequency: PayFrequency;
  anchorDate: string;
  income: number;
  billDrafts: BillDraft[];
}

function Step4({ frequency, anchorDate, income, billDrafts }: Step4Props) {
  const periods = generatePayPeriods(anchorDate, frequency).slice(0, 4);

  const bills = billDrafts.map((d, i) => ({
    id: String(i),
    userId: 'preview',
    name: d.name,
    amount: parseFloat(d.amount) || 0,
    dueDay: d.dueDay ? parseInt(d.dueDay, 10) : null,
    frequency: d.frequency,
    category: d.category,
    status: 'active' as const,
    sortOrder: i,
    createdAt: '',
  }));

  const computed = computeAllPeriods(periods, bills, [], income, 0);

  return (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Preview</Text>
      <Text style={styles.stepSubtitle}>
        Here are your first 4 pay periods. Everything look right?
      </Text>

      {computed.map((p) => (
        <View key={p.index} style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewDate}>
              {formatDate(p.payDate)} — {formatDate(p.nextPayDate)}
            </Text>
          </View>
          <View style={styles.previewBody}>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Income</Text>
              <Text style={[styles.previewValue, { color: Colors.textIncome }]}>
                {formatCurrency(p.income)}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Bills</Text>
              <Text style={[styles.previewValue, { color: Colors.textExpense }]}>
                {formatCurrency(p.billTotal)}
              </Text>
            </View>
            {p.billDetails.map((bd) => (
              <View key={bd.bill.id} style={styles.previewBillRow}>
                <Text style={styles.previewBillName}>  · {bd.bill.name}</Text>
                <Text style={styles.previewBillAmount}>{formatCurrency(bd.amount)}</Text>
              </View>
            ))}
            <View style={[styles.previewRow, styles.previewDivider]}>
              <Text style={styles.previewLabel}>Net</Text>
              <Text style={[styles.previewValue, { color: p.net >= 0 ? Colors.textNet : Colors.textExpense }]}>
                {formatCurrency(p.net)}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Balance</Text>
              <Text style={[styles.previewValue, { color: Colors.textBalance }]}>
                {formatCurrency(p.runningBalance)}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Main Onboarding Screen ───────────────────────────────────────────────────

export function OnboardingScreen() {
  const { saveProfileAction, addBill, completeOnboarding } = useAppStore();

  const [step, setStep] = useState(0);

  // Step 1 state
  const [frequency, setFrequency] = useState<PayFrequency>('bi-weekly');
  const [anchorDate, setAnchorDate] = useState(toISODate(new Date()));

  // Step 2 state
  const [income, setIncome] = useState('');
  const [sideIncome, setSideIncome] = useState('');
  const [startingBalance, setStartingBalance] = useState('');

  // Step 3 state
  const [billDrafts, setBillDrafts] = useState<BillDraft[]>([]);

  const validateStep = useCallback((): boolean => {
    if (step === 0) {
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(anchorDate)) {
        Alert.alert('Invalid date', 'Please enter date as YYYY-MM-DD');
        return false;
      }
      const d = new Date(anchorDate + 'T12:00:00');
      if (isNaN(d.getTime())) {
        Alert.alert('Invalid date', 'That date doesn\'t seem valid.');
        return false;
      }
    }
    if (step === 1) {
      const amt = parseFloat(income);
      if (isNaN(amt) || amt <= 0) {
        Alert.alert('Income required', 'Please enter your take-home pay per paycheck.');
        return false;
      }
    }
    return true;
  }, [step, anchorDate, income]);

  const handleNext = useCallback(() => {
    if (!validateStep()) return;
    if (step < 3) {
      setStep((s) => s + 1);
    } else {
      // Save everything
      saveProfileAction({
        payFrequency: frequency,
        anchorPayDate: anchorDate,
        incomePerPeriod: parseFloat(income) || 0,
        sideIncome: parseFloat(sideIncome) || 0,
        startingBalance: parseFloat(startingBalance) || 0,
      });

      for (const draft of billDrafts) {
        const amount = parseFloat(draft.amount) || 0;
        if (amount > 0 && draft.name.trim()) {
          addBill({
            name: draft.name.trim(),
            amount,
            dueDay: draft.dueDay ? parseInt(draft.dueDay, 10) : null,
            frequency: draft.frequency,
            category: draft.category,
          });
        }
      }

      completeOnboarding();
    }
  }, [step, validateStep, saveProfileAction, frequency, anchorDate, income, sideIncome, startingBalance, billDrafts, addBill, completeOnboarding]);

  const STEP_TITLES = ['Pay Schedule', 'Income', 'Bills', 'Review'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          {STEP_TITLES.map((_, i) => (
            <View
              key={i}
              style={[styles.progressDot, i <= step && styles.progressDotActive]}
            />
          ))}
        </View>
        <Text style={styles.stepIndicator}>Step {step + 1} of {STEP_TITLES.length}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {step === 0 && (
          <Step1
            frequency={frequency}
            anchorDate={anchorDate}
            onFrequencyChange={setFrequency}
            onAnchorDateChange={setAnchorDate}
          />
        )}
        {step === 1 && (
          <Step2
            income={income}
            sideIncome={sideIncome}
            startingBalance={startingBalance}
            onIncomeChange={setIncome}
            onSideIncomeChange={setSideIncome}
            onStartingBalanceChange={setStartingBalance}
          />
        )}
        {step === 2 && (
          <Step3 bills={billDrafts} onBillsChange={setBillDrafts} />
        )}
        {step === 3 && (
          <Step4
            frequency={frequency}
            anchorDate={anchorDate}
            income={(parseFloat(income) || 0) + (parseFloat(sideIncome) || 0)}
            billDrafts={billDrafts}
          />
        )}
      </KeyboardAvoidingView>

      {/* Navigation buttons */}
      <View style={styles.navRow}>
        {step > 0 ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep((s) => s - 1)}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}

        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {step === 3 ? "Let's Go! →" : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  progressDot: {
    width: 32,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.bgCard,
  },
  progressDotActive: {
    backgroundColor: Colors.accent,
  },
  stepIndicator: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 20,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 13,
    color: Colors.textLabel,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 14,
  },
  fieldLabelInline: {
    fontSize: 13,
    color: Colors.textLabel,
    fontWeight: '600',
    marginRight: 8,
  },
  fieldHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  pickerBtnText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  pickerArrow: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  carousel: {
    marginBottom: 16,
  },
  chip: {
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  chipText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  billForm: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDayInput: {
    width: 50,
    textAlign: 'center',
    marginHorizontal: 8,
    marginBottom: 0,
  },
  addBillBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  addBillBtnText: {
    color: Colors.bgPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  addedBills: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    color: Colors.textLabel,
    fontWeight: '600',
    marginBottom: 8,
  },
  addedBillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 8,
    padding: 10,
    marginBottom: 4,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  addedBillName: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  addedBillAmount: {
    fontSize: 14,
    color: Colors.textExpense,
    fontWeight: '600',
    marginRight: 8,
  },
  removeBtn: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  previewCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewHeader: {
    backgroundColor: Colors.bgRow1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  previewDate: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
  },
  previewBody: {
    padding: 14,
    gap: 4,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 6,
    marginTop: 4,
  },
  previewLabel: {
    fontSize: 13,
    color: Colors.textLabel,
  },
  previewValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewBillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewBillName: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  previewBillAmount: {
    fontSize: 12,
    color: Colors.textExpense,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtnText: {
    color: Colors.textLabel,
    fontSize: 16,
    fontWeight: '600',
  },
  nextBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  nextBtnText: {
    color: Colors.bgPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
