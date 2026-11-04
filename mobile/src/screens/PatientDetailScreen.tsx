/**
 * Read-only patient detail for clinicians.
 *
 * A clinician reviews — they do not author patient-reported data (the backend
 * enforces the same rule with object-level permissions), so there is no edit
 * affordance here at all.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, ErrorState, Page, Pill, ScreenHeader, StatCard } from '@/components/ui';
import { TrendChart } from '@/components/TrendChart';
import { usePatient } from '@/hooks/queries';
import { computeSummary, computeTrend } from '@/demo/demoData';
import { colors, spacing, typography } from '@/theme/tokens';

export function PatientDetailScreen({
  patientId,
  onBack,
}: {
  patientId: string;
  onBack: () => void;
}): React.JSX.Element {
  const { data, isLoading, isError, refetch } = usePatient(patientId);

  if (isLoading) {
    return (
      <Page>
        <EmptyState message="Loading patient record…" />
      </Page>
    );
  }
  if (isError || !data) {
    return (
      <Page>
        <ErrorState message="Could not load this patient." onRetry={refetch} />
      </Page>
    );
  }

  const entries = data.entries ?? [];
  const summary = computeSummary(entries, 30);
  const trend = computeTrend(entries, 30);
  const recent = [...entries].sort((a, b) => (a.recorded_at < b.recorded_at ? 1 : -1)).slice(0, 5);

  return (
    <Page>
      <ScreenHeader title={data.full_name} subtitle={`${data.primary_condition} · ${data.email}`} />

      <View style={styles.statsRow}>
        <StatCard value={String(summary.total_entries)} label="Entries (30d)" tone="neutral" />
        <StatCard
          value={summary.avg_severity === null ? '—' : summary.avg_severity.toFixed(1)}
          label="Avg severity"
          tone="brand"
        />
      </View>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Severity over time</Text>
        <TrendChart points={trend.points} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Recent entries</Text>
        {recent.length === 0 ? (
          <Text style={styles.muted}>No entries yet.</Text>
        ) : (
          recent.map((e) => (
            <View key={e.id} style={styles.entryRow}>
              <Text style={styles.entryType}>{e.symptom_type.replace(/_/g, ' ')}</Text>
              <Pill
                label={`${e.severity}/10`}
                tone={e.severity <= 3 ? 'success' : e.severity <= 6 ? 'warning' : 'danger'}
              />
            </View>
          ))
        )}
      </Card>

      {data.medications && data.medications.length > 0 ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Medication</Text>
          {data.medications.map((m) => (
            <View key={m.id} style={styles.entryRow}>
              <Text style={styles.entryType}>
                {m.medication_name} {m.dosage}
              </Text>
              <Pill label={m.taken ? 'taken' : 'not taken'} tone={m.taken ? 'success' : 'neutral'} />
            </View>
          ))}
        </Card>
      ) : null}

      <View style={styles.back}>
        <Button label="Back to roster" onPress={onBack} variant="secondary" />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    ...(typography.h3 as object),
    color: colors.textPrimary,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  entryType: {
    ...(typography.body as object),
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  muted: {
    ...(typography.body as object),
    color: colors.textMuted,
  },
  back: {
    marginTop: spacing.md,
  },
});
