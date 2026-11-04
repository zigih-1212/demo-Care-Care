/**
 * Insights screen — a longer trend plus a per-week breakdown, so the patient can
 * see patterns rather than a single number.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState, ErrorState, ScreenHeader } from '@/components/ui';
import { TrendChart } from '@/components/TrendChart';
import { useSummary, useTrend } from '@/hooks/queries';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const WINDOWS = [7, 30, 90];

export function InsightsScreen(): React.JSX.Element {
  const [days, setDays] = useState(30);
  const trend = useTrend(days);
  const summary = useSummary(days);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <ScreenHeader title="Insights" subtitle="Understand your patterns" />

      <View style={styles.windowRow}>
        {WINDOWS.map((w) => (
          <Text
            key={w}
            onPress={() => setDays(w)}
            accessibilityRole="button"
            accessibilityState={{ selected: days === w }}
            style={[styles.window, days === w && styles.windowActive]}
          >
            {w}d
          </Text>
        ))}
      </View>

      {trend.isError ? (
        <ErrorState message="Couldn't load insights." onRetry={() => void trend.refetch()} />
      ) : (
        <>
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Severity over time</Text>
            <TrendChart points={trend.data?.points ?? []} />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.kv}>
              <Text style={styles.k}>Entries</Text>
              <Text style={styles.v}>{summary.data?.total_entries ?? '—'}</Text>
            </View>
            <View style={styles.kv}>
              <Text style={styles.k}>Average severity</Text>
              <Text style={styles.v}>
                {summary.data?.avg_severity != null ? summary.data.avg_severity.toFixed(1) : '—'}
              </Text>
            </View>
            <View style={styles.kv}>
              <Text style={styles.k}>Days tracked</Text>
              <Text style={styles.v}>{trend.data?.points.length ?? 0}</Text>
            </View>
          </Card>

          {trend.data && trend.data.points.length === 0 ? (
            <EmptyState message="Not enough data yet. Keep logging to unlock insights." />
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md },
  windowRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  window: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textSecondary,
    overflow: 'hidden',
  },
  windowActive: { backgroundColor: colors.brand, color: colors.white, borderColor: colors.brand },
  card: { marginBottom: spacing.md },
  sectionTitle: { ...(typography.h3 as object), color: colors.textPrimary, marginBottom: spacing.sm },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  k: { ...(typography.body as object), color: colors.textSecondary },
  v: { ...(typography.bodyStrong as object), color: colors.textPrimary },
});
