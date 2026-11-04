/**
 * Log screen — record a symptom and (optionally) a medication.
 *
 * Severity is chosen with an accessible segmented control rather than a slider,
 * because sliders are hard to operate precisely with assistive tech.
 */
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import { Button, Card, ScreenHeader } from '@/components/ui';
import { useCreateMedication, useCreateSymptom } from '@/hooks/queries';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { SYMPTOM_LABELS, SYMPTOM_TYPES, SymptomType } from '@/types/api';

export function LogScreen(): React.JSX.Element {
  const [symptomType, setSymptomType] = useState<SymptomType>('bloating');
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState('');
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');

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
    <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Log" subtitle="Track how you feel today" />

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Symptom</Text>
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

        <Text style={styles.label}>Severity: {severity}/10</Text>
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

        <Text style={styles.label}>Notes (optional)</Text>
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

        <Button
          testID="log-symptom-submit"
          label="Save symptom"
          onPress={submitSymptom}
          loading={createSymptom.isPending}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Medication</Text>
        <TextInput
          style={styles.input}
          value={medName}
          onChangeText={setMedName}
          placeholder="Medication name"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Medication name"
        />
        <TextInput
          style={styles.input}
          value={medDosage}
          onChangeText={setMedDosage}
          placeholder="Dosage (e.g. 20 drops)"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Dosage"
        />
        <Button
          label="Save medication"
          variant="secondary"
          onPress={submitMedication}
          loading={createMedication.isPending}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md },
  card: { marginBottom: spacing.md },
  sectionTitle: { ...(typography.h3 as object), color: colors.textPrimary, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
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
  label: { ...(typography.bodyStrong as object), color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.sm },
  severityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
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
    marginBottom: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
});
