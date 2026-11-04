# ADR 0004 — Audit retention vs. right to erasure

**Status:** Accepted (with explicit tension)

## Context
GDPR gives data subjects a right to erasure. MDR/medical-device expectations
require access trails to be retained (often for years) to demonstrate device
safety and accountability. Deleting a patient must not delete the evidence that
their data was handled correctly.

## Decision
- Deleting a `Patient` cascades their clinical data (`SymptomEntry`,
  `MedicationEntry`, `Enrollment`) — erasure of the substance.
- `AuditLog.patient` uses `on_delete=SET_NULL` and `actor` uses `SET_NULL`, so
  the *fact* of access survives while the link to the individual is severed.
- `actor_email` is snapshotted at write time (so the audit remains meaningful
  after a user is deleted) — this is itself personal data, handled under the
  retention policy (GCS bucket, ~7-year retention).

## Consequences
- Erasure is satisfied for clinical content; audit metadata is retained under
  the legal-obligation basis.
- This is a **documented, intentional tension**, not an oversight — which is
  exactly the kind of decision the role expects an engineer to surface to
  Product/Legal rather than decide silently.

## Open question for a real deployment
Whether `actor_email` must be pseudonymised after N months. Deferred to
Privacy/Legal; the code isolates it in one field so a future change is local.
