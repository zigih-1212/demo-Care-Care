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
  ScrollView,
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

/**
 * Readable-width page container.
 *
 * On a desktop browser the web build stretches edge to edge, which makes short
 * clinical text look sparse and unprofessional. Constraining the content column
 * (and centring it) keeps line length comfortable and the layout intentional on
 * every screen size — a phone gets full width, a monitor gets a tidy column.
 */
export function Page({
  children,
  refreshControl,
}: {
  children: React.ReactNode;
  refreshControl?: React.ReactElement;
}): React.JSX.Element {
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      refreshControl={refreshControl}
    >
      <View style={styles.pageColumn}>{children}</View>
    </ScrollView>
  );
}

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function StatCard({
  value,
  label,
  hint,
  tone,
}: {
  value: string;
  label: string;
  hint?: string;
  tone?: 'brand' | 'neutral';
}): React.JSX.Element {
  return (
    <Card style={styles.statCard}>
      <Text style={[styles.statValue, tone === 'neutral' && styles.statValueNeutral]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </Card>
  );
}

export function ProgressBar({ percent, color }: { percent: number; color?: string }): React.JSX.Element {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View
      style={styles.progressTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
    >
      <View
        style={[
          styles.progressFill,
          { width: `${clamped}%`, backgroundColor: color ?? colors.brand },
        ]}
      />
    </View>
  );
}

export function Pill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand';
}): React.JSX.Element {
  return (
    <View style={[styles.pill, styles[`pill_${tone}` as const]]}>
      <Text style={[styles.pillText, styles[`pillText_${tone}` as const]]}>{label}</Text>
    </View>
  );
}

export function InfoBanner({
  title,
  body,
  tone = 'brand',
}: {
  title: string;
  body: string;
  tone?: 'brand' | 'warning';
}): React.JSX.Element {
  return (
    <View style={[styles.banner, tone === 'warning' && styles.bannerWarning]}>
      <Text style={styles.bannerTitle}>{title}</Text>
      <Text style={styles.bannerBody}>{body}</Text>
    </View>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
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
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pageContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  pageColumn: {
    width: '100%',
    maxWidth: 720,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...(typography.h3 as TextStyle),
    color: colors.textPrimary,
  },
  statCard: {
    flex: 1,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  statValue: {
    ...(typography.h1 as TextStyle),
    color: colors.brandDark,
  },
  statValueNeutral: {
    color: colors.textPrimary,
  },
  statLabel: {
    ...(typography.caption as TextStyle),
    color: colors.textSecondary,
  },
  statHint: {
    ...(typography.caption as TextStyle),
    color: colors.textMuted,
  },
  progressTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  pill_neutral: { backgroundColor: colors.border },
  pill_success: { backgroundColor: '#E6F4EA' },
  pill_warning: { backgroundColor: '#FDF1E3' },
  pill_danger: { backgroundColor: colors.dangerLight },
  pill_brand: { backgroundColor: colors.brandLight },
  pillText: {
    ...(typography.caption as TextStyle),
    fontWeight: '600',
  },
  pillText_neutral: { color: colors.textSecondary },
  pillText_success: { color: colors.success },
  pillText_warning: { color: colors.warning },
  pillText_danger: { color: colors.danger },
  pillText_brand: { color: colors.brandDark },
  banner: {
    backgroundColor: colors.brandLight,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  bannerWarning: {
    backgroundColor: '#FDF1E3',
  },
  bannerTitle: {
    ...(typography.bodyStrong as TextStyle),
    color: colors.textPrimary,
  },
  bannerBody: {
    ...(typography.body as TextStyle),
    color: colors.textSecondary,
  },
  field: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...(typography.bodyStrong as TextStyle),
    color: colors.textPrimary,
  },
  fieldHint: {
    ...(typography.caption as TextStyle),
    color: colors.textMuted,
  },
});
