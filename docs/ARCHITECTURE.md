# Architecture

> Status of claims in this document: the **backend behaviour** is VERIFIED by
> the test suite (54 tests). The **infrastructure topology** is a design
> artifact — manifests are syntactically real but were not applied (no
> Docker/K8s in the development environment). See `../TRUST.md`.

## 1. Context

```
  ┌──────────┐        HTTPS/JWT        ┌──────────────┐
  │  Mobile   │ ─────────────────────▶ │  Ingress     │
  │  (Expo)   │ ◀───────────────────── │  (TLS, rl)   │
  └──────────┘                        └──────┬───────┘
                                             │
                                      ┌──────▼───────┐      ┌──────────────┐
                                      │  API (DRF)   │─────▶│  PostgreSQL  │
                                      │  stateless   │      │  (regional)  │
                                      └───┬──────┬───┘      └──────────────┘
                                          │      │
                           ┌──────────────▼┐   ┌─▼─────────┐
                           │ Redis (cache  │   │ Celery    │
                           │ + broker)     │◀─▶│ workers   │
                           └───────────────┘   └───────────┘
```

A single deployable image serves three process roles — web, worker, beat —
selected by the container command. This is the "one repo, one image, three
process types" pattern that keeps dev/prod parity high.

## 2. Request lifecycle (verified path)

1. **Ingress** terminates TLS, applies edge rate limits and security headers.
2. **RequestIDMiddleware** adopts an upstream `X-Request-ID` (only if sane) or
   mints one, stores it in a `ContextVar`, and echoes it back.
3. **AuditContextMiddleware** captures IP + user-agent for later audit writes.
4. **Authentication** validates the JWT (`simplejwt`), then
   `EmailBackend` resolves the user.
5. **Permission** runs object-level checks (`IsCareTeamMember`,
   `IsPatientSelfOrCareTeam`).
6. **View/querset** is scoped by role so unauthorised rows never enter memory.
7. **Audit** records the access (`record()` is fire-and-forget, never raises).
8. **Response** passes through the unified error envelope if it is an error,
   then the Prometheus middleware records golden-signal metrics.

## 3. Data model (core)

```
User 1──1 Patient ──M2M(through CareRelationship)── User(clinician)
  │            │
  │            ├──M── SymptomEntry   (severity 0–10, indexed by (patient,-recorded_at))
  │            ├──M── MedicationEntry
  │            └──M── Enrollment ──M── TherapyProgram
  │
  └──M── AuditLog (actor snapshot + patient link)
```

Key constraints:

- `CareRelationship` has a **partial unique index** on `(patient, clinician)
  WHERE ended_at IS NULL` — you cannot have two active relationships with the
  same clinician, but history is preserved.
- `Enrollment` has a similar partial unique index on
  `(patient, program) WHERE status='active'`.
- `AuditLog.save()` raises on any attempt to modify an existing row —
  append-only by construction.

## 4. Why these choices (see also `adr/`)

| Decision | Rationale | Trade-off |
| --- | --- | --- |
| Cursor pagination | Stable under concurrent inserts (important for a timeline) | No "jump to page 5" |
| Audit **in-transaction** | Guarantees an audit row exists iff the action happened | Slight write amplification |
| `record()` never raises | Audit failure must not fail the patient's action | Audit is best-effort at read time; batch-exported for durability |
| Scoped querysets | Unauthorised rows never leave the DB | More view code |
| Celery for exports | Audit export to GCS is slow/IO-bound | Extra moving part |

## 5. Failure-mode analysis

| Failure | Behaviour | Mitigation |
| --- | --- | --- |
| Postgres down | `/readyz` 503 → pod removed from Service; writes fail fast | Regional HA + PITR; connection retry in entrypoint |
| Redis down | Cache calls fall back; Celery tasks queue | STANDARD_HA Memorystore; tasks are idempotent |
| Worker crash | Task lost? No — `acks_late` + `reject_on_worker_lost` redeliver | Idempotent task design |
| Pod OOM | Liveness/readiness fail, pod replaced | Memory limits + HPA |
| Node drain | PDB keeps ≥2 pods serving | `minAvailable: 2` |
| Traffic spike | HPA scales 3→20 on CPU/mem | Edge rate limiting as a backstop |
| Bad migration | PreSync Job fails → rollout does not proceed | Backward-compatible migration rule |

## 6. Scaling strategy

- **Horizontal**: API is fully stateless (no local sessions); scale on CPU/mem.
- **Vertical (DB)**: analytics aggregation runs in SQL (`GROUP BY date`), not in
  Python, so it stays correct and fast as data grows.
- **Read path**: this is a read-heavy workload (timelines, trends); the HPA
  scales reads, and the summary endpoint is cached.
- **Out of scope for the demo, noted for production**: read replicas for
  analytics, and a materialised daily-aggregate table refreshed by Celery.

## 7. Compliance considerations (design-level)

- **Data minimisation**: the API only exposes fields each role needs.
- **Access accountability**: every patient-data access is audited with an actor.
- **Retention**: audit bucket enforces a ~7-year retention policy.
- **Right to erasure**: `Patient.delete()` cascades symptom/medication/therapy
  data; audit rows are retained (SET_NULL) as required by MDR — the explicit
  tension is documented in `adr/0004-audit-retention-vs-erasure.md`.

> These are engineering design decisions, **not** regulatory claims. A real MDR
> submission would require a QMS, risk file, and clinical evaluation.
