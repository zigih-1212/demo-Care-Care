/**
 * Small, reusable presentational primitives.
 *
 * Deliberately dependency-free (no UI kit) so the design system in
 * `theme/tokens.ts` is the single source of visual truth.
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radii, shadow, spacing, typography } from '@/theme/tokens';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  testID,
}: ButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        (pressed || isDisabled) && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.brand : colors.white} />
      ) : (
        <Text style={[styles.buttonLabel, variant === 'secondary' && styles.buttonLabelSecondary]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}): React.JSX.Element {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ScreenHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}): React.JSX.Element {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function EmptyState({ message }: { message: string }): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyText, { color: colors.danger }]}>{message}</Text>
      {onRetry ? (
        <View style={{ marginTop: spacing.md }}>
          <Button label="Try again" onPress={onRetry} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

export function SeverityBadge({ severity }: { severity: number }): React.JSX.Element {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{severity}/10</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonSecondary: {
    backgroundColor: colors.brandLight,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonLabel: {
    ...(typography.bodyStrong as TextStyle),
    color: colors.white,
  },
  buttonLabelSecondary: {
    color: colors.brandDark,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  header: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...(typography.h1 as TextStyle),
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...(typography.body as TextStyle),
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...(typography.body as TextStyle),
    color: colors.textMuted,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: colors.brandLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  badgeText: {
    ...(typography.caption as TextStyle),
    color: colors.brandDark,
    fontWeight: '600',
  },
});
