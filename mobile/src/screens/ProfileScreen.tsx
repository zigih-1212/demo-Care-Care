/** Profile screen — account details, privacy consent, and sign-out. */
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { Button, Card, ScreenHeader } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

export function ProfileScreen(): React.JSX.Element {
  const { user, logout, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);

  async function acceptConsent(): Promise<void> {
    setSaving(true);
    try {
      await authApi.acceptConsent();
      await refreshUser();
    } catch (err) {
      Alert.alert('Could not save', err instanceof ApiError ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <ScreenHeader title="Profile" subtitle="Account & privacy" />

      <Card style={styles.card}>
        <Row label="Name" value={user?.full_name ?? '—'} />
        <Row label="Email" value={user?.email ?? '—'} />
        <Row label="Role" value={user?.role ?? '—'} />
        <Row label="Member since" value={user ? new Date(user.date_joined).toLocaleDateString() : '—'} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Privacy consent</Text>
        {user?.consent_privacy_accepted_at ? (
          <Text style={styles.consented}>
            Accepted on {new Date(user.consent_privacy_accepted_at).toLocaleDateString()}
          </Text>
        ) : (
          <>
            <Text style={styles.body}>
              To use Cara Care you must consent to our processing of your health data in line with
              GDPR and MDR requirements.
            </Text>
            <View style={styles.action}>
              <Button label="I consent" onPress={acceptConsent} loading={saving} />
            </View>
          </>
        )}
      </Card>

      <Button label="Sign out" variant="danger" onPress={() => void logout()} />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md },
  card: { marginBottom: spacing.md },
  sectionTitle: { ...(typography.h3 as object), color: colors.textPrimary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, gap: spacing.md },
  rowLabel: { ...(typography.body as object), color: colors.textSecondary },
  rowValue: { ...(typography.bodyStrong as object), color: colors.textPrimary, flexShrink: 1, textTransform: 'capitalize' },
  body: { ...(typography.body as object), color: colors.textSecondary },
  consented: { ...(typography.body as object), color: colors.success },
  action: { marginTop: spacing.md },
});
