/**
 * Lightweight SVG-free trend chart.
 *
 * A dependency-free bar chart is enough to convey symptom severity over time
 * without pulling in a charting library; bars are plain Views, so it renders
 * identically on iOS/Android/web and stays cheap to paint.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/tokens';
import { severityColor } from '@/theme/tokens';
import type { TrendPoint } from '@/types/api';

const CHART_HEIGHT = 160;

export function TrendChart({ points }: { points: TrendPoint[] }): React.JSX.Element {
  if (points.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No data yet — log a symptom to see your trend.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper} accessibilityRole="image" accessibilityLabel="Symptom severity trend">
      <View style={styles.plot}>
        {points.map((point) => {
          const height = Math.max(4, (point.avg_severity / 10) * CHART_HEIGHT);
          return (
            <View key={point.date} style={styles.barColumn}>
              <Text style={styles.value}>{point.avg_severity.toFixed(0)}</Text>
              <View
                style={[
                  styles.bar,
                  { height, backgroundColor: severityColor(point.avg_severity) },
                ]}
              />
              <Text style={styles.day} numberOfLines={1}>
                {point.date.slice(5)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingVertical: spacing.sm },
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: CHART_HEIGHT + 40,
  },
  barColumn: { alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  bar: { width: 18, borderRadius: radii.sm },
  value: { ...(typography.caption as object), color: colors.textSecondary, marginBottom: 2 },
  day: { ...(typography.caption as object), color: colors.textMuted, fontSize: 11, marginTop: 4 },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { ...(typography.body as object), color: colors.textMuted, textAlign: 'center' },
});
