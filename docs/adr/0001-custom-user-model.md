# ADR 0001 — Custom user model from day one

**Status:** Accepted

## Context
Django's default `auth.User` uses a `username` field. This product authenticates
by email and needs a role (patient/clinician/admin) plus a privacy-consent
timestamp.

## Decision
Use a custom `AUTH_USER_MODEL = accounts.User` with `email` as
`USERNAME_FIELD`, a `role` field, and `consent_privacy_accepted_at`.

## Consequences
- **Positive:** no retrofitting later (swapping the user model after migrations
  exist is famously painful). Role drives authorization cleanly.
- **Negative:** more setup up front — custom manager and backend required.
- **Rule:** set `AUTH_USER_MODEL` before the first migration. This is done.

## Alternatives considered
- Default user + profile model: rejected — adds a join to every auth check and
  spreads identity across two tables.
