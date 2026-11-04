/**
 * Administrator cockpit.
 *
 * Two jobs: see who is in the system, and read the access trail. The audit
 * trail is the point of the screen — it shows that every read of patient data
 * is accountable, which is the core privacy claim of the whole project.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState, ErrorState, Page, Pill, ScreenHeader, StatCard } from '@/components/ui';
import { useAdminUsers, useAuditLog } from '@/hooks/queries';
import type { AdminUserRow } from '@/api/endpoints';
import { colors, spacing, typography } from '@/theme/tokens';

const ROLE_TONE: Record<string, 'brand' | 'success' | 'neutral'> = {
  patient: 'neutral',
  doctor: 'brand',
  admin: 'success',
};

const ACTION_TONE: Record<string, 'brand' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  read: 'neutral',
  create: 'success',
  update: 'warning',
  delete: 'danger',
  export: 'brand',
  login: 'neutral',
  login_failed: 'danger',
};

function UsersCard(): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useAdminUsers();
  if (isLoading) return <EmptyState message="Loading accounts…" />;
  if (isError) return <ErrorState message="Could not load accounts." onRetry={refetch} />;
  const users = data ?? [];
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>Accounts</Text>
      {users.map((u: AdminUserRow) => (
        <View key={u.id} style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowName}>{u.full_name}</Text>
            <Text style={styles.rowMeta}>{u.email}</Text>
          </View>
          <Pill label={u.role} tone={ROLE_TONE[u.role] ?? 'neutral'} />
        </View>
      ))}
    </Card>
  );
}

type AuditRow = {
  id: string;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  patient: string | null;
  ip_address: string;
  request_id: string;
  created_at: string;
};

function AuditCard(): React.JSX.Element {
  const { data, isLoading, isError, refetch } = useAuditLog();
  if (isLoading) return <EmptyState message="Loading audit trail…" />;
  if (isError) return <ErrorState message="Could not load the audit trail." onRetry={refetch} />;
  const rows = (data ?? []) as AuditRow[];
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>Access trail</Text>
      <Text style={styles.cardHint}>Append-only: entries can be read but never edited or deleted.</Text>
      {rows.map((r) => (
        <View key={r.id} style={styles.auditRow}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowName}>
              {r.resource_type}
              {r.patient ? ' · patient record' : ''}
            </Text>
            <Text style={styles.rowMeta}>
              {r.actor_email} · {new Date(r.created_at).toLocaleString()}
            </Text>
            <Text style={styles.rowMono}>{r.request_id}</Text>
          </View>
          <Pill label={r.action} tone={ACTION_TONE[r.action] ?? 'neutral'} />
        </View>
      ))}
    </Card>
  );
}

export function AdminScreen(): React.JSX.Element {
  const { data: users } = useAdminUsers();
  const { data: audit } = useAuditLog();
  const patientCount = (users ?? []).filter((u) => u.role === 'patient').length;
  const staffCount = (users ?? []).filter((u) => u.role !== 'patient').length;

  return (
    <Page>
      <ScreenHeader
        title="Administration"
        subtitle="Who is in the system, and who touched which record."
      />
      <View style={styles.statsRow}>
        <StatCard value={String(patientCount)} label="Patients" tone="neutral" />
        <StatCard value={String(staffCount)} label="Staff accounts" tone="brand" />
        <StatCard value={String((audit ?? []).length)} label="Audit entries" tone="neutral" />
      </View>
      <UsersCard />
      <AuditCard />
    </Page>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: {
    ...(typography.h3 as object),
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardHint: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    ...(typography.bodyStrong as object),
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  rowMeta: {
    ...(typography.caption as object),
    color: colors.textSecondary,
  },
  rowMono: {
    ...(typography.caption as object),
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
});
