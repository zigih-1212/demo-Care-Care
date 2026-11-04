# Demo guide — for reviewers who are not engineers

This is a portfolio demo of a **Full-Stack Engineer** application
(Django + React Native + cloud-native ops). You do **not** need to install
anything or read code to try it.

## 1. Open the app in your browser

Open the hosted link (Cloudflare Pages). That is the whole product — the frontend
runs with a built-in demo dataset, so there is no backend to wait for.

On the login screen you will see **“Try it as…”** with three one-tap buttons.
Pick a role:

| Role | What you will see |
| --- | --- |
| **Patient** | Personal diary: log a symptom, see the 30-day trend, join a therapy program, manage privacy consent. |
| **Clinician** | A caseload of patients with 30-day severity stats; open one read-only. |
| **Administrator** | The account directory and the append-only access audit trail. |

Every role also has a **Profile** tab and a **Get app** tab.

You can also sign in manually with:

- `patient@demo.carecare` / `Demo-Passw0rd!23`
- `doctor@demo.carecare` / `Demo-Passw0rd!23`
- `admin@demo.carecare` / `Demo-Passw0rd!23`

## 2. Install it like a real app (optional)

The site is a **PWA**:

- **Android / desktop:** your browser shows an **Install** icon (in the address
  bar or the ⋮ menu). After installing, Cara Care opens in its own window.
- **iPhone / iPad:** open the site in **Safari → Share → Add to Home Screen**.

The **Get app** tab inside the app repeats these instructions per platform and
notes where a native Android APK / iOS build stands.

## 3. What the engineers should look at

- Repository: `https://github.com/zigih-1212/demo-Care-Care`
- `README.md` — architecture, API surface, how to run everything.
- `TRUST.md` — an honest register of what was **actually executed** versus what
  is a design artifact (nothing is claimed as working unless it was run).
- `docs/ARCHITECTURE.md` — request lifecycle and failure-mode analysis.
- `backend/` — Django + DRF, 62 tests, RBAC, audit log, JWT.
- `ops/` — Docker, Kubernetes, Terraform, GitOps, observability.

## Honest scope

- Demo data only. **Not a medical device. Do not enter real patient data.**
- The hosted build runs in demo mode (seeded data in the browser). The Django
  backend is in the repository and is fully tested, but the public demo does not
  call it.
