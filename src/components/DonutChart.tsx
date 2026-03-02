/**
 * Simple SVG donut chart for category spending breakdown.
 * Uses react-native-svg (bundled with Expo).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '../theme/colors';
import { formatCurrency } from '../utils/formatters';

export interface ChartSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: ChartSlice[];
  size?: number;
}

export function DonutChart({ data, size = 180 }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <View style={[styles.empty, { width: size, height: size }]}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 8;
  const innerR = outerR * 0.55;

  // Build path segments
  let cumAngle = -Math.PI / 2; // Start at top (12 o'clock)
  const slices = data
    .filter((d) => d.value > 0)
    .map((slice) => {
      const fraction = slice.value / total;
      const angle = fraction * 2 * Math.PI;
      const startAngle = cumAngle;
      const endAngle = cumAngle + angle;
      cumAngle = endAngle;

      // Outer arc endpoints
      const ox1 = cx + outerR * Math.cos(startAngle);
      const oy1 = cy + outerR * Math.sin(startAngle);
      const ox2 = cx + outerR * Math.cos(endAngle);
      const oy2 = cy + outerR * Math.sin(endAngle);

      // Inner arc endpoints (reversed for donut)
      const ix1 = cx + innerR * Math.cos(endAngle);
      const iy1 = cy + innerR * Math.sin(endAngle);
      const ix2 = cx + innerR * Math.cos(startAngle);
      const iy2 = cy + innerR * Math.sin(startAngle);

      const large = angle > Math.PI ? 1 : 0;

      const d =
        `M ${ox1} ${oy1} ` +
        `A ${outerR} ${outerR} 0 ${large} 1 ${ox2} ${oy2} ` +
        `L ${ix1} ${iy1} ` +
        `A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} ` +
        `Z`;

      return { d, color: slice.color, label: slice.label, value: slice.value };
    });

  return (
    <View style={styles.wrapper}>
      <Svg width={size} height={size}>
        {slices.map((s, i) => (
          <Path key={i} d={s.d} fill={s.color} />
        ))}
        {/* Center hole background */}
        <Circle cx={cx} cy={cy} r={innerR - 2} fill={Colors.bgPrimary} />
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        {data
          .filter((d) => d.value > 0)
          .map((slice, i) => (
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  legend: {
    flex: 1,
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
