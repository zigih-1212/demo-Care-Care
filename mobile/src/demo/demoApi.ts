/**
 * In-browser demo transport.
 *
 * Exposes the same method surface as `src/api/endpoints.ts`, but answers from
 * `demoData.ts` instead of the network. `endpoints.ts` chooses between the two
 * based on `isDemoMode()`, so screens and hooks never know which is active.
 *
 * A little mutable state is kept so demo actions (logging a symptom, enrolling)
 * visibly update the UI, exactly as they would against the real API.
 */
import type {
  Enrollment,
  MedicationEntry,
  Role,
  SummaryResponse,
  SymptomEntry,
  TherapyProgram,
  TokenPair,
  TrendResponse,
  User,
} from '@/types/api';

import {
  DEMO_ACCOUNTS,
  DEMO_ENROLLMENTS,
  DEMO_PATIENTS,
  DEMO_PROGRAMS,
  buildAuditTrail,
  computeSummary,
  computeTrend,
  type DemoAuditEntry,
  type DemoPatientRecord,
} from '@/demo/demoData';

let currentRole: Role = 'patient';

const symptomStore: SymptomEntry[] = DEMO_PATIENTS[0]!.entries;
const medicationStore: MedicationEntry[] = DEMO_PATIENTS[0]!.medications;
const enrollmentStore: Enrollment[] = [...DEMO_ENROLLMENTS];

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const nowIso = (): string => new Date().toISOString();

export const demoAuthApi = {
  async login(email: string): Promise<TokenPair> {
    const account = Object.values(DEMO_ACCOUNTS).find(
      (a) => a.user.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!account) throw new Error('no such demo account');
    currentRole = account.role;
    // Opaque, non-cryptographic stand-ins: nothing here is a real credential.
    return { access: `demo-access-${account.role}`, refresh: `demo-refresh-${account.role}` };
  },

  async register(input: { email: string; password: string; full_name: string }): Promise<User> {
    currentRole = 'patient';
    return {
      id: uid('user'),
      email: input.email,
      full_name: input.full_name,
      role: 'patient',
      is_active: true,
      consent_privacy_accepted_at: null,
      date_joined: nowIso(),
    };
  },

  async me(): Promise<User> {
    return DEMO_ACCOUNTS[currentRole].user;
  },

  async acceptConsent(): Promise<User> {
    const user = { ...DEMO_ACCOUNTS[currentRole].user, consent_privacy_accepted_at: nowIso() };
    (DEMO_ACCOUNTS[currentRole] as { user: User }).user = user;
    return user;
  },

  async logout(): Promise<void> {
    /* nothing to revoke in the demo */
  },
};

export interface SymptomListParams {
  days?: number;
  symptom_type?: string;
  patient?: string;
}

export const demoTrackingApi = {
  async listSymptoms(params: SymptomListParams = {}) {
    const cutoff = Date.now() - (params.days ?? 90) * 24 * 60 * 60 * 1000;
    const results = symptomStore
      .filter((e) => new Date(e.recorded_at).getTime() >= cutoff)
      .filter((e) => !params.symptom_type || e.symptom_type === params.symptom_type)
      .sort((a, b) => (a.recorded_at < b.recorded_at ? 1 : -1));
    return { next: null, previous: null, results };
  },

  async createSymptom(input: {
    symptom_type: SymptomEntry['symptom_type'];
    severity: number;
    notes?: string;
    recorded_at: string;
  }): Promise<SymptomEntry> {
    const entry: SymptomEntry = {
      id: uid('sym'),
      symptom_type: input.symptom_type,
      severity: input.severity,
      notes: input.notes ?? '',
      recorded_at: input.recorded_at,
      created_at: nowIso(),
    };
    symptomStore.push(entry);
    return entry;
  },

  async deleteSymptom(id: string): Promise<void> {
    const i = symptomStore.findIndex((e) => e.id === id);
    if (i >= 0) symptomStore.splice(i, 1);
  },

  async trend(days = 30, symptomType?: string): Promise<TrendResponse> {
    return computeTrend(symptomStore, days, symptomType);
  },

  async summary(days = 30): Promise<SummaryResponse> {
    return computeSummary(symptomStore, days);
  },

  async listMedications() {
    return { next: null, previous: null, results: medicationStore };
  },

  async createMedication(input: {
    medication_name: string;
    dosage: string;
    taken: boolean;
    recorded_at: string;
  }): Promise<MedicationEntry> {
    const entry: MedicationEntry = {
      id: uid('med'),
      medication_name: input.medication_name,
      dosage: input.dosage,
      taken: input.taken,
      recorded_at: input.recorded_at,
      created_at: nowIso(),
    };
    medicationStore.push(entry);
    return entry;
  },
};

export const demoTherapyApi = {
  async listPrograms() {
    return { next: null, previous: null, results: DEMO_PROGRAMS };
  },

  async listEnrollments() {
    return { next: null, previous: null, results: enrollmentStore };
  },

  async enroll(programId: string): Promise<Enrollment> {
    const program = DEMO_PROGRAMS.find((p) => p.id === programId) as TherapyProgram;
    const enrollment: Enrollment = {
      id: uid('enr'),
      program: programId,
      program_detail: program,
      status: 'active',
      progress_percent: 0,
      started_at: nowIso(),
      completed_at: null,
    };
    enrollmentStore.push(enrollment);
    return enrollment;
  },

  async complete(enrollmentId: string): Promise<Enrollment> {
    const enrollment = enrollmentStore.find((e) => e.id === enrollmentId);
    if (!enrollment) throw new Error('enrollment not found');
    enrollment.status = 'completed';
    enrollment.progress_percent = 100;
    enrollment.completed_at = nowIso();
    return enrollment;
  },
};

// --- Clinician roster -------------------------------------------------------

export interface RosterEntry {
  id: string;
  full_name: string;
  email: string;
  primary_condition: string;
  entries_30d: number;
  avg_severity_30d: number | null;
  last_recorded_at: string | null;
}

function rosterFor(record: DemoPatientRecord): RosterEntry {
  const summary = computeSummary(record.entries, 30);
  const last = [...record.entries].sort((a, b) => (a.recorded_at < b.recorded_at ? 1 : -1))[0];
  return {
    id: record.id,
    full_name: record.full_name,
    email: record.email,
    primary_condition: record.primary_condition,
    entries_30d: summary.total_entries,
    avg_severity_30d: summary.avg_severity,
    last_recorded_at: last?.recorded_at ?? null,
  };
}

export const demoPatientsApi = {
  async roster(): Promise<RosterEntry[]> {
    return DEMO_PATIENTS.map(rosterFor);
  },

  async get(id: string): Promise<DemoPatientRecord> {
    const record = DEMO_PATIENTS.find((p) => p.id === id);
    if (!record) throw new Error('patient not found');
    return record;
  },
};

// --- Admin ------------------------------------------------------------------

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  date_joined: string;
}

export const demoAdminApi = {
  async listUsers(): Promise<AdminUserRow[]> {
    return [
      ...DEMO_PATIENTS.map((p, i) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: 'patient' as Role,
        is_active: true,
        date_joined: new Date(Date.now() - (30 + i * 12) * 86400000).toISOString(),
      })),
      {
        id: DEMO_ACCOUNTS.doctor.user.id,
        email: DEMO_ACCOUNTS.doctor.user.email,
        full_name: DEMO_ACCOUNTS.doctor.user.full_name,
        role: 'doctor' as Role,
        is_active: true,
        date_joined: DEMO_ACCOUNTS.doctor.user.date_joined,
      },
      {
        id: DEMO_ACCOUNTS.admin.user.id,
        email: DEMO_ACCOUNTS.admin.user.email,
        full_name: DEMO_ACCOUNTS.admin.user.full_name,
        role: 'admin' as Role,
        is_active: true,
        date_joined: DEMO_ACCOUNTS.admin.user.date_joined,
      },
    ];
  },

  async listAudit(): Promise<DemoAuditEntry[]> {
    return buildAuditTrail();
  },
};
