/**
 * Design tokens — a single source of truth for spacing, colour and typography.
 *
 * Components must never hard-code hex values or pixel spacing; they import from
 * here. This keeps the app visually consistent and makes theme changes a
 * one-file edit (the design-system principle the role expects).
 */

export const colors = {
  // Brand — a calm clinical teal, accessible on white (contrast >= 4.5:1).
  brand: '#0E7C7B',
  brandDark: '#0A5C5B',
  brandLight: '#E6F4F3',

  // Semantic severity scale (green -> red) used for symptom intensity.
  severityLow: '#2E7D32',
  severityMedium: '#ED6C02',
  severityHigh: '#C62828',

  // Neutrals
  background: '#F7F9FA',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#1A202C',
  textSecondary: '#4A5568',
  textMuted: '#94A3B8',

  // States
  danger: '#C62828',
  dangerLight: '#FDECEA',
  success: '#2E7D32',
  warning: '#ED6C02',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.4)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

/** Map a 0–10 severity onto a semantic colour band. */
export function severityColor(severity: number): string {
  if (severity <= 3) return colors.severityLow;
  if (severity <= 6) return colors.severityMedium;
  return colors.severityHigh;
}
