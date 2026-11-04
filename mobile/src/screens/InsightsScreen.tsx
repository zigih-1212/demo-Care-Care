/**
 * Insights screen — a longer trend plus a plain-language summary, so the patient
 * sees patterns rather than a single number.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState, ErrorState, Page, SectionTitle, StatCard } from '@/components/ui';
import { TrendChart } from '@/components/TrendChart';
import { useSummary, useTrend } from '@/hooks/queries';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const WINDOWS = [7, 30, 90];

export function InsightsScreen(): React.JSX.Element {
  const [days, setDays] = useState(30);
  const trend = useTrend(days);
  const summary = useSummary(days);

  return (
    <Page>
      <Text style={styles.title}>Insights</Text>
      <Text style={styles.subtitle}>
        Longer windows show the shape of your week-to-week pattern.
      </Text>

      <View style={styles.windowRow}>
        {WINDOWS.map((w) => (
          <Pressable
            key={w}
            onPress={() => setDays(w)}
            accessibilityRole="button"
            accessibilityState={{ selected: days === w }}
            style={[styles.window, days === w && styles.windowActive]}
          >
            <Text style={[styles.windowText, days === w && styles.windowTextActive]}>{w} days</Text>
          </Pressable>
        ))}
      </View>

      {trend.isError ? (
        <ErrorState message="Couldn't load insights." onRetry={() => void trend.refetch()} />
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard
              value={String(summary.data?.total_entries ?? '—')}
              label="Entries"
              tone="neutral"
            />
            <StatCard
              value={summary.data?.avg_severity != null ? summary.data.avg_severity.toFixed(1) : '—'}
              label="Avg severity"
              tone="brand"
            />
            <StatCard
              value={String(trend.data?.points.length ?? 0)}
              label="Days tracked"
              tone="neutral"
            />
          </View>

          <SectionTitle title="Severity over time" />
          <Card>
            <TrendChart points={trend.data?.points ?? []} />
          </Card>

          {trend.data && trend.data.points.length === 0 ? (
            <EmptyState message="Not enough data yet. Keep logging to unlock insights." />
          ) : null}
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { ...(typography.h1 as object), color: colors.textPrimary },
  subtitle: {
    ...(typography.body as object),
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  windowRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  window: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  windowActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  windowText: { ...(typography.caption as object), color: colors.textSecondary },
  windowTextActive: { color: colors.white, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: spacing.md },
});
