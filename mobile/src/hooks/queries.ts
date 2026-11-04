/**
 * Server-state hooks built on TanStack Query.
 *
 * Centralising cache keys and invalidation here means screens never guess at
 * what to refetch after a mutation — a common source of stale UI bugs.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi, patientsApi, therapyApi, trackingApi, SymptomListParams } from '@/api/endpoints';
import type { MedicationEntry, SymptomEntry } from '@/types/api';

export const queryKeys = {
  symptoms: (params: SymptomListParams = {}) => ['symptoms', params] as const,
  trend: (days: number, type?: string) => ['trend', days, type ?? 'all'] as const,
  summary: (days: number) => ['summary', days] as const,
  medications: () => ['medications'] as const,
  programs: () => ['programs'] as const,
  enrollments: () => ['enrollments'] as const,
  roster: () => ['roster'] as const,
  patient: (id: string) => ['patient', id] as const,
  adminUsers: () => ['adminUsers'] as const,
  auditLog: () => ['auditLog'] as const,
};

export function useSymptoms(params: SymptomListParams = {}) {
  return useQuery({
    queryKey: queryKeys.symptoms(params),
    queryFn: () => trackingApi.listSymptoms(params),
  });
}

export function useTrend(days = 30, symptomType?: string) {
  return useQuery({
    queryKey: queryKeys.trend(days, symptomType),
    queryFn: () => trackingApi.trend(days, symptomType),
  });
}

export function useSummary(days = 30) {
  return useQuery({
    queryKey: queryKeys.summary(days),
    queryFn: () => trackingApi.summary(days),
  });
}

export function useCreateSymptom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof trackingApi.createSymptom>[0]) =>
      trackingApi.createSymptom(input),
    onSuccess: (_created: SymptomEntry) => {
      qc.invalidateQueries({ queryKey: ['symptoms'] });
      qc.invalidateQueries({ queryKey: ['trend'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

export function useDeleteSymptom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => trackingApi.deleteSymptom(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['symptoms'] });
      qc.invalidateQueries({ queryKey: ['trend'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

export function useMedications() {
  return useQuery({ queryKey: queryKeys.medications(), queryFn: () => trackingApi.listMedications() });
}

export function useCreateMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof trackingApi.createMedication>[0]) =>
      trackingApi.createMedication(input),
    onSuccess: (_created: MedicationEntry) => {
      qc.invalidateQueries({ queryKey: queryKeys.medications() });
    },
  });
}

export function usePrograms() {
  return useQuery({ queryKey: queryKeys.programs(), queryFn: () => therapyApi.listPrograms() });
}

export function useEnrollments() {
  return useQuery({ queryKey: queryKeys.enrollments(), queryFn: () => therapyApi.listEnrollments() });
}

export function useEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (programId: string) => therapyApi.enroll(programId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.enrollments() }),
  });
}

export function useCompleteEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: string) => therapyApi.complete(enrollmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.enrollments() }),
  });
}

export function useRoster() {
  return useQuery({ queryKey: queryKeys.roster(), queryFn: () => patientsApi.roster() });
}

export function usePatient(id: string | null) {
  return useQuery({
    queryKey: queryKeys.patient(id ?? 'none'),
    queryFn: () => patientsApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useAdminUsers() {
  return useQuery({ queryKey: queryKeys.adminUsers(), queryFn: () => adminApi.listUsers() });
}

export function useAuditLog() {
  return useQuery({ queryKey: queryKeys.auditLog(), queryFn: () => adminApi.listAudit() });
}
