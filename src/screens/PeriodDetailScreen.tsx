/**
 * Period Detail Screen
 *
 * Full breakdown of a single pay period:
 *   - Summary metrics (pay date, income, bills, extras, net, balance)
 *   - Bills Due list (only bills assigned to this period)
 *   - Extras list with delete
 *   - Left/right navigation to adjacent periods
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList, CATEGORY_META, FREQUENCY_LABELS } from '../types';
import { formatCurrency, formatDate, formatDateLong } from '../utils/formatters';

type RouteProps = RouteProp<RootStackParamList, 'PeriodDetail'>;

// ─── Summary Row ──────────────────────────────────────────────────────────────

function SummaryItem({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

// ─── Edit Extra Modal ─────────────────────────────────────────────────────────

interface EditExtraModalProps {
  extraId: string;
  currentAmount: number;
  currentNote: string | null;
  visible: boolean;
  onClose: () => void;
}

function EditExtraModal({ extraId, currentAmount, currentNote, visible, onClose }: EditExtraModalProps) {
  const { updateExtra } = useAppStore();
  const isExpenseInitial = currentAmount >= 0;
  const [amount, setAmount] = useState(String(Math.abs(currentAmount)));
  const [note, setNote] = useState(currentNote ?? '');
  const [isExpense, setIsExpense] = useState(isExpenseInitial);

  const handleSave = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid positive amount.');
      return;
    }
    updateExtra(extraId, {
      amount: isExpense ? val : -val,
      note: note.trim() || null,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Edit Extra Item</Text>
          <View style={styles.typeToggle}>
            <TouchableOpacity style={[styles.toggleBtn, isExpense && styles.toggleActive]} onPress={() => setIsExpense(true)}>
              <Text style={[styles.toggleText, isExpense && styles.toggleTextActive]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, !isExpense && styles.toggleActive]} onPress={() => setIsExpense(false)}>
              <Text style={[styles.toggleText, !isExpense && styles.toggleTextActive]}>Credit</Text>
            </TouchableOpacity>
          </View>
          <TextInput style={styles.modalInput} value={amount} onChangeText={setAmount}
            keyboardType="decimal-pad" placeholderTextColor={Colors.textMuted} />
          <TextInput style={styles.modalInput} value={note} onChangeText={setNote}
            placeholder="Note (optional)" placeholderTextColor={Colors.textMuted} maxLength={100} />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function PeriodDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { computedPeriods, removeExtra } = useAppStore();

  const [periodIndex, setPeriodIndex] = useState(route.params.periodIndex);
  const [editingExtra, setEditingExtra] = useState<{ id: string; amount: number; note: string | null } | null>(null);

  const period = computedPeriods[periodIndex];

  const goToPrev = useCallback(() => {
    if (periodIndex > 0) setPeriodIndex((i) => i - 1);
  }, [periodIndex]);

  const goToNext = useCallback(() => {
    if (periodIndex < computedPeriods.length - 1) setPeriodIndex((i) => i + 1);
  }, [periodIndex, computedPeriods.length]);

  const handleDeleteExtra = useCallback((id: string) => {
    Alert.alert('Delete Extra', 'Remove this extra item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeExtra(id) },
    ]);
  }, [removeExtra]);

  if (!period) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Period not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Navigation header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={goToPrev} disabled={periodIndex === 0} style={styles.navBtn}>
          <Text style={[styles.navArrow, periodIndex === 0 && styles.navArrowDisabled]}>‹</Text>
        </TouchableOpacity>

        <View style={styles.navCenter}>
          <Text style={styles.navPeriodNum}>Period #{periodIndex + 1}</Text>
          <Text style={styles.navDate}>{formatDateLong(period.payDate)}</Text>
        </View>

        <TouchableOpacity onPress={goToNext} disabled={periodIndex === computedPeriods.length - 1} style={styles.navBtn}>
          <Text style={[styles.navArrow, periodIndex === computedPeriods.length - 1 && styles.navArrowDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryCard}>
            <SummaryItem label="Pay Date"       value={formatDate(period.payDate)} />
            <SummaryItem label="Income"         value={formatCurrency(period.income)}    valueColor={Colors.textIncome} />
            <SummaryItem label="Bills Total"    value={formatCurrency(period.billTotal)} valueColor={Colors.textExpense} />
            <SummaryItem label="Extras Total"   value={formatCurrency(period.extraTotal)} valueColor={Colors.textExtra} />
            <View style={styles.divider} />
            <SummaryItem
              label="Net"
              value={formatCurrency(period.net)}
              valueColor={period.net >= 0 ? Colors.textNet : Colors.textExpense}
            />
            <SummaryItem label="Running Balance" value={formatCurrency(period.runningBalance)} valueColor={Colors.textBalance} />
          </View>
        </View>

        {/* Bills Due */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Bills Due ({period.billDetails.length})
          </Text>
          {period.billDetails.length === 0 ? (
            <Text style={styles.emptyNote}>No bills due this period.</Text>
          ) : (
            period.billDetails.map(({ bill, amount }) => {
              const meta = CATEGORY_META[bill.category];
              return (
                <View key={bill.id} style={styles.billRow}>
                  <View style={[styles.catBar, { backgroundColor: meta.color }]} />
                  <View style={styles.billBody}>
                    <Text style={styles.billName}>{bill.name}</Text>
                    <Text style={styles.billSub}>{meta.label} · {FREQUENCY_LABELS[bill.frequency]}</Text>
                  </View>
                  <Text style={styles.billAmount}>{formatCurrency(amount)}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Extras */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Extras ({period.extraItems.length})
          </Text>
          {period.extraItems.length === 0 ? (
            <Text style={styles.emptyNote}>No extra items for this period.</Text>
          ) : (
            period.extraItems.map((e) => (
              <View key={e.id} style={styles.extraRow}>
                <View style={styles.extraBody}>
                  <Text style={styles.extraNote}>{e.note ?? '(no note)'}</Text>
                  <Text style={[styles.extraAmount, { color: e.amount >= 0 ? Colors.textExpense : Colors.textIncome }]}>
                    {e.amount >= 0 ? 'Expense' : 'Credit'}
                  </Text>
                </View>
                <Text style={[styles.extraValue, { color: e.amount >= 0 ? Colors.textExpense : Colors.textIncome }]}>
                  {formatCurrency(Math.abs(e.amount))}
                </Text>
                <View style={styles.extraActions}>
                  <TouchableOpacity onPress={() => setEditingExtra({ id: e.id, amount: e.amount, note: e.note })}>
                    <Text style={styles.editBtn}>✎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteExtra(e.id)}>
                    <Text style={styles.deleteBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Extra Modal */}
      {editingExtra && (
        <EditExtraModal
          extraId={editingExtra.id}
          currentAmount={editingExtra.amount}
          currentNote={editingExtra.note}
          visible={!!editingExtra}
          onClose={() => setEditingExtra(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  errorText: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 12,
  },
  navBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navArrow: {
    fontSize: 32,
    color: Colors.accent,
    fontWeight: '300',
  },
  navArrowDisabled: {
    color: Colors.textMuted,
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navPeriodNum: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  navDate: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 13,
    color: Colors.textLabel,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  summaryCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textLabel,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  emptyNote: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    padding: 4,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 8,
    marginBottom: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  billBody: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  billName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  billSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  billAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textExpense,
    paddingRight: 12,
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  extraBody: {
    flex: 1,
  },
  extraNote: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  extraAmount: {
    fontSize: 11,
    marginTop: 2,
  },
  extraValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  extraActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editBtn: {
    fontSize: 18,
    color: Colors.textLabel,
  },
  deleteBtn: {
    fontSize: 16,
    color: Colors.textExpense,
  },
  // Modal
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
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.bgInput,
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.accent,
  },
  toggleText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: Colors.bgPrimary,
  },
  modalInput: {
    backgroundColor: Colors.bgInput,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.accent,
  },
  saveText: {
    color: Colors.bgPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
