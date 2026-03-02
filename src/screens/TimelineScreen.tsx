/**
 * Timeline Screen — main budget tracker view.
 *
 * Scrollable list of all pay periods. Each row shows pay date, bills, extras,
 * income, net cash flow, and running balance. Auto-scrolls to current period
 * on mount. Tapping a row opens Period Detail.
 */
import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { PeriodRow } from '../components/PeriodRow';
import { ComputedPeriod, RootStackParamList } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getCurrentPeriodIndex } from '../engine/periodGenerator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Add Extra Modal ──────────────────────────────────────────────────────────

interface AddExtraModalProps {
  periodIndex: number;
  visible: boolean;
  onClose: () => void;
}

function AddExtraModal({ periodIndex, visible, onClose }: AddExtraModalProps) {
  const { addExtra, computedPeriods } = useAppStore();
  const period = computedPeriods[periodIndex];

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isExpense, setIsExpense] = useState(true);

  const handleSave = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid positive amount.');
      return;
    }
    addExtra({
      periodIndex,
      amount: isExpense ? val : -val,
      note: note.trim() || null,
      category: null,
    });
    setAmount('');
    setNote('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>
            Add Extra · {period ? formatDate(period.payDate) : ''}
          </Text>

          {/* Expense / Credit toggle */}
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, isExpense && styles.toggleBtnActive]}
              onPress={() => setIsExpense(true)}
            >
              <Text style={[styles.toggleText, isExpense && styles.toggleTextActive]}>
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !isExpense && styles.toggleBtnActive]}
              onPress={() => setIsExpense(false)}
            >
              <Text style={[styles.toggleText, !isExpense && styles.toggleTextActive]}>
                Credit/Income
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Amount</Text>
          <TextInput
            style={styles.modalInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
            autoFocus
          />

          <Text style={styles.modalLabel}>Note (optional)</Text>
          <TextInput
            style={styles.modalInput}
            value={note}
            onChangeText={setNote}
            placeholder="Grocery run, car repair, etc."
            placeholderTextColor={Colors.textMuted}
            maxLength={100}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Column Header ────────────────────────────────────────────────────────────

function ListHeader() {
  return (
    <View style={styles.listHeader}>
      <Text style={[styles.colHeader, { flex: 1.4 }]}>Date</Text>
      <Text style={[styles.colHeader, { flex: 1.2, textAlign: 'center' }]}>Bills</Text>
      <Text style={[styles.colHeader, { flex: 1.4, textAlign: 'right' }]}>Net / Balance</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function TimelineScreen() {
  const navigation = useNavigation<Nav>();
  const { computedPeriods, periods } = useAppStore();

  const listRef = useRef<FlatList<ComputedPeriod>>(null);
  const [extraModal, setExtraModal] = useState<{ visible: boolean; periodIndex: number }>({
    visible: false,
    periodIndex: 0,
  });

  const currentIndex = periods.length ? getCurrentPeriodIndex(periods) : 0;

  // Auto-scroll to current period on mount
  useEffect(() => {
    if (computedPeriods.length > 0 && currentIndex > 0) {
      const timer = setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: Math.max(0, currentIndex - 1),
          animated: false,
          viewPosition: 0,
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [computedPeriods.length, currentIndex]);

  const handleRowPress = useCallback(
    (periodIndex: number) => {
      navigation.navigate('PeriodDetail', { periodIndex });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ComputedPeriod; index: number }) => (
      <PeriodRow
        period={item}
        isEven={index % 2 === 0}
        isCurrent={index === currentIndex}
        onPress={() => handleRowPress(item.index)}
      />
    ),
    [currentIndex, handleRowPress],
  );

  const keyExtractor = useCallback((item: ComputedPeriod) => String(item.index), []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index + HEADER_HEIGHT,
      index,
    }),
    [],
  );

  const onScrollToIndexFailed = useCallback(() => {
    // Fallback: scroll to beginning
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  if (!computedPeriods.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Complete onboarding to see your timeline.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={listRef}
        data={computedPeriods}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={<ListHeader />}
        stickyHeaderIndices={[0]}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={onScrollToIndexFailed}
        maxToRenderPerBatch={30}
        windowSize={15}
        initialNumToRender={20}
        removeClippedSubviews={true}
      />

      {/* FAB: Add extra to current period */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setExtraModal({ visible: true, periodIndex: currentIndex })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddExtraModal
        periodIndex={extraModal.periodIndex}
        visible={extraModal.visible}
        onClose={() => setExtraModal((s) => ({ ...s, visible: false }))}
      />
    </SafeAreaView>
  );
}

const ROW_HEIGHT = 62;
const HEADER_HEIGHT = 40;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
  listHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accent,
  },
  colHeader: {
    fontSize: 11,
    color: Colors.textLabel,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    color: Colors.bgPrimary,
    fontWeight: '300',
    lineHeight: 32,
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
  toggleBtnActive: {
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
  modalLabel: {
    fontSize: 13,
    color: Colors.textLabel,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
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
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
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
  cancelBtnText: {
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
  saveBtnText: {
    color: Colors.bgPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
