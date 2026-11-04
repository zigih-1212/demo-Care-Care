/**
 * Therapy screen — browse active programs and manage enrollments.
 */
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { Button, Card, EmptyState, ErrorState, ScreenHeader } from '@/components/ui';
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
      <View style={styles.flex}>
        <ErrorState
          message="Couldn't load your programs."
          onRetry={() => {
            void programs.refetch();
            void enrollments.refetch();
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <ScreenHeader title="Therapy" subtitle="Guided programs for your condition" />

      <Text style={styles.sectionTitle}>Your programs</Text>
      {enrollments.data && enrollments.data.results.length > 0 ? (
        enrollments.data.results.map((enrollment) => (
          <Card key={enrollment.id} style={styles.card}>
            <Text style={styles.cardTitle}>{enrollment.program_detail.title}</Text>
            <Text style={styles.meta}>
              {enrollment.status} • {enrollment.program_detail.duration_weeks} weeks •{' '}
              {enrollment.progress_percent}%
            </Text>
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
        <EmptyState message="You haven't enrolled in a program yet." />
      )}

      <Text style={[styles.sectionTitle, styles.spacer]}>Available programs</Text>
      {programs.data?.results.map((program) => (
        <Card key={program.id} style={styles.card}>
          <Text style={styles.cardTitle}>{program.title}</Text>
          <Text style={styles.meta}>
            {program.condition} • {program.duration_weeks} weeks
          </Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md },
  sectionTitle: { ...(typography.h3 as object), color: colors.textPrimary, marginBottom: spacing.sm },
  spacer: { marginTop: spacing.lg },
  card: { marginBottom: spacing.md },
  cardTitle: { ...(typography.bodyStrong as object), color: colors.textPrimary },
  meta: { ...(typography.caption as object), color: colors.textMuted, marginTop: spacing.xs, textTransform: 'capitalize' },
  description: { ...(typography.body as object), color: colors.textSecondary, marginTop: spacing.sm },
  action: { marginTop: spacing.md },
});
