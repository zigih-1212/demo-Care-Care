/**
 * Login screen.
 *
 * Uses controlled inputs + client-side validation (zod) before hitting the API,
 * and renders server errors (including the unified error envelope) inline.
 */
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button, Card } from '@/components/ui';
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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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

        <Text style={styles.footer}>
          New here?{' '}
          <Text style={styles.link} onPress={onNavigateRegister} accessibilityRole="link">
            Create an account
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1, justifyContent: 'center' },
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
});
