# Doctor Portal — Handoff / Onboarding

Start here. This is everything you need to take over the UMC doctor web portal (frontend + the
Firebase data wiring) and continue building.

## What this project is

A web portal for UMC doctors — a single multi-role React app (Vite + TypeScript) that signs
providers in against the **same Firebase backend the phone app uses** and routes by role.
Doctor is the first role; Pharmacy and Diagnostics come later as sibling role-subtrees.

- It lives **inside the existing `UMC-Website` repo**, in the `portal/` subdirectory.
- The build-less marketing site at the repo root is separate and untouched.
- Reached from the marketing site via a "Beta tester? Sign in →" link (not added yet).

## Current state (live in production — last updated 2026-06-26)

The portal is **built out and deployed live**. Work has landed on **`main`** (the
`feat/doctor-portal` and `portal-clinic-aesthetic` branches are merged in). Every push to
`main` auto-builds and publishes via GitHub Actions — see "Deployment" below.

- **All phases shipped, not stubs:** the data layer (typed models, mappers, live Firestore
  read hooks, appointment/settings/notes actions) is wired, and all six doctor pages
  (Home, Schedule, Patients, Notes, Finance, Settings) render real data plus the create
  flows. The plain stubs are gone.
- **Design elevation done:** the "clinic-aesthetic" redesign — `Section` titled-card blocks,
  `StatusToggleTile`, `umc-rowtile` rows, multi-state save pill — is applied across the
  doctor pages, on top of a **responsive shell + grid** (breakpoints at 1099/819/640px).
- **Sign-in:** Google, Apple, and **phone OTP**. The portal is **sign-in only / members
  only** — phone OTP is gated to registered members (`users/{uid}` with a role); an
  unregistered number is rejected and its freshly-created auth account deleted. Google/Apple
  still route by role (doctor → `/doctor`, wrong role → `/wrong-role`). A green success
  animation plays on sign-in.
- **Security hardening:** Firebase App Check scaffolded (monitoring-ready), fonts self-hosted,
  CSP + Referrer-Policy added, Netlify dropped. (Broader Cloudflare/Firebase DDoS work is
  planned but not yet implemented — see `.claude/SECURITY-PLAN.md`.)
- **Other features live:** clinic location picker (Google Maps) in doctor settings; SPA
  fallback so deep links like `/member/dashboard` survive direct load + refresh.
- **Verified:** unit tests pass (`npm run test`), `npm run build` green, and sign-in works live.

## Deployment

Auto-triggered — there is **no manual publish step**. `.github/workflows/deploy-portal.yml`
runs on every push to `main`: it `npm ci && npm run build`s the portal (Firebase/Maps secrets
come from GitHub Actions secrets), copies `portal/dist/` into `/member`, publishes a `/login`
entry that reuses the bundle, and the `github-actions[bot]` commits the built assets back to
`main` with `[skip ci]` (so it doesn't loop). The site serves from `/member` + `/login`.

## The two layers (keep this seam)

- `src/shared/` — role-agnostic: Firebase init, auth, design tokens. **No role-specific code.**
- `src/roles/doctor/` — doctor pages + (coming) the data hooks.
- **Rule:** components consume hooks/data; they never `import firebase` directly. This keeps the
  app testable and lets a new role = one new `roles/<role>/` folder + one route.

## Get the code

1. Get added as a collaborator on the GitHub repo **`kammaash/UMC-Website`** (ask Anand).
2. Clone the repo (current work is on `main`):
   ```bash
   git clone https://github.com/kammaash/UMC-Website.git
   cd UMC-Website
   ```

## Local setup & run

```bash
cd portal
npm install
cp .env.example .env     # then fill in the 6 Firebase web-config values (see below)
npm run dev              # http://localhost:5173
npm run test             # 8 tests should pass
npm run build            # should be green
```

**`portal/.env`** (gitignored — never committed). The 6 `VITE_FB_*` values are the Firebase
**Web app** config (not secrets — they ship to every browser). Get them from the Firebase
console → Project settings → Your apps → the Web app, or copy the `.env` Anand already created.
Keys: `VITE_FB_API_KEY`, `VITE_FB_AUTH_DOMAIN`, `VITE_FB_PROJECT_ID`, `VITE_FB_STORAGE_BUCKET`,
`VITE_FB_MESSAGING_SENDER_ID`, `VITE_FB_APP_ID`.

Sign in with a doctor test account (`iyYwg9woPdg6OiTTFBaROF6zrL13`) to see `/doctor`.

## Backend access (only what you'll actually touch)

The portal **reads** Firestore and **calls existing Cloud Functions** — it does not contain a
server. Depending on how far you take "the backend":

- **To build the data layer (Plan 2) — reading Firestore + calling functions:** you only need
  the Firebase **web config** above and a signed-in doctor account. No special server access.
- **If you'll also modify the real Cloud Functions or Firestore rules** (these live in the
  separate `tablet_reminder` Flutter repo, in `functions/` and `firestore.rules`): you need
  (a) access to that repo, (b) **IAM access to the Firebase project `tablet-reminder-app-111204`**
  (Editor/Owner) to deploy, and (c) any function secrets (e.g. Razorpay keys). Coordinate with
  Anand/Ashok before deploying — the same backend serves the live phone app. See
  `tablet_reminder/CLAUDE.md` for deploy commands and conventions.

## Where to continue — read these in order

1. `docs/superpowers/specs/2026-06-11-doctor-web-portal-design.md` — the full design spec.
2. `docs/superpowers/plans/2026-06-11-doctor-portal-phase1-foundation.md` — Phase 1 (DONE).
3. `docs/superpowers/plans/2026-06-11-doctor-portal-phase2-data-layer.md` — **Plan 2 (NEXT,
   ready to execute)**: typed models, pure mappers (TDD), live read hooks, and the appointment /
   settings / notes actions in `src/roles/doctor/data/`, with exact field maps + Cloud Function
   names mirrored from the phone app. This is the bulk of the "backend wiring."
4. Then Phase 3 — wire each page (Schedule, Patients, Notes, Finance, Settings, Home) to the
   hooks/actions with plain styling; Phase 3a adds the create flows (create patient, prescribe
   medication, order diagnostics); then design elevation.

Tip: this project was built with Claude Code using the brainstorm → spec → plan → execute
workflow. You can keep using it: point Claude at the spec + plans and have it write/execute the
next plan.

## Gotchas already discovered (save yourself the debugging)

- **Cloud Functions region (resolved):** every Cloud Function the **doctor** flow calls
  (`processCancellation`, `dismissAppointmentByDoctor`, `settleDoctorPenaltyManually`,
  `createPaymentOrder`, `verifyAndEscrowPayment`, …) is in the default **`us-central1`** — so the
  portal just uses `getFunctions(app)` with no region override. (The `asia-south1` functions are
  AI/assistant, the Razorpay webhook, and schedulers — not called by the doctor data layer. If
  you later add the AI assistant, those need `getFunctions(app, 'asia-south1')`.)
- **Many doctor actions are direct Firestore writes, not Cloud Functions.** Confirm, mark-arrived,
  and mark-done are `appointments/{id}` updates; only cancel/reject/no-show
  (`processCancellation`), dismiss, and penalty-settle are callables. Phase 2's
  `appointmentActions.ts` reproduces each write map exactly — including the slot-lock removal and
  patient–doctor guard release that the app performs around cancellations.
- **Finance is read-only in the UI.** Cloud Functions write the authoritative finance/order
  docs; the portal only reads and renders them. Never recompute money client-side.
- **Vitest 4** exits code 1 on "No test files found" — harmless, only matters before any test
  exists.
- **Don't touch the repo root** (the marketing site) from the portal.
- Two minor known items flagged for hardening: a transient auth-state race in `AuthContext.tsx`
  on rapid sign-in/out, and a firebase bundle code-split for size.
