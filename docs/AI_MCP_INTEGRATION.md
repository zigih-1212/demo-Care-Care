# AI Tooling & MCP Integration Policy

This project treats AI coding agents as a **tool with a written policy**, the same
way it treats any other dependency that can touch sensitive data. In a regulated
health product the risk is concrete: an AI tool (or an MCP server wired into it) can
leak patient data, exfiltrate secrets, or silently introduce defects. This document
defines the guardrails the project applies.

The role lists *"connect AI tooling via MCP, keeping patient data out of unapproved
tools"* as a first-class responsibility — this is the policy that implements it.

## 1. Rules

| Rule | How it is enforced |
| --- | --- |
| Patient data never leaves approved tools | Agents operate on **code**, never on a live DB dump; `.env*` is git-ignored and read-blocked locally |
| Secrets never enter prompts | `.env` is excluded by an environment guard; only variable *names* appear in docs |
| Every AI-suggested change is human-reviewed | Changes go through PR + CI (lint, types, tests) before merge |
| Reproducibility | Agents run against the same `pyproject.toml`/`package.json` as humans |
| AI-suggested output is untrusted by default | The test suite is the arbiter — see the defect log in `TRUST.md` |

## 2. What an approved MCP toolchain looks like here

```
Developer ──▶ editor / agent
                │  (MCP over stdio)
                ├── repo-server     : read/write files in the working tree only
                ├── docs-server      : fetch versioned library docs (no PII)
                └── ci-server        : read CI status, open PRs
                        ✗ NEVER: database-server, production-logs-server
```

The exclusion is the point: a `database-server` MCP would hand an LLM raw patient
rows. If such a server is ever needed, it must expose **only** schema/DDL and
anonymised fixtures — never production data.

## 3. Why the guardrails matter here

- An agent asked to "fix the failing test" must not be able to read production
  rows to do it; it works against code and anonymised fixtures instead.
- A leaked prompt is a data-protection incident under GDPR Art. 32 / the MDR
  quality-system expectations, not just an engineering inconvenience.
- Correlation by `request_id` (`common/middleware.py`) lets an engineer debug
  against metrics and logs **without pasting payloads** into a model.

## 4. Approved MCP servers for this project

| Purpose | Server | Why safe |
| --- | --- | --- |
| Up-to-date library docs | Context7 | public docs only |
| Repo operations | git/filesystem MCP scoped to the repo | no external systems |
| CI/CD | GitHub MCP | no patient data |
| Observability *metadata* | Prometheus MCP (label/query only) | metrics, not logs with PII |

## 5. Guardrails already in the repo

- `common/audit_sink.py` — audit export is a single, auditable egress point.
- `.gitignore` — `.env`, `*.tfstate`, coverage, and node modules excluded.
- `.env.example` ships **names only**; no value ever has a real secret.
- Request-id propagation (`common/middleware.py`) — traceable debugging without
  exposing bodies.
