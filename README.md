# Cara Care — Full-Stack Demo

A production-shaped digital-therapeutic application for digestive health
(IBS/GERD): patients log symptoms and medication, see trends, and follow guided
therapy programs; clinicians access only the patients under their care.

Built as a portfolio piece for a **Full-Stack Engineer** role focused on
**Django + PostgreSQL**, **React Native**, and **cloud-native operation**.

**Live demo:** https://carecare-demo.pages.dev

---

## Try it without installing anything

**Live demo: https://carecare-demo.pages.dev** — open it in any browser, no
install and no backend required.

The frontend ships as a **runnable web app** (React Native Web) with a built-in
demo data layer, so it works from a browser with no backend:

- **Patient** — `patient@demo.carecare` · `Demo-Passw0rd!23`
- **Clinician** — `doctor@demo.carecare` · `Demo-Passw0rd!23`
- **Administrator** — `admin@demo.carecare` · `Demo-Passw0rd!23`

The login screen also has one-click buttons for each role. Demo mode answers
from a seeded, in-browser dataset (`mobile/src/demo/`); the real Django API is
used when `EXPO_PUBLIC_DEMO` is unset. It is a **PWA** — your browser offers an
"Install" action and there is a *Get app* tab with download instructions.

> Demo build. Not a medical device. Do not enter real patient data.

---

## Why this exists

The role is end-to-end: *architecture → implementation → testing → deployment →
monitoring*, in a **regulated healthcare** context (patient data, MDR, GDPR).
This repository demonstrates each layer with real code, not slideware:

| Layer | What's here | Evidence |
| --- | --- | --- |
| Backend | Django 5 + DRF, JWT auth, RBAC, audit log, async tasks | 62 passing tests |
| Frontend | React Native (Expo) + TypeScript, secure token storage | unit tests, typecheck |
| Data | PostgreSQL, indexed queries, SQL-side aggregation | migrations, models |
| Security | object-level authz, throttling, sealed secrets, audit trail | dedicated authz test suite |
| Scale | Docker, K8s (HPA/PDB/NetworkPolicy), Terraform (GCP) | manifests in `ops/` |
| Observability | Prometheus rules, Grafana dashboards, Loki | dashboards in `ops/` |
| Delivery | GitHub Actions CI, Argo CD GitOps | workflows in `.github/` |
| Performance | k6 + Locust load scenarios with thresholds | `loadtest/` |

**Trust model:** every artifact is labelled VERIFIED / UNVERIFIED in
[`TRUST.md`](TRUST.md). Nothing is claimed as
working unless it was actually run.

---

## Repository layout

```
.
├── backend/            Django + DRF API (the core of the role)
│   ├── carecare/        project: settings split, urls, celery, wsgi/asgi
│   ├── apps/
│   │   ├── accounts/    custom User, JWT auth, roles
│   │   ├── patients/    Patient profile + care-team relationships
│   │   ├── tracking/    symptom & medication logging, analytics
│   │   ├── therapy/     therapy programs + enrollments
│   │   └── audit/       immutable access audit log
│   ├── common/          middleware, permissions, pagination, errors, health
│   ├── tests/           unit + integration + authorization suites
│   ├── Dockerfile, docker-entrypoint.sh
│   └── pyproject.toml
├── mobile/             React Native + TypeScript (Expo), ships as a web PWA too
│   └── src/
│       ├── api/         axios client w/ single-flight JWT refresh
│       ├── auth/        AuthContext + secure token storage
│       ├── demo/        in-browser demo data layer (no backend needed)
│       ├── pwa/         install prompt + service-worker registration
│       ├── components/  design-system primitives
│       ├── screens/     Login, Register, Dashboard, Log, Insights, Therapy,
│       │                Roster, Patient detail, Admin, Profile, Download
│       └── ...
├── ops/
│   ├── k8s/            Deployment, Service, HPA, PDB, NetworkPolicy, Job, Ingress
│   ├── terraform/      GCP: GKE + Cloud SQL + Memorystore + GCS
│   ├── gitops/         Argo CD Application
│   └── observability/  Prometheus rules, Grafana dashboards, Loki, Promtail
├── loadtest/           k6 + Locust scenarios
├── docs/               ADRs and design notes
├── docker-compose.yml  local full stack
└── TRUST.md            per-artifact verification status
```

---

## Quick start

### Backend (no Docker required)

```bash
cd backend
uv venv --python 3.12
uv pip install -e ".[dev]"

# Run the test suite (SQLite in-memory by default).
.venv/Scripts/python -m pytest -q        # Windows
.venv/bin/python -m pytest -q            # macOS/Linux
```

Expected (verified on this project): `62 passed`.

To run against real Postgres (used in CI):

```bash
TEST_USE_POSTGRES=1 \
DATABASE_URL=postgres://carecare:carecare@localhost:5432/carecare \
REDIS_URL=redis://localhost:6379/0 \
.venv/bin/python -m pytest -q
```

### Full stack via Docker

```bash
docker compose up --build
# API:      http://localhost:8000
# Swagger:  http://localhost:8000/api/docs/
# Metrics:  http://localhost:8000/metrics
```

### Mobile

```bash
cd mobile
npm install
npm run typecheck && npm run lint && npm test
EXPO_PUBLIC_API_URL=http://localhost:8000 npm run web   # or: npm start
```

---

## API surface (v1)

| Method | Path | Purpose | Access |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register/` | create patient account | anonymous |
| POST | `/api/v1/auth/login/` | obtain JWT pair | anonymous (throttled) |
| POST | `/api/v1/auth/refresh/` | rotate tokens | anonymous |
| POST | `/api/v1/auth/logout/` | blacklist refresh | authenticated |
| GET | `/api/v1/auth/me/` | current profile | authenticated |
| GET | `/api/v1/auth/users/` | account directory | admin only |
| GET | `/api/v1/patients/roster/` | clinician's caseload (30-day stats) | clinician/admin |
| GET/POST | `/api/v1/tracking/symptoms/` | list / create entries | patient (own) · clinician (care team) |
| GET | `/api/v1/tracking/symptoms/trend/` | daily severity series | scoped as above |
| GET | `/api/v1/tracking/symptoms/summary/` | 30-day summary | scoped as above |
| GET | `/api/v1/therapy/programs/` | active programs | authenticated |
| GET/POST | `/api/v1/therapy/enrollments/` | manage enrollments | patient (own) |
| GET | `/api/v1/audit/logs/` | access audit trail | admin only |
| GET | `/healthz`, `/readyz` | probes | anonymous |
| GET | `/metrics` | Prometheus | anonymous (in-cluster only) |

Interactive docs: `/api/docs/` (Swagger UI), schema at `/api/schema/`.

---

## Security & privacy highlights

- **Object-level authorization**: a patient can never read another patient's
  data; a clinician only sees patients with an **active** care relationship, and
  access is revoked the moment the relationship ends. See
  `backend/common/permissions.py` and `backend/apps/tracking/views.py`.
- **Fail-closed**: requesting a patient outside your care team returns `403`,
  never an empty `200` that hides the denial.
- **Immutable audit log**: every read/write of patient data is recorded with
  actor, IP, request-id and resource, and cannot be edited (model blocks saves
  on existing rows).
- **Auth hardening**: Argon2 hashing, 12-char minimum, timing-safe login
  (dummy hash on unknown user to resist enumeration), rotating refresh tokens
  with blacklist-after-rotation.
- **Tokens at rest** (mobile): stored in the OS keystore via
  `expo-secure-store`, never `AsyncStorage`.
- **Throttling** at both the edge (ingress) and app (DRF ScopedRateThrottle).

Details and rationale: [`docs/adr/`](docs/adr/).

---

## Scaling & reliability

- **Stateless API** pods behind a ClusterIP Service, horizontally scaled by an
  HPA on CPU + memory, protected by a PodDisruptionBudget (`minAvailable: 2`)
  and spread across zones.
- **Zero-downtime deploys**: `maxUnavailable: 0`, startup + readiness + liveness
  probes, migrations run as a separate PreSync Job (no N-pod race).
- **Hardened pods**: Pod Security Admission `restricted`, non-root, read-only
  root filesystem, all capabilities dropped, seccomp `RuntimeDefault`, with a
  default-deny NetworkPolicy.
- **Data layer**: regional (HA) Cloud SQL Postgres with PITR, Memorystore Redis
  for cache + Celery, 7-year-retention GCS bucket for audit exports.
- **Observability**: golden-signal Grafana dashboard, alert rules for error
  rate / p95 latency / crash-loop / DB saturation, Loki log correlation by
  request-id.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the
request lifecycle and failure-mode analysis.

---

## License

Demo/portfolio code. Not a medical device. Do not use with real patient data.
