/**
 * Therapy screen — the patient's guided programs and the catalogue to join more.
 */
import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Page,
  Pill,
  ProgressBar,
  SectionTitle,
} from '@/components/ui';
import { useCompleteEnrollment, useEnroll, useEnrollments, usePrograms } from '@/hooks/queries';
import { colors, spacing, typography } from '@/theme/tokens';

export function TherapyScreen(): React.JSX.Element {
  const programs = usePrograms();
  const enrollments = useEnrollments();
  const enroll = useEnroll();
  const complete = useCompleteEnrollment();

  function onEnroll(programId: string): void {
    enroll.mutate(programId, {
      onError: (err) =>
        Alert.alert('Could not enroll', err instanceof ApiError ? err.message : 'Try again.'),
    });
  }

  function onComplete(enrollmentId: string): void {
    complete.mutate(enrollmentId, {
      onError: (err) =>
        Alert.alert('Could not complete', err instanceof ApiError ? err.message : 'Try again.'),
    });
  }

  if (programs.isError || enrollments.isError) {
    return (
      <Page>
        <ErrorState
          message="Couldn't load your programs."
          onRetry={() => {
            void programs.refetch();
            void enrollments.refetch();
          }}
        />
      </Page>
    );
  }

  return (
    <Page>
      <Text style={styles.title}>Therapy</Text>
      <Text style={styles.subtitle}>
        Structured plans build habits that reduce flare-ups. Progress is tracked automatically.
      </Text>

      <SectionTitle title="Your programs" />
      {enrollments.data && enrollments.data.results.length > 0 ? (
        enrollments.data.results.map((enrollment) => (
          <Card key={enrollment.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{enrollment.program_detail.title}</Text>
              <Pill
                label={enrollment.status}
                tone={enrollment.status === 'completed' ? 'success' : 'brand'}
              />
            </View>
            <Text style={styles.meta}>{enrollment.program_detail.duration_weeks} weeks</Text>
            <View style={styles.progressWrap}>
              <ProgressBar percent={enrollment.progress_percent} />
              <Text style={styles.progressLabel}>{enrollment.progress_percent}% complete</Text>
            </View>
            {enrollment.status === 'active' ? (
              <View style={styles.action}>
                <Button
                  label="Mark complete"
                  variant="secondary"
                  onPress={() => onComplete(enrollment.id)}
                  loading={complete.isPending}
                />
              </View>
            ) : null}
          </Card>
        ))
      ) : (
        <EmptyState message="You haven't enrolled in a program yet. Pick one below to begin." />
      )}

      <SectionTitle title="Available programs" />
      {programs.data?.results.map((program) => (
        <Card key={program.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{program.title}</Text>
            <Pill label={program.condition} tone="neutral" />
          </View>
          <Text style={styles.meta}>{program.duration_weeks} weeks</Text>
          <Text style={styles.description}>{program.description}</Text>
          <View style={styles.action}>
            <Button
              label="Enroll"
              onPress={() => onEnroll(program.id)}
              loading={enroll.isPending}
              testID={`enroll-${program.slug}`}
            />
          </View>
        </Card>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { ...(typography.h1 as object), color: colors.textPrimary },
  subtitle: {
    ...(typography.body as object),
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  card: { marginBottom: spacing.md, gap: spacing.xs },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitle: { ...(typography.bodyStrong as object), color: colors.textPrimary, flex: 1 },
  meta: { ...(typography.caption as object), color: colors.textMuted },
  description: { ...(typography.body as object), color: colors.textSecondary, marginTop: spacing.xs },
  progressWrap: { marginTop: spacing.sm, gap: spacing.xs },
  progressLabel: { ...(typography.caption as object), color: colors.textSecondary },
  action: { marginTop: spacing.sm },
});
