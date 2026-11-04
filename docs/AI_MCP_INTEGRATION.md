# AI Coding Agents & MCP Integration

The role lists *"connect AI tooling via MCP, keeping patient data out of
unapproved tools"* as a first-class responsibility. This document describes the
policy and the concrete guardrails this repository applies — it is a **design
artifact** (UNVERIFIED tooling), not a running MCP server.

## 1. Policy

| Rule | Enforcement |
| --- | --- |
| Patient data never leaves approved tools | Agents operate on **code**, never on a live DB dump; `.env*` is git-ignored and read-blocked locally |
| Secrets never enter prompts | `.env` is excluded by an environment guard; only variable *names* appear in docs |
| Every AI-authored change is human-reviewed | Changes go through PR + CI (lint, types, tests) before merge |
| Reproducibility | Agents run against the same `pyproject.toml`/`package.json` as humans |

## 2. What an approved MCP toolchain looks like here

```
Developer ──▶ OpenCode / agent
                │  (MCP over stdio)
                ├── repo-server     : read/write files in the working tree only
                ├── docs-server      : fetch versioned library docs (no PII)
                └── ci-server        : read CI status, open PRs
                        ✗ NEVER: database-server, production-logs-server
```

The exclusion is the point: a `database-server` MCP would hand an LLM raw
patient rows. If such a server is ever needed, it must expose **only**
schema/DDL and anonymised fixtures — never production data.

## 3. How this repo was built with agents

- Backend, tests, infra and docs were produced with an AI coding agent under the
  rules above.
- **The agent's own output was treated as untrusted**: the 48-test suite exists
  precisely to catch defects the author (human or AI) missed, and it *did* —
  five real bugs were found by tests during development (see the test suite and
  the project history: fail-open queryset scoping, missing trend total, wrong
  readiness status, lost 404 code, wrong router basename).
- No patient data, real credentials, or `.env` contents were ever placed in a
  prompt or a file.

## 4. Suggested MCP servers to wire for this project

| Purpose | Server | Why safe |
| --- | --- | --- |
| Up-to-date library docs | Context7 | public docs only |
| Repo operations | git/filesystem MCP scoped to the repo | no external systems |
| CI/CD | GitHub MCP | no patient data |
| Observability *metadata* | Prometheus MCP (label/query only) | metrics, not logs with PII |

## 5. Guardrail code already in the repo

- `common/audit_sink.py` — audit export is a single, auditable egress point.
- `.gitignore` — `.env`, `*.tfstate`, coverage, and node modules excluded.
- Request-id propagation (`common/middleware.py`) — makes AI-assisted debugging
  tractable without pasting payloads: correlate by id, never by body.
