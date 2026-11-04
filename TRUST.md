# Trust Register — what is actually verified

This project deliberately separates **what was executed and observed** from
**what was written as a design artifact**. Nothing in the README is claimed as
working unless it is marked VERIFIED here with an actual command.

Legend: **VERIFIED** · **PARTIALLY VERIFIED** · **UNVERIFIED** · **NOT IMPLEMENTED**

Authoring environment: Windows, Python 3.12.7, Node 24, **no Docker/Postgres/
Redis/kubectl/terraform installed**. This constraint shapes the status below.

---

## Backend — VERIFIED

| Claim | How verified | Result |
| --- | --- | --- |
| Django system check passes | `python manage.py check` | `System check identified no issues (0 silenced)` |
| Production deploy check passes | `manage.py check --deploy --settings=carecare.settings.prod` | `System check identified no issues (0 silenced)` |
| Migrations apply | `python manage.py migrate` on test settings | all `0001_initial` applied OK |
| Full test suite passes | `.venv/Scripts/python -m pytest -q` | **51 passed** |
| Lint / format / types | `ruff check .` · `ruff format --check .` · `mypy carecare apps common` | all clean (`60 source files`) |
| Tests cover RBAC/privacy | `tests/test_authorization.py` (19 tests) | cross-patient access denied, revoked relationship denied (read+analytics+write+enroll), audit written |
| Tests cover auth lifecycle | `tests/test_auth.py` (13 tests) | login/refresh/logout/blacklist/change-password |
| Tests cover validation | `tests/test_tracking.py` (7 tests) | backdating window, severity bounds, trend aggregation |
| Integration surface | `tests/test_integration.py` (5 tests) | health, request-id, error envelope, OpenAPI schema |

**Caveat:** tests run against **SQLite in-memory** by default. `settings/test.py`
supports `TEST_USE_POSTGRES=1`, and CI runs against **real Postgres 16 + Redis 7**
(see `.github/workflows/backend.yml`), but that CI run has **not executed in this
environment** — it is UNVERIFIED until a push triggers it on GitHub Actions.

## Mobile — PARTIALLY VERIFIED

Static analysis and unit tests ran against a **real installed dependency tree**
(`npm install` → `added 1392 packages in 14m`, `npm info ok`).

| Claim | Status | Note |
| --- | --- | --- |
| TypeScript sources written | VERIFIED | files present under `mobile/src` |
| `tsc --noEmit` passes | **VERIFIED** | `npx tsc --noEmit` → exit 0, empty output |
| Jest unit tests pass | **VERIFIED** | `npx jest --ci` → 2 suites / 4 tests passed, exit 0 |
| ESLint clean | **VERIFIED** | `npx eslint .` → exit 0 (after fixing 2 real `no-unused-vars` defects in `src/hooks/queries.ts`) |
| App renders in a device/browser | **UNVERIFIED** | no emulator/simulator or browser run performed |
| JWT refresh is single-flight | VERIFIED (by code review) | `refreshInFlight` guard in `src/api/client.ts` |
| Tokens stored in keystore | VERIFIED (by code review) | `expo-secure-store` in `src/auth/tokenStorage.ts` |

> Per the project's honesty policy: **no visual/browser verification of the
> mobile UI was performed.** Visual claims (layout, spacing, colors on a real
> screen) are therefore NOT made. Static checks and logic tests are VERIFIED.

## Infrastructure — UNVERIFIED (design artifacts)

Everything below is written to be deployable but was **not applied** in this
environment. They are inspectable artifacts, not executed proof.

| Artifact | Status |
| --- | --- |
| `backend/Dockerfile` (multi-stage, non-root) | UNVERIFIED — no Docker available |
| `docker-compose.yml` (db/redis/api/worker/beat/migrate) | UNVERIFIED |
| `ops/k8s/*` (Deployment, HPA, PDB, NetworkPolicy, Job, Ingress) | UNVERIFIED — no cluster |
| `ops/terraform/main.tf` (GKE, Cloud SQL, Memorystore, GCS) | UNVERIFIED — not applied |
| `ops/gitops/argocd-application.yaml` | UNVERIFIED |
| `ops/observability/*` (Prometheus rules, Grafana, Loki) | UNVERIFIED — config valid by review, not loaded |
| `.github/workflows/*` | UNVERIFIED — not triggered |
| `loadtest/k6` and `loadtest/locust` | UNVERIFIED — not executed; **no performance numbers are claimed** |

## Explicitly NOT claimed

- ❌ No performance/latency/throughput figures (load tests never ran).
- ❌ No "production-ready" claim — this is a demo/portfolio artifact.
- ❌ No regulatory compliance claim (MDR/IEC 62304). Compliance is a process,
  not a repository.
- ❌ No mobile screenshot/visual verification (static checks + unit tests are
  VERIFIED; rendering on a real screen was not observed).
- ❌ No independent subagent review (security-reviewer / code-reviewer) was
  performed: the agent tooling hit its daily quota in the authoring
  environment. A **self-review of the authorization core** was performed
  instead and did uncover and fix a real defect (below). Backend quality gates
  (ruff/mypy/pytest/check --deploy) were run directly and are VERIFIED; an
  independent human/agent review is still recommended before relying on this
  code.

## Defects found by review (and fixed)

- **Revoked clinician retained access (High).** `Patient.is_in_care_team()` and
  `IsCareTeamMember.has_object_permission()` checked `care_team` membership
  without filtering `ended_at`. Because ended relationships are intentionally
  retained for audit, a clinician whose relationship had ended kept passing
  check-level authorisation on the **write**, **analytics** and **enrollment**
  paths (the list/retrieve paths were already safe because their queryset
  filtered `ended_at__isnull=True`). Fixed in `apps/patients/models.py` and
  `common/permissions.py` to require an active relationship; three regression
  tests added (`test_revoked_relationship_blocks_{analytics,write,enrollment}`),
  suite grew 48 → 51.
- **Wrong status code on authorization failure (Low).** The therapy enrollment
  serializer raised `ValidationError` (HTTP 400) when a clinician was not on the
  patient's care team; corrected to `PermissionDenied` (HTTP 403) so "denied" is
  not indistinguishable from "bad input".

## How to convert UNVERIFIED → VERIFIED

1. `pip install` + `pytest` on a machine with Docker → run the compose stack.
2. `kubectl apply --dry-run=server -k ops/k8s` against a real cluster.
3. `terraform plan` with real GCP credentials.
4. Push to GitHub → let Actions run backend (real PG/Redis) + mobile jobs.
5. `k6 run loadtest/...` against the running stack to produce real numbers.
6. Run the mobile app in an emulator/simulator or browser to verify actual
   rendering (static checks — `tsc`/`eslint`/`jest` — are already VERIFIED).
