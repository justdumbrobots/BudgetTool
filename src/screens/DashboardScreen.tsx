/**
 * Dashboard (Home Screen)
 *
 * Displays at-a-glance financial health:
 *   - 2×2 grid of key metrics (balance, income, bills, net)
 *   - Monthly summary
 *   - Spending by category donut chart
 *   - Upcoming 6 pay periods preview
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { MetricCard } from '../components/MetricCard';
import { DonutChart, ChartSlice } from '../components/DonutChart';
import { formatCurrency, formatDate } from '../utils/formatters';
import { CATEGORY_META, RootStackParamList } from '../types';
import { getMostRecentPeriodIndex, getCurrentPeriodIndex } from '../engine/periodGenerator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, computedPeriods, periods, bills } = useAppStore();

  const mostRecentIdx = useMemo(
    () => (periods.length ? getMostRecentPeriodIndex(periods) : 0),
    [periods],
  );

  const currentPeriod = computedPeriods[mostRecentIdx];

  // Monthly summary: sum two bi-weekly periods ≈ 1 month
  const periodsPerMonth = useMemo(() => {
    if (!profile) return 2;
    switch (profile.payFrequency) {
      case 'weekly':       return 4;
      case 'bi-weekly':    return 2;
      case 'semi-monthly': return 2;
      case 'monthly':      return 1;
    }
  }, [profile]);

  const monthlyIncome    = ((profile?.incomePerPeriod ?? 0) + (profile?.sideIncome ?? 0)) * periodsPerMonth;
  const monthlyBills     = useMemo(() => {
    if (!currentPeriod) return 0;
    return currentPeriod.billTotal * periodsPerMonth;
  }, [currentPeriod, periodsPerMonth]);
  const monthlyFreeCash  = monthlyIncome - monthlyBills;

  // Upcoming periods (next 6 from current)
  const currentIdx = useMemo(
    () => (periods.length ? getCurrentPeriodIndex(periods) : 0),
    [periods],
  );
  const upcomingPeriods = computedPeriods.slice(currentIdx, currentIdx + 6);

  // Spending by category (from active bills)
  const categoryData: ChartSlice[] = useMemo(() => {
    const totals: Partial<Record<string, number>> = {};
    for (const bill of bills) {
      if (bill.status !== 'active') continue;
      totals[bill.category] = (totals[bill.category] ?? 0) + bill.amount;
    }
    return Object.entries(totals)
      .map(([cat, value]) => ({
        label: CATEGORY_META[cat as keyof typeof CATEGORY_META]?.label ?? cat,
        value: value ?? 0,
        color: CATEGORY_META[cat as keyof typeof CATEGORY_META]?.color ?? '#999',
      }))
      .sort((a, b) => b.value - a.value);
  }, [bills]);

  if (!currentPeriod) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No data yet. Complete setup to get started.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>PayPeriod</Text>
          <Text style={styles.dateLabel}>{formatDate(new Date())}</Text>
        </View>

        {/* Metric cards — 2×2 grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricsRow}>
            <View style={styles.metricCell}>
              <MetricCard
                label="Balance"
                value={formatCurrency(currentPeriod.runningBalance)}
                valueColor={Colors.textBalance}
                subLabel="as of last paycheck"
              />
            </View>
            <View style={styles.metricCell}>
              <MetricCard
                label="Income / Period"
                value={formatCurrency(currentPeriod.income)}
                valueColor={Colors.textIncome}
              />
            </View>
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metricCell}>
              <MetricCard
                label="Last Bills"
                value={formatCurrency(currentPeriod.billTotal)}
                valueColor={Colors.textExpense}
              />
            </View>
            <View style={styles.metricCell}>
              <MetricCard
                label="Last Net"
                value={formatCurrency(currentPeriod.net)}
                valueColor={currentPeriod.net >= 0 ? Colors.textNet : Colors.textExpense}
              />
            </View>
          </View>
        </View>

        {/* Monthly Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Summary</Text>
          <View style={styles.summaryCard}>
            <SummaryRow label="Monthly Income" value={monthlyIncome} color={Colors.textIncome} />
            <SummaryRow label="Monthly Bills"  value={monthlyBills}  color={Colors.textExpense} />
            <View style={styles.divider} />
            <SummaryRow label="Free Cash"      value={monthlyFreeCash} color={monthlyFreeCash >= 0 ? Colors.textNet : Colors.textExpense} />
          </View>
        </View>

        {/* Spending by Category */}
        {categoryData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spending by Category</Text>
            <View style={styles.chartCard}>
              <DonutChart data={categoryData} size={160} />
            </View>
          </View>
        )}

        {/* Upcoming Periods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Pay Periods</Text>
          {upcomingPeriods.map((p) => (
            <TouchableOpacity
              key={p.index}
              style={styles.upcomingRow}
              onPress={() => navigation.navigate('PeriodDetail', { periodIndex: p.index })}
              activeOpacity={0.7}
            >
              <View style={styles.upcomingLeft}>
                <Text style={styles.upcomingDate}>{formatDate(p.payDate)}</Text>
                <Text style={styles.upcomingBalance}>{formatCurrency(p.runningBalance)}</Text>
              </View>
              <View style={styles.upcomingRight}>
                <Text style={styles.upcomingBills}>
                  Bills: <Text style={{ color: Colors.textExpense }}>{formatCurrency(p.billTotal)}</Text>
                </Text>
                <Text style={[styles.upcomingNet, { color: p.net >= 0 ? Colors.textNet : Colors.textExpense }]}>
                  Net: {formatCurrency(p.net)}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{formatCurrency(value)}</Text>
    </View>
  );
}

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  dateLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  metricsGrid: {
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCell: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textLabel,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  chartCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  upcomingLeft: {
    flex: 1,
  },
  upcomingDate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  upcomingBalance: {
    fontSize: 12,
    color: Colors.textBalance,
    marginTop: 2,
  },
  upcomingRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  upcomingBills: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  upcomingNet: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: Colors.textMuted,
    marginLeft: 8,
  },
});
