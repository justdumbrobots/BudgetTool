import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ComputedPeriod } from '../types';
import { Colors } from '../theme/colors';
import { formatDate, formatCurrency } from '../utils/formatters';

interface PeriodRowProps {
  period: ComputedPeriod;
  isEven: boolean;
  isCurrent: boolean;
  onPress: () => void;
}

export function PeriodRow({ period, isEven, isCurrent, onPress }: PeriodRowProps) {
  const bgColor = isCurrent
    ? Colors.bgHighlight
    : isEven
    ? Colors.bgRow1
    : Colors.bgRow2;

  const netColor = period.net >= 0 ? Colors.textNet : Colors.textExpense;

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: bgColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Left: Period index + Pay date */}
      <View style={styles.left}>
        <Text style={styles.periodNum}>#{period.index + 1}</Text>
        <Text style={styles.payDate}>{formatDate(period.payDate)}</Text>
        {isCurrent && <Text style={styles.currentBadge}>CURRENT</Text>}
      </View>

      {/* Center: Bills + Extra */}
      <View style={styles.center}>
        <Text style={styles.billsAmount}>{formatCurrency(period.billTotal)}</Text>
        <Text style={styles.billsLabel}>bills</Text>
        {period.extraTotal !== 0 && (
          <Text style={styles.extraAmount}>{formatCurrency(period.extraTotal)}</Text>
        )}
      </View>

      {/* Right: Net + Balance */}
      <View style={styles.right}>
        <Text style={[styles.netAmount, { color: netColor }]}>
          {formatCurrency(period.net)}
        </Text>
        <Text style={styles.netLabel}>net</Text>
        <Text style={styles.balance}>{formatCurrency(period.runningBalance)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  left: {
    flex: 1.4,
    alignItems: 'flex-start',
  },
  center: {
    flex: 1.2,
    alignItems: 'center',
  },
  right: {
    flex: 1.4,
    alignItems: 'flex-end',
  },
  periodNum: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  payDate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  currentBadge: {
    fontSize: 9,
    color: Colors.textIncome,
    fontWeight: '700',
    marginTop: 2,
  },
  billsAmount: {
    fontSize: 13,
    color: Colors.textExpense,
    fontWeight: '600',
  },
  billsLabel: {
    fontSize: 9,
    color: Colors.textMuted,
  },
  extraAmount: {
    fontSize: 11,
    color: Colors.textExtra,
  },
  netAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  netLabel: {
    fontSize: 9,
    color: Colors.textMuted,
  },
  balance: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textBalance,
  },
});
