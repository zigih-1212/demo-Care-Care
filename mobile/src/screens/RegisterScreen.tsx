/** Registration screen — creates a patient account with privacy consent. */
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button, Card } from '@/components/ui';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const schema = z.object({
  fullName: z.string().min(1, 'Please enter your name'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
});

export function RegisterScreen({ onNavigateLogin }: { onNavigateLogin: () => void }): React.JSX.Element {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(): Promise<void> {
    setError(null);
    const parsed = schema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    setLoading(true);
    try {
      await register({
        full_name: parsed.data.fullName,
        email: parsed.data.email.trim().toLowerCase(),
        password: parsed.data.password,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          We store your health data encrypted and only you (and your care team) can access it.
        </Text>

        <Card>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            testID="register-name"
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            accessibilityLabel="Full name"
          />
          <Text style={styles.label}>Email</Text>
          <TextInput
            testID="register-email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            accessibilityLabel="Email"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            testID="register-password"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            accessibilityLabel="Password"
          />
          <Text style={styles.hint}>At least 12 characters.</Text>

          {error ? (
            <Text testID="register-error" style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Button testID="register-submit" label="Create account" onPress={submit} loading={loading} />
          </View>
        </Card>

        <Text style={styles.footer}>
          Already have an account?{' '}
          <Text style={styles.link} onPress={onNavigateLogin} accessibilityRole="link">
            Sign in
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title: { ...(typography.h1 as object), color: colors.textPrimary },
  subtitle: { ...(typography.body as object), color: colors.textSecondary, marginBottom: spacing.lg },
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
  hint: { ...(typography.caption as object), color: colors.textMuted, marginBottom: spacing.sm },
  error: { color: colors.danger, marginBottom: spacing.sm },
  actions: { marginTop: spacing.sm },
  footer: { textAlign: 'center', marginTop: spacing.lg, color: colors.textSecondary },
  link: { color: colors.brand, fontWeight: '600' },
});
