import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Bill } from '../types';
import { Colors } from '../theme/colors';
import { CATEGORY_META, FREQUENCY_LABELS } from '../types';
import { formatCurrency, ordinal } from '../utils/formatters';

interface BillItemProps {
  bill: Bill;
  onPress?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
}

export function BillItem({ bill, onPress, onPause, onEnd }: BillItemProps) {
  const meta = CATEGORY_META[bill.category];
  const statusColor =
    bill.status === 'active' ? Colors.textIncome :
    bill.status === 'paused' ? Colors.textExtra : Colors.textMuted;

  const dueLabel =
    bill.frequency === 'monthly' && bill.dueDay != null
      ? `Due ${ordinal(bill.dueDay)}`
      : FREQUENCY_LABELS[bill.frequency];

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      {/* Category color bar */}
      <View style={[styles.colorBar, { backgroundColor: meta.color }]} />

      {/* Content */}
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{bill.name}</Text>
          <Text style={styles.amount}>{formatCurrency(bill.amount)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.sub}>{meta.label} · {dueLabel}</Text>
          <Text style={[styles.status, { color: statusColor }]}>
            {bill.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Actions */}
      {(onPause || onEnd) && (
        <View style={styles.actions}>
          {onPause && bill.status !== 'ended' && (
            <TouchableOpacity style={styles.actionBtn} onPress={onPause}>
              <Text style={styles.actionText}>
                {bill.status === 'paused' ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>
          )}
          {onEnd && bill.status !== 'ended' && (
            <TouchableOpacity style={[styles.actionBtn, styles.endBtn]} onPress={onEnd}>
              <Text style={[styles.actionText, { color: Colors.textExpense }]}>End</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: 8,
    marginHorizontal: 12,
    marginVertical: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  colorBar: {
    width: 4,
  },
  body: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textExpense,
  },
  sub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
  },
  status: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  actions: {
    flexDirection: 'column',
    justifyContent: 'center',
    paddingRight: 10,
    gap: 4,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  endBtn: {
    borderColor: Colors.danger,
  },
  actionText: {
    fontSize: 11,
    color: Colors.textLabel,
    fontWeight: '600',
  },
});
