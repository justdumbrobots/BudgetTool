/**
 * Bills Manager Screen
 *
 * Lists all bills grouped by status (Active, Paused, Ended).
 * Users can add new bills, edit existing ones, pause, end, or delete.
 * An inline form slides in for add/edit operations.
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
  SectionList,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { BillItem } from '../components/BillItem';
import { PickerModal } from '../components/PickerModal';
import {
  Bill,
  BillCategory,
  BillFrequency,
  BillStatus,
  CATEGORY_META,
  FREQUENCY_LABELS,
  BILL_FREQUENCIES,
  ALL_CATEGORIES,
} from '../types';
import { formatCurrency, ordinal } from '../utils/formatters';

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

  // Reset when modal opens with a new editingBill
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Section = { title: string; data: Bill[] };

export function BillsManagerScreen() {
  const { bills, updateBill, removeBill } = useAppStore();
  const [formVisible, setFormVisible] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  const openAdd = () => {
    setEditingBill(null);
    setFormVisible(true);
  };

  const openEdit = (bill: Bill) => {
    setEditingBill(bill);
    setFormVisible(true);
  };

  const handlePause = useCallback((bill: Bill) => {
    const newStatus: BillStatus = bill.status === 'paused' ? 'active' : 'paused';
    updateBill(bill.id, { status: newStatus });
  }, [updateBill]);

  const handleEnd = useCallback((bill: Bill) => {
    Alert.alert('End Bill', `Mark "${bill.name}" as ended? It will no longer be calculated.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => updateBill(bill.id, { status: 'ended' }) },
    ]);
  }, [updateBill]);

  const handleDelete = useCallback((bill: Bill) => {
    Alert.alert('Delete Bill', `Permanently delete "${bill.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeBill(bill.id) },
    ]);
  }, [removeBill]);

  const sections: Section[] = [
    { title: `Active (${bills.filter(b => b.status === 'active').length})`,  data: bills.filter(b => b.status === 'active') },
    { title: `Paused (${bills.filter(b => b.status === 'paused').length})`,  data: bills.filter(b => b.status === 'paused') },
    { title: `Ended (${bills.filter(b => b.status === 'ended').length})`,    data: bills.filter(b => b.status === 'ended') },
  ].filter((s) => s.data.length > 0);

  // Total of active bills per period
  const totalActive = bills
    .filter((b) => b.status === 'active')
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Totals bar */}
      <View style={styles.totalsBar}>
        <Text style={styles.totalsLabel}>Active Bills</Text>
        <Text style={styles.totalsValue}>{formatCurrency(totalActive)}/period</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {bills.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No bills yet</Text>
          <Text style={styles.emptySubtitle}>Add your recurring bills to start tracking</Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd}>
            <Text style={styles.emptyAddBtnText}>+ Add Your First Bill</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <BillItem
              bill={item}
              onPress={() => openEdit(item)}
              onPause={() => handlePause(item)}
              onEnd={item.status !== 'ended' ? () => handleEnd(item) : undefined}
            />
          )}
          contentContainerStyle={{ paddingBottom: 32 }}
          stickySectionHeadersEnabled={false}
        />
      )}

      <BillFormModal
        visible={formVisible}
        editingBill={editingBill}
        onClose={() => setFormVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  totalsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  totalsLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    flex: 1,
  },
  totalsValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textExpense,
    marginRight: 12,
  },
  addBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: {
    color: Colors.bgPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    color: Colors.textLabel,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  emptyAddBtn: {
    marginTop: 8,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyAddBtnText: {
    color: Colors.bgPrimary,
    fontSize: 15,
    fontWeight: '700',
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  label: {
    fontSize: 13,
    color: Colors.textLabel,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
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
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pickerText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  arrow: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  formActions: {
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
