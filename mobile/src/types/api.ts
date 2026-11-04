/**
 * API domain types — mirror the DRF serializers on the backend.
 *
 * Kept hand-written (rather than generated) so the demo stays dependency-light,
 * but the shapes intentionally line up with the OpenAPI schema at /api/schema/.
 */

export type Role = 'patient' | 'doctor' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  consent_privacy_accepted_at: string | null;
  date_joined: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export const SYMPTOM_TYPES = [
  'abdominal_pain',
  'bloating',
  'diarrhea',
  'constipation',
  'heartburn',
  'nausea',
  'fatigue',
  'other',
] as const;

export type SymptomType = (typeof SYMPTOM_TYPES)[number];

export const SYMPTOM_LABELS: Record<SymptomType, string> = {
  abdominal_pain: 'Abdominal pain',
  bloating: 'Bloating',
  diarrhea: 'Diarrhoea',
  constipation: 'Constipation',
  heartburn: 'Heartburn',
  nausea: 'Nausea',
  fatigue: 'Fatigue',
  other: 'Other',
};

export interface SymptomEntry {
  id: string;
  symptom_type: SymptomType;
  severity: number;
  notes: string;
  recorded_at: string;
  created_at: string;
}

export interface MedicationEntry {
  id: string;
  medication_name: string;
  dosage: string;
  taken: boolean;
  recorded_at: string;
  created_at: string;
}

export interface TrendPoint {
  date: string;
  avg_severity: number;
  count: number;
}

export interface TrendResponse {
  window_days: number;
  points: TrendPoint[];
  total: number;
}

export interface SummaryResponse {
  window_days: number;
  total_entries: number;
  avg_severity: number | null;
  worst_entry: { severity: number; symptom_type: SymptomType; recorded_at: string } | null;
}

export interface TherapyProgram {
  id: string;
  slug: string;
  title: string;
  description: string;
  condition: string;
  duration_weeks: number;
  version: number;
}

export type EnrollmentStatus = 'active' | 'completed' | 'paused' | 'withdrawn';

export interface Enrollment {
  id: string;
  program: string;
  program_detail: TherapyProgram;
  status: EnrollmentStatus;
  progress_percent: number;
  started_at: string;
  completed_at: string | null;
}

export interface Paginated<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}
