/**
 * Clinician roster.
 *
 * The clinician's home screen is fundamentally different from the patient's:
 * their job is to triage a caseload, not to log their own symptoms. So this
 * shows the people under their care, sorted by how they are doing, and drills
 * into a read-only detail view.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, Page, Pill, ScreenHeader, StatCard } from '@/components/ui';
import { useRoster } from '@/hooks/queries';
import type { RosterEntry } from '@/api/endpoints';
import { colors, radii, spacing, typography } from '@/theme/tokens';

function conditionTone(condition: string): 'brand' | 'neutral' {
  return condition === 'IBS' ? 'brand' : 'neutral';
}

function severityTone(avg: number | null): 'success' | 'warning' | 'danger' {
  if (avg === null) return 'success';
  if (avg <= 3) return 'success';
  if (avg <= 6) return 'warning';
  return 'danger';
}

function RosterRow({
  entry,
  onPress,
}: {
  entry: RosterEntry;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${entry.full_name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowHeader}>
        <Text style={styles.rowName}>{entry.full_name}</Text>
        <Pill label={entry.primary_condition} tone={conditionTone(entry.primary_condition)} />
      </View>
      <Text style={styles.rowMeta}>{entry.email}</Text>
      <View style={styles.rowFooter}>
        <Text style={styles.rowStat}>{entry.entries_30d} entries · 30 days</Text>
        {entry.avg_severity_30d !== null ? (
          <Pill label={`avg ${entry.avg_severity_30d}/10`} tone={severityTone(entry.avg_severity_30d)} />
        ) : (
          <Pill label="no data" tone="neutral" />
        )}
      </View>
    </Pressable>
  );
}

export function RosterScreen({
  onSelectPatient,
}: {
  onSelectPatient: (id: string) => void;
}): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useRoster();

  const total = data?.length ?? 0;
  const needsAttention =
    data?.filter((r) => (r.avg_severity_30d ?? 0) > 6).length ?? 0;

  return (
    <Page>
      <ScreenHeader
        title="Your patients"
        subtitle="Everyone with an active care relationship with you."
      />

      {isLoading ? (
        <EmptyState message="Loading your caseload…" />
      ) : isError ? (
        <ErrorState message="Could not load the roster." onRetry={refetch} />
      ) : total === 0 ? (
        <EmptyState message="No patients are assigned to you yet." />
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard value={String(total)} label="Under your care" tone="neutral" />
            <StatCard
              value={String(needsAttention)}
              label="Need attention"
              hint="avg severity > 6/10"
              tone={needsAttention > 0 ? 'brand' : 'neutral'}
            />
          </View>
          {data?.map((entry) => (
            <RosterRow key={entry.id} entry={entry} onPress={() => onSelectPatient(entry.id)} />
          ))}
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  rowPressed: {
    backgroundColor: colors.brandLight,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowName: {
    ...(typography.h3 as object),
    color: colors.textPrimary,
  },
  rowMeta: {
    ...(typography.caption as object),
    color: colors.textMuted,
  },
  rowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  rowStat: {
    ...(typography.caption as object),
    color: colors.textSecondary,
  },
});
