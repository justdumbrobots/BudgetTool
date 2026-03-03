/**
 * Bills Manager Screen
 *
 * Two sections in one scrollable view:
 *   1. Recurring Bills — grouped by status (Active, Paused, Ended)
 *   2. One-Time Transactions — single expenses or credits tied to a date
 *      that is automatically mapped to the correct pay period.
 *
 * Users can add/edit recurring bills and add/delete one-time transactions.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { BillItem } from '../components/BillItem';
import { PickerModal } from '../components/PickerModal';
import {
  Bill,
  ExtraItem,
  PayPeriod,
  BillCategory,
  BillFrequency,
  CATEGORY_META,
  FREQUENCY_LABELS,
  BILL_FREQUENCIES,
  ALL_CATEGORIES,
} from '../types';
import { formatCurrency, formatDate, parseLocalDate, toISODate } from '../utils/formatters';
import { getPeriodIndexForDate } from '../engine/periodGenerator';

// ─── Bill Form Modal ──────────────────────────────────────────────────────────

interface BillFormProps {
  visible: boolean;
  editingBill: Bill | null;
  onClose: () => void;
}

function BillFormModal({ visible, editingBill, onClose }: BillFormProps) {
  const { addBill, updateBill } = useAppStore();

  const [name, setName] = useState(editingBill?.name ?? '');
  const [amount, setAmount] = useState(editingBill ? String(editingBill.amount) : '');
  const [frequency, setFrequency] = useState<BillFrequency>(editingBill?.frequency ?? 'monthly');
  const [dueDay, setDueDay] = useState(editingBill?.dueDay != null ? String(editingBill.dueDay) : '1');
  const [category, setCategory] = useState<BillCategory>(editingBill?.category ?? 'other');

  const [showFreqPicker, setShowFreqPicker] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);

  React.useEffect(() => {
    setName(editingBill?.name ?? '');
    setAmount(editingBill ? String(editingBill.amount) : '');
    setFrequency(editingBill?.frequency ?? 'monthly');
    setDueDay(editingBill?.dueDay != null ? String(editingBill.dueDay) : '1');
    setCategory(editingBill?.category ?? 'other');
  }, [editingBill, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a bill name.');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid positive amount.');
      return;
    }
    const needsDueDay = frequency === 'monthly' || frequency === 'semi-monthly';
    const due = needsDueDay ? (parseInt(dueDay, 10) || 1) : null;

    if (editingBill) {
      updateBill(editingBill.id, { name: name.trim(), amount: amt, frequency, dueDay: due, category });
    } else {
      addBill({ name: name.trim(), amount: amt, frequency, dueDay: due, category });
    }
    onClose();
  };

  const freqOptions = BILL_FREQUENCIES.map((f) => ({ label: FREQUENCY_LABELS[f], value: f }));
  const catOptions = ALL_CATEGORIES.map((c) => ({ label: CATEGORY_META[c].label, value: c }));
  const needsDueDay = frequency === 'monthly' || frequency === 'semi-monthly';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingBill ? 'Edit Bill' : 'Add Bill'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Bill name"
              placeholderTextColor={Colors.textMuted}
              maxLength={40}
              autoFocus={!editingBill}
            />

            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Frequency</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowFreqPicker(true)}>
              <Text style={styles.pickerText}>{FREQUENCY_LABELS[frequency]}</Text>
              <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>

            {needsDueDay && (
              <>
                <Text style={styles.label}>Due Day (1–28)</Text>
                <TextInput
                  style={styles.input}
                  value={dueDay}
                  onChangeText={setDueDay}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="1"
                  placeholderTextColor={Colors.textMuted}
                />
              </>
            )}

            <Text style={styles.label}>Category</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowCatPicker(true)}>
              <View style={[styles.catDot, { backgroundColor: CATEGORY_META[category].color }]} />
              <Text style={styles.pickerText}>{CATEGORY_META[category].label}</Text>
              <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>{editingBill ? 'Update' : 'Add Bill'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          <PickerModal
            visible={showFreqPicker}
            title="Frequency"
            options={freqOptions}
            selected={frequency}
            onSelect={setFrequency}
            onClose={() => setShowFreqPicker(false)}
          />
          <PickerModal
            visible={showCatPicker}
            title="Category"
            options={catOptions}
            selected={category}
            onSelect={setCategory}
            onClose={() => setShowCatPicker(false)}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── One-Time Transaction Form Modal ─────────────────────────────────────────

interface OneTimeFormProps {
  visible: boolean;
  onClose: () => void;
}

function OneTimeFormModal({ visible, onClose }: OneTimeFormProps) {
  const { addExtra, periods } = useAppStore();

  const [note, setNote] = useState('');
  const [isExpense, setIsExpense] = useState(true);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<BillCategory>('other');
  const [showCatPicker, setShowCatPicker] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setNote('');
      setIsExpense(true);
      setAmount('');
      setDate(toISODate(new Date()));
      setCategory('other');
    }
  }, [visible]);

  const handleSave = () => {
    if (!note.trim()) {
      Alert.alert('Description required', 'Please enter a description for this transaction.');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid positive amount.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      Alert.alert('Invalid date', 'Please enter the date in YYYY-MM-DD format (e.g. 2026-03-15).');
      return;
    }
    const parsed = parseLocalDate(date.trim());
    if (isNaN(parsed.getTime())) {
      Alert.alert('Invalid date', 'Please enter a valid calendar date.');
      return;
    }
    const periodIndex = getPeriodIndexForDate(parsed, periods);
    if (periodIndex === -1) {
      Alert.alert(
        'Date out of range',
        'This date does not fall within any known pay period. Make sure your pay schedule is set up correctly.',
      );
      return;
    }

    addExtra({
      periodIndex,
      amount: isExpense ? amt : -amt,
      note: note.trim(),
      category,
    });
    onClose();
  };

  const catOptions = ALL_CATEGORIES.map((c) => ({ label: CATEGORY_META[c].label, value: c }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add One-Time Transaction</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Car repair, Tax refund"
              placeholderTextColor={Colors.textMuted}
              maxLength={60}
              autoFocus
            />

            <Text style={styles.label}>Type</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, isExpense && styles.toggleActiveExpense]}
                onPress={() => setIsExpense(true)}
              >
                <Text style={[styles.toggleText, isExpense && styles.toggleTextActive]}>
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, !isExpense && styles.toggleActiveIncome]}
                onPress={() => setIsExpense(false)}
              >
                <Text style={[styles.toggleText, !isExpense && styles.toggleTextActive]}>
                  Income / Credit
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="2026-03-15"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <Text style={styles.hint}>
              This transaction will be placed in the pay period that contains this date.
            </Text>

            <Text style={styles.label}>Category</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowCatPicker(true)}>
              <View style={[styles.catDot, { backgroundColor: CATEGORY_META[category].color }]} />
              <Text style={styles.pickerText}>{CATEGORY_META[category].label}</Text>
              <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>Add Transaction</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          <PickerModal
            visible={showCatPicker}
            title="Category"
            options={catOptions}
            selected={category}
            onSelect={setCategory}
            onClose={() => setShowCatPicker(false)}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── One-Time Transaction Row ─────────────────────────────────────────────────

interface ExtraItemRowProps {
  extra: ExtraItem;
  period: PayPeriod | undefined;
  onDelete: () => void;
}

function ExtraItemRow({ extra, period, onDelete }: ExtraItemRowProps) {
  const meta = CATEGORY_META[extra.category ?? 'other'];
  const isExpense = extra.amount >= 0;
  const periodLabel = period
    ? `${formatDate(period.payDate)} – ${formatDate(period.nextPayDate)}`
    : `Period #${extra.periodIndex + 1}`;

  const handleDelete = () => {
    Alert.alert('Delete Transaction', `Remove "${extra.note}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <View style={styles.extraRow}>
      <View style={[styles.colorBar, { backgroundColor: meta.color }]} />
      <View style={styles.extraBody}>
        <View style={styles.extraTopRow}>
          <Text style={styles.extraNote} numberOfLines={1}>{extra.note}</Text>
          <Text style={[styles.extraAmount, { color: isExpense ? Colors.textExpense : Colors.textIncome }]}>
            {isExpense ? '' : '+'}{formatCurrency(Math.abs(extra.amount))}
          </Text>
        </View>
        <Text style={styles.extraMeta}>{meta.label} · {periodLabel}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={handleDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.deleteBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function BillsManagerScreen() {
  const { bills, extras, periods, updateBill, removeExtra } = useAppStore();
  const [billFormVisible, setBillFormVisible] = useState(false);
  const [oneTimeVisible, setOneTimeVisible] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  const openAddBill = () => { setEditingBill(null); setBillFormVisible(true); };
  const openEditBill = (bill: Bill) => { setEditingBill(bill); setBillFormVisible(true); };

  const handlePause = useCallback((bill: Bill) => {
    updateBill(bill.id, { status: bill.status === 'paused' ? 'active' : 'paused' });
  }, [updateBill]);

  const handleEnd = useCallback((bill: Bill) => {
    Alert.alert('End Bill', `Mark "${bill.name}" as ended?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => updateBill(bill.id, { status: 'ended' }) },
    ]);
  }, [updateBill]);

  const totalActive = bills
    .filter((b) => b.status === 'active')
    .reduce((sum, b) => sum + b.amount, 0);

  const billGroups = [
    { title: `Active (${bills.filter(b => b.status === 'active').length})`, data: bills.filter(b => b.status === 'active') },
    { title: `Paused (${bills.filter(b => b.status === 'paused').length})`,  data: bills.filter(b => b.status === 'paused') },
    { title: `Ended (${bills.filter(b => b.status === 'ended').length})`,    data: bills.filter(b => b.status === 'ended') },
  ].filter((g) => g.data.length > 0);

  const sortedExtras = [...extras].sort((a, b) => a.periodIndex - b.periodIndex);
  const isEmpty = bills.length === 0 && extras.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Action bar */}
      <View style={styles.totalsBar}>
        <View style={styles.totalsLeft}>
          <Text style={styles.totalsLabel}>Active Bills</Text>
          <Text style={styles.totalsValue}>{formatCurrency(totalActive)}/period</Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, styles.oneTimeBtn]} onPress={() => setOneTimeVisible(true)}>
          <Text style={[styles.addBtnText, { color: Colors.accent }]}>+ One-Time</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={openAddBill}>
          <Text style={styles.addBtnText}>+ Bill</Text>
        </TouchableOpacity>
      </View>

      {isEmpty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptySubtitle}>
            Add recurring bills or use "+ One-Time" for a single expense or credit
          </Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddBill}>
            <Text style={styles.emptyAddBtnText}>+ Add Your First Bill</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Recurring Bills */}
          {bills.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No recurring bills yet</Text>
            </View>
          ) : (
            billGroups.map((group) => (
              <View key={group.title}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{group.title}</Text>
                </View>
                {group.data.map((bill) => (
                  <BillItem
                    key={bill.id}
                    bill={bill}
                    onPress={() => openEditBill(bill)}
                    onPause={() => handlePause(bill)}
                    onEnd={bill.status !== 'ended' ? () => handleEnd(bill) : undefined}
                  />
                ))}
              </View>
            ))
          )}

          {/* One-Time Transactions */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              One-Time Transactions ({extras.length})
            </Text>
          </View>
          {sortedExtras.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>
                No one-time transactions — tap "+ One-Time" to add one
              </Text>
            </View>
          ) : (
            sortedExtras.map((extra) => (
              <ExtraItemRow
                key={extra.id}
                extra={extra}
                period={periods[extra.periodIndex]}
                onDelete={() => removeExtra(extra.id)}
              />
            ))
          )}
        </ScrollView>
      )}

      <BillFormModal
        visible={billFormVisible}
        editingBill={editingBill}
        onClose={() => setBillFormVisible(false)}
      />
      <OneTimeFormModal
        visible={oneTimeVisible}
        onClose={() => setOneTimeVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  // Action bar
  totalsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  totalsLeft: { flex: 1 },
  totalsLabel: { fontSize: 11, color: Colors.textMuted },
  totalsValue: { fontSize: 15, fontWeight: '700', color: Colors.textExpense },
  addBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  oneTimeBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  addBtnText: { color: Colors.bgPrimary, fontSize: 13, fontWeight: '700' },
  // Section headers
  sectionHeader: { paddingHorizontal: 12, paddingTop: 20, paddingBottom: 6 },
  sectionTitle: {
    fontSize: 12,
    color: Colors.textLabel,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  // Full empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  emptyAddBtn: {
    marginTop: 8,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyAddBtnText: { color: Colors.bgPrimary, fontSize: 15, fontWeight: '700' },
  // Section empty hint
  emptySection: { paddingHorizontal: 16, paddingVertical: 12 },
  emptySectionText: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  // Extra item row (mirrors BillItem layout)
  extraRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: 8,
    marginHorizontal: 12,
    marginVertical: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  colorBar: { width: 4, alignSelf: 'stretch' },
  extraBody: { flex: 1, paddingVertical: 10, paddingHorizontal: 12 },
  extraTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  extraNote: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  extraAmount: { fontSize: 15, fontWeight: '700' },
  extraMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  deleteBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  deleteBtnText: { fontSize: 14, color: Colors.textMuted },
  // Modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  closeBtn: { fontSize: 18, color: Colors.textMuted },
  label: {
    fontSize: 13,
    color: Colors.textLabel,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  hint: { fontSize: 11, color: Colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    gap: 8,
  },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  pickerText: { flex: 1, color: Colors.textPrimary, fontSize: 16 },
  arrow: { color: Colors.textMuted, fontSize: 12 },
  // Expense / Income toggle
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleActiveExpense: { backgroundColor: Colors.textExpense, borderColor: Colors.textExpense },
  toggleActiveIncome: { backgroundColor: Colors.textIncome, borderColor: Colors.textIncome },
  toggleText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  toggleTextActive: { color: '#fff' },
  // Form actions
  formActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: { color: Colors.textMuted, fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.accent,
  },
  saveText: { color: Colors.bgPrimary, fontSize: 15, fontWeight: '700' },
});
