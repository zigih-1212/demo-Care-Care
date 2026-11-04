# ADR 0003 — Immutable, non-blocking audit logging

**Status:** Accepted

## Context
Regulated healthcare software must be able to answer "who accessed whose data,
when, and from where". Two failure modes matter:
1. Audit writes must never silently disappear.
2. Audit failures must never break the patient's action.

These pull in opposite directions.

## Decision
- `AuditLog` is **append-only**: `save()` raises if the row already exists.
- `record()` performs the write **inside the request transaction** (so an
  audited action and its audit row commit together — `ATOMIC_REQUESTS=True`),
  but **swallows exceptions** and logs them, so a broken audit write cannot 500
  the patient.
- A Celery task ships audit rows to durable object storage (checkpointed by
  last-seen timestamp) for retention.

## Consequences
- **Positive:** the common case is consistent and durable; the rare failure is
  visible in logs/alerting rather than crashing the app.
- **Negative:** a genuine audit-write failure yields a missing row plus an error
  log — acceptable because the error is alerted on.
- **Trade-off acknowledged:** strict "audit or fail" would require dropping the
  try/except and accepting patient-facing failures. Rejected for a
  patient-facing product.

## Verified by
`tests/test_authorization.py::TestAuditVisibility` (audit written on read;
admin-only visibility).
