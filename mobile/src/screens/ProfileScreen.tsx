/**
 * Profile screen — account details, privacy consent, and sign out.
 */
import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button, Card, Page, Pill, SectionTitle } from '@/components/ui';
import { useOnboarding } from '@/onboarding/useOnboarding';
import { colors, spacing, typography } from '@/theme/tokens';

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.k}>{label}</Text>
      <Text style={styles.v}>{value}</Text>
    </View>
  );
}

export function ProfileScreen(): React.JSX.Element {
  const { user, logout, refreshUser } = useAuth();
  const { reset } = useOnboarding();
  const [busy, setBusy] = React.useState(false);

  async function acceptConsent(): Promise<void> {
    setBusy(true);
    try {
      await refreshUser();
    } catch (err) {
      Alert.alert('Could not update', err instanceof ApiError ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!user) return <Page>{<View />}</Page>;

  return (
    <Page>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Your account and privacy settings.</Text>

      <SectionTitle title="Account" />
      <Card style={styles.card}>
        <Row label="Name" value={user.full_name} />
        <Row label="Email" value={user.email} />
        <Row label="Role" value={user.role} />
        <Row label="Member since" value={new Date(user.date_joined).toLocaleDateString()} />
      </Card>

      <SectionTitle title="Privacy" />
      <Card style={styles.card}>
        {user.consent_privacy_accepted_at ? (
          <>
            <View style={styles.consentRow}>
              <Text style={styles.body}>
                Privacy notice accepted on{' '}
                {new Date(user.consent_privacy_accepted_at).toLocaleDateString()}.
              </Text>
              <Pill label="accepted" tone="success" />
            </View>
            <Text style={styles.hint}>
              Your symptom data is private: only you and the clinicians actively caring for you can
              see it, and every access is written to an audit trail.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.body}>
              We store your symptom history to show your trends. Only you and your active care team
              can see it.
            </Text>
            <View style={styles.action}>
              <Button label="I accept the privacy notice" onPress={acceptConsent} loading={busy} />
            </View>
          </>
        )}
      </Card>

      <SectionTitle title="App" />
      <Card style={styles.card}>
        <Text style={styles.body}>Replay the getting-started checklist on your home screen.</Text>
        <View style={styles.action}>
          <Button
            label="Reset onboarding"
            variant="secondary"
            onPress={() => {
              reset();
              Alert.alert('Onboarding reset', 'Open the home screen to see the checklist again.');
            }}
          />
        </View>
      </Card>

      <View style={styles.signout}>
        <Button label="Sign out" variant="danger" onPress={() => void logout()} />
      </View>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  k: { ...(typography.body as object), color: colors.textSecondary },
  v: { ...(typography.bodyStrong as object), color: colors.textPrimary, textTransform: 'capitalize', flexShrink: 1, textAlign: 'right' },
  body: { ...(typography.body as object), color: colors.textSecondary, flex: 1 },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hint: { ...(typography.caption as object), color: colors.textMuted, marginTop: spacing.xs },
  action: { marginTop: spacing.sm },
  signout: { marginTop: spacing.lg },
});
