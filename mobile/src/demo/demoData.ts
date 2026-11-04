/**
 * Demo dataset for the static (Cloudflare Pages) build.
 *
 * The published site has no backend: this module is the in-browser stand-in.
 * It is deterministic (seeded RNG) so every visitor sees the same coherent
 * story, and it structures data exactly like the DRF serializers so the demo
 * transport and the real HTTP transport are interchangeable.
 *
 * Numbers here are synthetic and contain no real patient data.
 */
import type {
  Enrollment,
  MedicationEntry,
  Role,
  SummaryResponse,
  SymptomEntry,
  SymptomType,
  TherapyProgram,
  TrendPoint,
  TrendResponse,
  User,
} from '@/types/api';

/** Small deterministic PRNG (mulberry32) — same output on every device. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function iso(daysAgo: number, hour = 9, minute = 0): string {
  const d = new Date(Date.now() - daysAgo * DAY_MS);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const DEMO_PASSWORD = 'Demo-Passw0rd!23';

export interface DemoAccount {
  role: Role;
  user: User;
  headline: string;
  description: string;
}

function makeUser(
  id: string,
  email: string,
  fullName: string,
  role: Role,
  joinedDaysAgo: number,
): User {
  return {
    id,
    email,
    full_name: fullName,
    role,
    is_active: true,
    consent_privacy_accepted_at: iso(joinedDaysAgo - 1, 18),
    date_joined: iso(joinedDaysAgo, 10),
  };
}

export const DEMO_ACCOUNTS: Record<Role, DemoAccount> = {
  patient: {
    role: 'patient',
    headline: 'Patient',
    description: 'Follow your diary, see trends, work through a therapy program.',
    user: makeUser('11111111-1111-4111-8111-111111111111', 'patient@demo.carecare', 'Mia Schmidt', 'patient', 45),
  },
  doctor: {
    role: 'doctor',
    headline: 'Clinician',
    description: 'Review the patients under your care and their reported symptoms.',
    user: makeUser('22222222-2222-4222-8222-222222222222', 'doctor@demo.carecare', 'Dr. Anna Weber', 'doctor', 400),
  },
  admin: {
    role: 'admin',
    headline: 'Administrator',
    description: 'Inspect the audit trail and manage the accounts in the system.',
    user: makeUser('33333333-3333-4333-8333-333333333333', 'admin@demo.carecare', 'Demo Admin', 'admin', 420),
  },
};

export const DEMO_ACCOUNT_LIST: DemoAccount[] = [
  DEMO_ACCOUNTS.patient,
  DEMO_ACCOUNTS.doctor,
  DEMO_ACCOUNTS.admin,
];

/** Program catalogue — mirrors the seeded TherapyProgram rows on the backend. */
export const DEMO_PROGRAMS: TherapyProgram[] = [
  {
    id: 'prg-lowfodmap',
    slug: 'low-fodmap-8w',
    title: 'Low-FODMAP elimination & reintroduction',
    description:
      'An 8-week structured plan: two weeks of elimination, then guided reintroduction to find your trigger foods.',
    condition: 'IBS',
    duration_weeks: 8,
    version: 1,
  },
  {
    id: 'prg-gutrelax',
    slug: 'gut-directed-relaxation',
    title: 'Gut-directed relaxation training',
    description:
      'Daily breathing and mindfulness exercises that calm the gut-brain axis and reduce symptom flare-ups.',
    condition: 'IBS',
    duration_weeks: 6,
    version: 1,
  },
  {
    id: 'prg-gerd',
    slug: 'gerd-lifestyle-4w',
    title: 'GERD lifestyle & reflux management',
    description:
      'Practical habits around meals, sleep and posture that reduce reflux episodes over four weeks.',
    condition: 'GERD',
    duration_weeks: 4,
    version: 1,
  },
];

/**
 * Patient roster. The primary demo patient is Mia Schmidt (the signed-in
 * patient). The clinician sees this whole roster because they are all linked by
 * an active care relationship in the demo dataset.
 */
export interface DemoPatientRecord {
  id: string;
  full_name: string;
  email: string;
  date_of_birth: string;
  sex: string;
  country: string;
  primary_condition: string;
  entries: SymptomEntry[];
  medications: MedicationEntry[];
}

const CONDITIONS: Array<{ name: string; email: string; condition: string; seed: number }> = [
  { name: 'Mia Schmidt', email: 'patient@demo.carecare', condition: 'IBS', seed: 42 },
  { name: 'Lukas Hoffmann', email: 'lukas.hoffmann@demo.carecare', condition: 'GERD', seed: 7 },
  { name: 'Sofia Petrova', email: 'sofia.petrova@demo.carecare', condition: 'IBS', seed: 19 },
  { name: 'Jonas Klein', email: 'jonas.klein@demo.carecare', condition: 'IBS', seed: 88 },
  { name: 'Amelie Richter', email: 'amelie.richter@demo.carecare', condition: 'GERD', seed: 133 },
];

const SYMPTOMS_BY_CONDITION: Record<string, SymptomType[]> = {
  IBS: ['abdominal_pain', 'bloating', 'diarrhea', 'constipation'],
  GERD: ['heartburn', 'nausea', 'bloating'],
};

function pid(index: number): string {
  return `4444444${index}-4444-4444-8444-444444444444`;
}

/** 45 days of symptom history trending gently down for each patient. */
function buildEntries(seed: number, condition: string): SymptomEntry[] {
  const rng = mulberry32(seed);
  const pool: SymptomType[] = SYMPTOMS_BY_CONDITION[condition] ?? SYMPTOMS_BY_CONDITION.IBS ?? ['bloating'];
  const entries: SymptomEntry[] = [];
  for (let day = 44; day >= 0; day -= 1) {
    const perDay = rng() < 0.35 ? 2 : 1;
    for (let k = 0; k < perDay; k += 1) {
      const base = Math.max(1, 8 - Math.floor(day / 8));
      const severity = Math.min(10, Math.max(1, Math.round(base + (rng() * 4 - 2))));
      const type = pool[Math.floor(rng() * pool.length)] ?? 'bloating';
      entries.push({
        id: `sym-${seed}-${day}-${k}`,
        symptom_type: type,
        severity,
        notes: '',
        recorded_at: iso(day, 8 + k * 6, Math.floor(rng() * 50)),
        created_at: iso(day, 8 + k * 6, Math.floor(rng() * 50)),
      });
    }
  }
  return entries;
}

export const DEMO_PATIENTS: DemoPatientRecord[] = CONDITIONS.map((c, index) => ({
  id: pid(index + 1),
  full_name: c.name,
  email: c.email,
  date_of_birth: iso(365 * (28 + index), 0),
  sex: index % 2 === 0 ? 'female' : 'male',
  country: 'DE',
  primary_condition: c.condition,
  entries: buildEntries(c.seed, c.condition),
  medications:
    c.condition === 'IBS'
      ? [
          {
            id: `med-${index}-1`,
            medication_name: 'Mebeverine',
            dosage: '135 mg',
            taken: true,
            recorded_at: iso(1, 8),
            created_at: iso(1, 8),
          },
          {
            id: `med-${index}-2`,
            medication_name: 'Simethicone',
            dosage: '40 mg',
            taken: true,
            recorded_at: iso(3, 20),
            created_at: iso(3, 20),
          },
        ]
      : [
          {
            id: `med-${index}-3`,
            medication_name: 'Pantoprazole',
            dosage: '20 mg',
            taken: true,
            recorded_at: iso(1, 7),
            created_at: iso(1, 7),
          },
        ],
}));

export const DEMO_ENROLLMENTS: Enrollment[] = [
  {
    id: 'enr-1',
    program: DEMO_PROGRAMS[0]!.id,
    program_detail: DEMO_PROGRAMS[0]!,
    status: 'active',
    progress_percent: 35,
    started_at: iso(21, 10),
    completed_at: null,
  },
  {
    id: 'enr-2',
    program: DEMO_PROGRAMS[1]!.id,
    program_detail: DEMO_PROGRAMS[1]!,
    status: 'active',
    progress_percent: 0,
    started_at: iso(8, 10),
    completed_at: null,
  },
];

export interface DemoAuditEntry {
  id: string;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  patient: string | null;
  ip_address: string;
  request_id: string;
  created_at: string;
}

/** A short, believable audit trail for the admin view. */
export function buildAuditTrail(): DemoAuditEntry[] {
  const actions: Array<[string, string]> = [
    ['read', 'patient'],
    ['update', 'symptom_entry'],
    ['create', 'symptom_entry'],
    ['login', 'session'],
    ['read', 'therapy_enrollment'],
    ['create', 'therapy_enrollment'],
    ['read', 'patient'],
    ['export', 'audit_log'],
  ];
  const actors = ['patient@demo.carecare', 'doctor@demo.carecare', 'admin@demo.carecare'];
  return actions.map(([action, resource], i) => ({
    id: `aud-${i}`,
    actor_email: actors[i % actors.length]!,
    action,
    resource_type: resource,
    resource_id: pid((i % DEMO_PATIENTS.length) + 1),
    patient: i % 3 === 0 ? pid(1) : null,
    ip_address: '203.0.113.' + (10 + i),
    request_id: `req-${(1000 + i * 37).toString(16)}`,
    created_at: iso(i, 9 + (i % 6), i * 7),
  }));
}

// ---------------------------------------------------------------------------
// Aggregations — mirror apps/tracking/services.py so the UI gets identical
// shapes whether the numbers come from the demo store or the Django backend.
// ---------------------------------------------------------------------------

export function computeTrend(
  entries: SymptomEntry[],
  days: number,
  symptomType?: string,
): TrendResponse {
  const cutoff = Date.now() - days * DAY_MS;
  const buckets = new Map<string, { sum: number; count: number }>();
  for (const e of entries) {
    if (new Date(e.recorded_at).getTime() < cutoff) continue;
    if (symptomType && e.symptom_type !== symptomType) continue;
    const day = e.recorded_at.slice(0, 10);
    const b = buckets.get(day) ?? { sum: 0, count: 0 };
    b.sum += e.severity;
    b.count += 1;
    buckets.set(day, b);
  }
  const points: TrendPoint[] = [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, b]) => ({
      date,
      avg_severity: Math.round((b.sum / b.count) * 100) / 100,
      count: b.count,
    }));
  return { window_days: days, points, total: points.length };
}

export function computeSummary(entries: SymptomEntry[], days: number): SummaryResponse {
  const cutoff = Date.now() - days * DAY_MS;
  const inWindow = entries.filter((e) => new Date(e.recorded_at).getTime() >= cutoff);
  if (inWindow.length === 0) {
    return { window_days: days, total_entries: 0, avg_severity: null, worst_entry: null };
  }
  const total = inWindow.reduce((acc, e) => acc + e.severity, 0);
  const worst = inWindow.reduce((a, b) => (b.severity > a.severity ? b : a));
  return {
    window_days: days,
    total_entries: inWindow.length,
    avg_severity: Math.round((total / inWindow.length) * 100) / 100,
    worst_entry: {
      severity: worst.severity,
      symptom_type: worst.symptom_type,
      recorded_at: worst.recorded_at,
    },
  };
}
