# ADR 0002 — Object-level authorization, scoped querysets, fail-closed

**Status:** Accepted

## Context
Patient data is the most sensitive asset in the system. Django permissions
alone operate at the view level; they do not stop patient A from reading
patient B's row by guessing a UUID.

## Decision
1. **Scope every queryset by role at the source** (`get_queryset`), so
   unauthorised rows never enter application memory.
2. **Fail closed** — if a clinician explicitly asks for a patient outside their
   care team, return `403`, not an empty `200`. An empty list is
   indistinguishable from "this patient has no data", which leaks nothing but
   also *hides the denial* and makes a probe look like success.
3. Use `common/permissions.py` for object checks and
   `apps/*/views.py` scoping for row filtering — defence in depth.

## Consequences
- **Positive:** a single missed permission class cannot leak data if the
  queryset is already scoped.
- **Negative:** scoping logic is repeated across viewsets; mitigated by a
  shared `_PatientScopedQuerysetMixin`.
- **Verified by:** `tests/test_authorization.py` (cross-patient access,
  revoked-relationship access, analytics scoping).
