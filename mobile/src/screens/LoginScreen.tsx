/**
 * Login screen.
 *
 * Uses controlled inputs + client-side validation (zod) before hitting the API,
 * and renders server errors (including the unified error envelope) inline.
 *
 * In demo mode a role switcher is shown so a reviewer can enter the app as a
 * patient, clinician or administrator in one tap — this is the fastest way to
 * see that the three roles genuinely get different experiences.
 */
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button, Card, Pill } from '@/components/ui';
import { DEMO_ACCOUNT_LIST, DEMO_PASSWORD } from '@/demo/demoData';
import { isDemoMode } from '@/demo/mode';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export function LoginScreen({ onNavigateRegister }: { onNavigateRegister: () => void }): React.JSX.Element {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quickRole, setQuickRole] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setError(null);
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    setLoading(true);
    try {
      await login(parsed.data.email.trim().toLowerCase(), parsed.data.password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(roleEmail: string, role: string): Promise<void> {
    setError(null);
    setQuickRole(role);
    try {
      await login(roleEmail, DEMO_PASSWORD);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setQuickRole(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <Text style={styles.brand}>Cara Care</Text>
          <Text style={styles.tagline}>Your digestive health companion</Text>

          <Card>
            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="login-email"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Email"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              testID="login-password"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="Your password"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Password"
            />

            {error ? (
              <Text testID="login-error" style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <Button testID="login-submit" label="Sign in" onPress={submit} loading={loading} />
            </View>
          </Card>

          {isDemoMode() ? (
            <Card style={styles.demoCard}>
              <View style={styles.demoHeader}>
                <Text style={styles.demoTitle}>Try it as…</Text>
                <Pill label="demo" tone="brand" />
              </View>
              <Text style={styles.demoHint}>
                Explore the three roles. No account needed — the demo data is built in.
              </Text>
              {DEMO_ACCOUNT_LIST.map((account) => (
                <View key={account.role} style={styles.roleRow}>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleName}>{account.headline}</Text>
                    <Text style={styles.roleDesc}>{account.description}</Text>
                  </View>
                  <Button
                    testID={`quick-login-${account.role}`}
                    label="Open"
                    variant="secondary"
                    loading={quickRole === account.role}
                    onPress={() => quickLogin(account.user.email, account.role)}
                  />
                </View>
              ))}
            </Card>
          ) : null}

          <Text style={styles.footer}>
            New here?{' '}
            <Text style={styles.link} onPress={onNavigateRegister} accessibilityRole="link">
              Create an account
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  column: { width: '100%', maxWidth: 480 },
  brand: { ...(typography.h1 as object), color: colors.brand, textAlign: 'center' },
  tagline: {
    ...(typography.body as object),
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  label: { ...(typography.bodyStrong as object), color: colors.textPrimary, marginBottom: spacing.xs },
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
  error: { color: colors.danger, marginBottom: spacing.sm },
  actions: { marginTop: spacing.sm },
  footer: { textAlign: 'center', marginTop: spacing.lg, color: colors.textSecondary },
  link: { color: colors.brand, fontWeight: '600' },
  demoCard: { marginTop: spacing.md, gap: spacing.sm },
  demoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  demoTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  demoHint: { ...(typography.caption as object), color: colors.textSecondary },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  roleInfo: { flex: 1, gap: 2 },
  roleName: { ...(typography.bodyStrong as object), color: colors.textPrimary },
  roleDesc: { ...(typography.caption as object), color: colors.textMuted },
});
