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
| Migrations apply | `python manage.py migrate` on test settings | all `0001_initial` applied OK |
| Full test suite passes | `.venv/Scripts/python -m pytest -q` | **48 passed** (7.25s) |
| Tests cover RBAC/privacy | `tests/test_authorization.py` (16 tests) | cross-patient access denied, revoked relationship denied, audit written |
| Tests cover auth lifecycle | `tests/test_auth.py` (13 tests) | login/refresh/logout/blacklist/change-password |
| Tests cover validation | `tests/test_tracking.py` (7 tests) | backdating window, severity bounds, trend aggregation |
| Integration surface | `tests/test_integration.py` (5 tests) | health, request-id, error envelope, OpenAPI schema |

**Caveat:** tests run against **SQLite in-memory** by default. `settings/test.py`
supports `TEST_USE_POSTGRES=1`, and CI runs against **real Postgres 16 + Redis 7**
(see `.github/workflows/backend.yml`), but that CI run has **not executed in this
environment** — it is UNVERIFIED until a push triggers it on GitHub Actions.

## Mobile — PARTIALLY VERIFIED

| Claim | Status | Note |
| --- | --- | --- |
| TypeScript sources written | VERIFIED | files present under `mobile/src` |
| `tsc --noEmit` passes | **UNVERIFIED** | `npm install` was in progress; not confirmed to complete here |
| Jest unit tests pass | **UNVERIFIED** | same — not executed to completion |
| ESLint clean | **UNVERIFIED** | not executed |
| App renders in a device/browser | **UNVERIFIED** | no browser/emulator run performed for the mobile app |
| JWT refresh is single-flight | VERIFIED (by code review) | `refreshInFlight` guard in `src/api/client.ts` |
| Tokens stored in keystore | VERIFIED (by code review) | `expo-secure-store` in `src/auth/tokenStorage.ts` |

> Per the project's honesty policy: **no visual/browser verification of the
> mobile UI was performed.** Visual claims are therefore not made.

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
- ❌ No mobile screenshot/visual verification.
- ❌ No independent subagent review (security-reviewer / code-reviewer) was
  performed: the agent tooling hit its daily quota in the authoring
  environment. Backend quality gates (ruff/mypy/pytest/check --deploy) were run
  directly and are VERIFIED; a human/agent review is still recommended before
  relying on this code.

## How to convert UNVERIFIED → VERIFIED

1. `pip install` + `pytest` on a machine with Docker → run the compose stack.
2. `kubectl apply --dry-run=server -k ops/k8s` against a real cluster.
3. `terraform plan` with real GCP credentials.
4. Push to GitHub → let Actions run backend (real PG/Redis) + mobile jobs.
5. `k6 run loadtest/...` against the running stack to produce real numbers.
6. Run `npm install && npm run typecheck && npm run lint && npm test` in
   `mobile/` to verify the frontend.
