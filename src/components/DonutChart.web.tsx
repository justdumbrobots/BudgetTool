/**
 * Web replacement for DonutChart.
 *
 * react-native-svg uses native C++ bindings that crash at module-init time
 * when Metro loads the wrong (native) entry on web. Metro auto-selects this
 * .web.tsx file instead, so react-native-svg is never imported on web.
 *
 * Renders the same data as a horizontal bar + legend using plain Views.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { formatCurrency } from '../utils/formatters';

export interface ChartSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: ChartSlice[];
  size?: number; // accepted but unused — keeps the API identical
}

export function DonutChart({ data }: DonutChartProps) {
  const filtered = data.filter((d) => d.value > 0);
  const total = filtered.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Segmented bar */}
      <View style={styles.bar}>
        {filtered.map((slice, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                flex: slice.value / total,
                backgroundColor: slice.color,
                borderTopLeftRadius: i === 0 ? 4 : 0,
                borderBottomLeftRadius: i === 0 ? 4 : 0,
                borderTopRightRadius: i === filtered.length - 1 ? 4 : 0,
                borderBottomRightRadius: i === filtered.length - 1 ? 4 : 0,
              },
            ]}
          />
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {filtered.map((slice, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: slice.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {slice.label}
            </Text>
            <Text style={styles.legendValue}>{formatCurrency(slice.value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
    width: '100%',
  },
  bar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 4,
    overflow: 'hidden',
  },
  segment: {
    height: '100%',
  },
  empty: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  legend: {
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    flex: 1,
    fontSize: 11,
    color: Colors.textPrimary,
  },
  legendValue: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
