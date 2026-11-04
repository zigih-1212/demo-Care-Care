/**
 * Log screen — record a symptom and (optionally) a medication.
 *
 * Severity is chosen with an accessible segmented control rather than a slider,
 * because sliders are hard to operate precisely with assistive tech.
 */
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import { Button, Card, InfoBanner, Page, SectionTitle, Field } from '@/components/ui';
import { useCreateMedication, useCreateSymptom } from '@/hooks/queries';
import { useOnboarding } from '@/onboarding/useOnboarding';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { SYMPTOM_LABELS, SYMPTOM_TYPES, SymptomType } from '@/types/api';

export function LogScreen(): React.JSX.Element {
  const [symptomType, setSymptomType] = useState<SymptomType>('bloating');
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState('');
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const { complete } = useOnboarding();

  const createSymptom = useCreateSymptom();
  const createMedication = useCreateMedication();

  async function submitSymptom(): Promise<void> {
    try {
      await createSymptom.mutateAsync({
        symptom_type: symptomType,
        severity,
        notes: notes.trim(),
        recorded_at: new Date().toISOString(),
      });
      setNotes('');
      complete('log');
      Alert.alert('Saved', 'Your symptom entry has been recorded.');
    } catch (err) {
      Alert.alert('Could not save', err instanceof ApiError ? err.message : 'Please try again.');
    }
  }

  async function submitMedication(): Promise<void> {
    if (!medName.trim()) return;
    try {
      await createMedication.mutateAsync({
        medication_name: medName.trim(),
        dosage: medDosage.trim(),
        taken: true,
        recorded_at: new Date().toISOString(),
      });
      setMedName('');
      setMedDosage('');
      Alert.alert('Saved', 'Medication recorded.');
    } catch (err) {
      Alert.alert('Could not save', err instanceof ApiError ? err.message : 'Please try again.');
    }
  }

  return (
    <Page>
      <Text style={styles.title}>Log an entry</Text>
      <Text style={styles.subtitle}>It takes ten seconds and makes your trend meaningful.</Text>

      <InfoBanner
        title="Which severity?"
        body="Think of a normal day as 0–3, a distracting day as 4–6, and a day where you can't do your usual activities as 7–10."
      />

      <SectionTitle title="Symptom" />
      <Card style={styles.card}>
        <Field label="What are you feeling?">
          <View style={styles.chips}>
            {SYMPTOM_TYPES.map((type) => (
              <Text
                key={type}
                onPress={() => setSymptomType(type)}
                accessibilityRole="button"
                accessibilityState={{ selected: symptomType === type }}
                style={[styles.chip, symptomType === type && styles.chipActive]}
              >
                {SYMPTOM_LABELS[type]}
              </Text>
            ))}
          </View>
        </Field>

        <Field label={`How strong? ${severity}/10`}>
          <View style={styles.severityRow}>
            {Array.from({ length: 11 }, (_, n) => n).map((n) => (
              <Text
                key={n}
                onPress={() => setSeverity(n)}
                accessibilityRole="button"
                accessibilityLabel={`Severity ${n} of 10`}
                accessibilityState={{ selected: severity === n }}
                style={[styles.severityDot, severity === n && styles.severityDotActive]}
              >
                {n}
              </Text>
            ))}
          </View>
        </Field>

        <Field label="Notes (optional)" hint="Food, stress, sleep — anything that might matter.">
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={2000}
            placeholder="Anything that might be relevant…"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Notes"
          />
        </Field>

        <Button
          testID="log-symptom-submit"
          label="Save symptom"
          onPress={submitSymptom}
          loading={createSymptom.isPending}
        />
      </Card>

      <SectionTitle title="Medication" />
      <Card style={styles.card}>
        <Field label="Medication name">
          <TextInput
            style={styles.input}
            value={medName}
            onChangeText={setMedName}
            placeholder="Medication name"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Medication name"
          />
        </Field>
        <Field label="Dosage">
          <TextInput
            style={styles.input}
            value={medDosage}
            onChangeText={setMedDosage}
            placeholder="Dosage (e.g. 20 drops)"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Dosage"
          />
        </Field>
        <Button
          label="Save medication"
          variant="secondary"
          onPress={submitMedication}
          loading={createMedication.isPending}
        />
      </Card>
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
  card: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textSecondary,
    overflow: 'hidden',
  },
  chipActive: { backgroundColor: colors.brand, color: colors.white, borderColor: colors.brand },
  severityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  severityDot: {
    width: 32,
    height: 32,
    lineHeight: 32,
    textAlign: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textSecondary,
    overflow: 'hidden',
  },
  severityDotActive: { backgroundColor: colors.brand, color: colors.white, borderColor: colors.brand },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
});
