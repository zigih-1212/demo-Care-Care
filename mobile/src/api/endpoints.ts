/**
 * Typed API endpoint wrappers. Screens/query hooks call these, never `http`
 * directly, so request shapes live in one place and stay easy to mock in tests.
 *
 * When demo mode is on (the Cloudflare Pages build), each namespace is served
 * by the in-browser transport in `src/demo/demoApi.ts` instead of the network.
 */
import { http } from '@/api/client';
import { isDemoMode } from '@/demo/mode';
import {
  demoAdminApi,
  demoAuthApi,
  demoPatientsApi,
  demoTherapyApi,
  demoTrackingApi,
  type AdminUserRow,
  type RosterEntry,
} from '@/demo/demoApi';
import type { DemoPatientRecord } from '@/demo/demoData';
import type {
  Enrollment,
  MedicationEntry,
  Paginated,
  SummaryResponse,
  SymptomEntry,
  TherapyProgram,
  TokenPair,
  TrendResponse,
  User,
} from '@/types/api';

const DEMO = isDemoMode();

export const authApi = DEMO
  ? demoAuthApi
  : {
      async login(email: string, password: string): Promise<TokenPair> {
        const { data } = await http.post<TokenPair>('/api/v1/auth/login/', { email, password });
        return data;
      },
      async register(input: { email: string; password: string; full_name: string }): Promise<User> {
        const { data } = await http.post<User>('/api/v1/auth/register/', input);
        return data;
      },
      async me(): Promise<User> {
        const { data } = await http.get<User>('/api/v1/auth/me/');
        return data;
      },
      async acceptConsent(): Promise<User> {
        const { data } = await http.post<User>('/api/v1/auth/consent/', {
          accept_privacy_policy: true,
        });
        return data;
      },
      async logout(refresh: string): Promise<void> {
        await http.post('/api/v1/auth/logout/', { refresh });
      },
    };

export interface SymptomListParams {
  days?: number;
  symptom_type?: string;
  patient?: string;
}

export const trackingApi = DEMO
  ? demoTrackingApi
  : {
      async listSymptoms(params: SymptomListParams = {}): Promise<Paginated<SymptomEntry>> {
        const { data } = await http.get<Paginated<SymptomEntry>>('/api/v1/tracking/symptoms/', {
          params,
        });
        return data;
      },
      async createSymptom(input: {
        symptom_type: string;
        severity: number;
        notes?: string;
        recorded_at: string;
      }): Promise<SymptomEntry> {
        const { data } = await http.post<SymptomEntry>('/api/v1/tracking/symptoms/', input);
        return data;
      },
      async deleteSymptom(id: string): Promise<void> {
        await http.delete(`/api/v1/tracking/symptoms/${id}/`);
      },
      async trend(days = 30, symptomType?: string): Promise<TrendResponse> {
        const { data } = await http.get<TrendResponse>('/api/v1/tracking/symptoms/trend/', {
          params: { days, symptom_type: symptomType },
        });
        return data;
      },
      async summary(days = 30): Promise<SummaryResponse> {
        const { data } = await http.get<SummaryResponse>('/api/v1/tracking/symptoms/summary/', {
          params: { days },
        });
        return data;
      },
      async listMedications(): Promise<Paginated<MedicationEntry>> {
        const { data } = await http.get<Paginated<MedicationEntry>>('/api/v1/tracking/medications/');
        return data;
      },
      async createMedication(input: {
        medication_name: string;
        dosage: string;
        taken: boolean;
        recorded_at: string;
      }): Promise<MedicationEntry> {
        const { data } = await http.post<MedicationEntry>('/api/v1/tracking/medications/', input);
        return data;
      },
    };

export const therapyApi = DEMO
  ? demoTherapyApi
  : {
      async listPrograms(): Promise<Paginated<TherapyProgram>> {
        const { data } = await http.get<Paginated<TherapyProgram>>('/api/v1/therapy/programs/');
        return data;
      },
      async listEnrollments(): Promise<Paginated<Enrollment>> {
        const { data } = await http.get<Paginated<Enrollment>>('/api/v1/therapy/enrollments/');
        return data;
      },
      async enroll(programId: string): Promise<Enrollment> {
        const { data } = await http.post<Enrollment>('/api/v1/therapy/enrollments/', {
          program: programId,
        });
        return data;
      },
      async complete(enrollmentId: string): Promise<Enrollment> {
        const { data } = await http.post<Enrollment>(
          `/api/v1/therapy/enrollments/${enrollmentId}/complete/`,
          {},
        );
        return data;
      },
    };

/** Clinician: the patients under the signed-in clinician's care. */
export const patientsApi = DEMO
  ? demoPatientsApi
  : {
      async roster(): Promise<RosterEntry[]> {
        const { data } = await http.get<RosterEntry[]>('/api/v1/patients/roster/');
        return data;
      },
      async get(id: string): Promise<DemoPatientRecord> {
        const { data } = await http.get<DemoPatientRecord>(`/api/v1/patients/${id}/`);
        return data;
      },
    };

/** Admin: user administration and the audit trail. */
export const adminApi = DEMO
  ? demoAdminApi
  : {
      async listUsers(): Promise<AdminUserRow[]> {
        const { data } = await http.get<AdminUserRow[]>('/api/v1/auth/users/');
        return data;
      },
      async listAudit() {
        const { data } = await http.get('/api/v1/audit/logs/');
        return (data as { results: unknown[] }).results;
      },
    };

export type { AdminUserRow, RosterEntry };
