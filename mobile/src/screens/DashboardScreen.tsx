/**
 * Dashboard — the patient's home.
 *
 * Composition matters here: a short hero that explains what the screen is for,
 * the headline numbers, a first-steps checklist for newcomers, and the trend.
 * The checklist is the "quest" layer that was missing — it tells a first-time
 * user what to do instead of dropping them into an empty data grid.
 */
import React from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  EmptyState,
  ErrorState,
  InfoBanner,
  Page,
  ProgressBar,
  SectionTitle,
  StatCard,
  Pill,
} from '@/components/ui';
import { TrendChart } from '@/components/TrendChart';
import { useAuth } from '@/auth/AuthContext';
import { useSummary, useTrend } from '@/hooks/queries';
import { FIRST_STEPS, useOnboarding } from '@/onboarding/useOnboarding';
import { colors, radii, spacing, typography } from '@/theme/tokens';

function FirstSteps(): React.JSX.Element | null {
  const { done, dismissed, complete, dismiss } = useOnboarding();
  const remaining = FIRST_STEPS.filter((s) => !done.includes(s.id));
  if (dismissed && remaining.length === 0) return null;

  const percent = Math.round(((FIRST_STEPS.length - remaining.length) / FIRST_STEPS.length) * 100);

  return (
    <Card style={styles.stepsCard}>
      <View style={styles.stepsHeader}>
        <Text style={styles.stepsTitle}>Getting started</Text>
        <Pill label={`${FIRST_STEPS.length - remaining.length}/${FIRST_STEPS.length}`} tone="brand" />
      </View>
      <Text style={styles.stepsHint}>
        A few steps to get the most out of Cara Care. You can hide this whenever you like.
      </Text>
      <ProgressBar percent={percent} />
      <View style={styles.stepList}>
        {FIRST_STEPS.map((step) => {
          const isDone = done.includes(step.id);
          return (
            <Pressable
              key={step.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isDone }}
              accessibilityLabel={step.title}
              onPress={() => complete(step.id)}
              style={styles.stepRow}
            >
              <View style={[styles.stepDot, isDone && styles.stepDotDone]}>
                <Text style={styles.stepDotText}>{isDone ? '✓' : ''}</Text>
              </View>
              <View style={styles.stepInfo}>
                <Text style={[styles.stepTitle, isDone && styles.stepTitleDone]}>{step.title}</Text>
                <Text style={styles.stepHintText}>{step.hint}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.dismiss} onPress={dismiss} accessibilityRole="button">
        Hide this checklist
      </Text>
    </Card>
  );
}

export function DashboardScreen(): React.JSX.Element {
  const { user } = useAuth();
  const summary = useSummary(30);
  const trend = useTrend(30);

  const loading = summary.isLoading || trend.isLoading;
  const errored = summary.isError || trend.isError;

  function refetch(): void {
    void summary.refetch();
    void trend.refetch();
  }

  const firstName = (user?.full_name ?? 'there').split(' ')[0];

  return (
    <Page refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}>
      <Text style={styles.heroTitle}>Hello, {firstName}</Text>
      <Text style={styles.heroSubtitle}>
        This is your diary. Log what you feel, and the charts show whether your therapy is helping.
      </Text>

      <InfoBanner
        title="Why track?"
        body="Symptom patterns are hard to remember and easy to miss. A short daily entry turns them into a trend your clinician can act on."
      />

      {errored ? (
        <ErrorState message="We couldn't load your data." onRetry={refetch} />
      ) : (
        <>
          <SectionTitle title="Last 30 days" />
          <View style={styles.statsRow}>
            <StatCard
              value={String(summary.data?.total_entries ?? '—')}
              label="Entries"
              tone="neutral"
            />
            <StatCard
              value={summary.data?.avg_severity != null ? summary.data.avg_severity.toFixed(1) : '—'}
              label="Avg severity"
              hint="out of 10"
              tone="brand"
            />
          </View>

          <FirstSteps />

          {summary.data?.worst_entry ? (
            <Card style={styles.worstCard}>
              <Text style={styles.sectionTitle}>Worst day</Text>
              <View style={styles.worstRow}>
                <Text style={styles.worstLabel}>
                  {summary.data.worst_entry.symptom_type.replace(/_/g, ' ')}
                </Text>
                <Pill label={`${summary.data.worst_entry.severity}/10`} tone="danger" />
              </View>
            </Card>
          ) : null}

          <SectionTitle title="Severity trend" />
          <Card>
            <TrendChart points={trend.data?.points ?? []} />
          </Card>

          {summary.data && summary.data.total_entries === 0 ? (
            <EmptyState message="No symptom entries yet. Open the Log tab to record how you feel today." />
          ) : null}
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  heroTitle: { ...(typography.h1 as object), color: colors.textPrimary },
  heroSubtitle: {
    ...(typography.body as object),
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  worstCard: { marginTop: spacing.md, gap: spacing.xs },
  sectionTitle: { ...(typography.h3 as object), color: colors.textPrimary, marginBottom: spacing.xs },
  worstRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  worstLabel: { ...(typography.body as object), color: colors.textSecondary, textTransform: 'capitalize' },
  stepsCard: { marginTop: spacing.md, gap: spacing.sm },
  stepsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepsTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  stepsHint: { ...(typography.caption as object), color: colors.textSecondary },
  stepList: { marginTop: spacing.sm, gap: spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepDotDone: { backgroundColor: colors.brand, borderColor: colors.brand },
  stepDotText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  stepInfo: { flex: 1, gap: 2 },
  stepTitle: { ...(typography.bodyStrong as object), color: colors.textPrimary },
  stepTitleDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  stepHintText: { ...(typography.caption as object), color: colors.textMuted },
  dismiss: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    textDecorationLine: 'underline',
  },
});
