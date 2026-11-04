/**
 * Dashboard — the patient's home. Surfaces the 30-day summary and trend, plus a
 * prompt to log today's symptoms if none exist yet.
 */
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SeverityBadge, Card, EmptyState, ErrorState, ScreenHeader } from '@/components/ui';
import { TrendChart } from '@/components/TrendChart';
import { useSummary, useTrend } from '@/hooks/queries';
import { colors, spacing, typography } from '@/theme/tokens';

export function DashboardScreen(): React.JSX.Element {
  const summary = useSummary(30);
  const trend = useTrend(30);

  const loading = summary.isLoading || trend.isLoading;
  const errored = summary.isError || trend.isError;

  function refetch(): void {
    void summary.refetch();
    void trend.refetch();
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
    >
      <ScreenHeader title="Your overview" subtitle="Last 30 days" />

      {errored ? (
        <ErrorState message="We couldn't load your data." onRetry={refetch} />
      ) : (
        <>
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{summary.data?.total_entries ?? '—'}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>
                {summary.data?.avg_severity != null ? summary.data.avg_severity.toFixed(1) : '—'}
              </Text>
              <Text style={styles.statLabel}>Avg severity</Text>
            </Card>
          </View>

          {summary.data?.worst_entry ? (
            <Card style={styles.worstCard}>
              <Text style={styles.sectionTitle}>Worst day</Text>
              <View style={styles.worstRow}>
                <Text style={styles.worstLabel}>{summary.data.worst_entry.symptom_type}</Text>
                <SeverityBadge severity={summary.data.worst_entry.severity} />
              </View>
            </Card>
          ) : null}

          <Text style={styles.sectionTitle}>Severity trend</Text>
          <Card>
            <TrendChart points={trend.data?.points ?? []} />
          </Card>

          {summary.data && summary.data.total_entries === 0 ? (
            <EmptyState message="No symptom entries in this period. Log one from the Log tab to start tracking." />
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { ...(typography.h2 as object), color: colors.brand },
  statLabel: { ...(typography.caption as object), color: colors.textSecondary, marginTop: spacing.xs },
  worstCard: { marginBottom: spacing.md },
  sectionTitle: { ...(typography.h3 as object), color: colors.textPrimary, marginBottom: spacing.sm },
  worstRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  worstLabel: { ...(typography.body as object), color: colors.textSecondary },
});
