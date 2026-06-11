# CLAUDE.md — UMC Doctor Portal

Guidance for Claude Code working in `portal/`. Read this fully before acting.

## What this is

A web portal for UMC providers — a single React + Vite + TypeScript app that signs users in
against the **same Firebase backend as the UMC phone app** (Flutter, separate repo
`tablet_reminder`) and routes by role. **Doctor** is the only role built so far; Pharmacy and
Diagnostics are planned as sibling role-subtrees. The portal lives in the `portal/` subdirectory
of the public `UMC-Website` repo; the repo root is a separate, build-less marketing site —
**never modify anything outside `portal/`.**

There is **no custom server.** The portal reads Firestore directly and calls **existing** Cloud
Functions. Do not reimplement backend logic — mirror what the phone app does.

## Workflow (how this project is built)

This project uses the Superpowers brainstorm → spec → plan → execute workflow. The design and
plans live in `../docs/superpowers/`:
- Spec: `../docs/superpowers/specs/2026-06-11-doctor-web-portal-design.md`
- Phase 1 (DONE): `../docs/superpowers/plans/2026-06-11-doctor-portal-phase1-foundation.md`
- Phase 2 (NEXT — data layer): `../docs/superpowers/plans/2026-06-11-doctor-portal-phase2-data-layer.md`
- Onboarding: `../docs/superpowers/HANDOFF-doctor-portal.md`

When executing a plan, follow it task-by-task with TDD where specified; the plans contain exact
code, file paths, and commands. When starting new feature work, brainstorm → write a spec/plan
before coding.

## Commands

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # Vitest (note: v4 exits 1 on "no test files" — harmless)
npm run build    # tsc -b && vite build
```

`.env` (gitignored) holds the 6 `VITE_FB_*` Firebase web-config values — see `.env.example`.
These are web config, not secrets. Sign in with a doctor test account
(role `doctor` in `users/{uid}`) to reach `/doctor`.

## Architecture & the one hard rule

Two layers, one seam:
- `src/shared/` — role-agnostic: `lib/firebase.ts` (exports `app, auth, db, functions`),
  `auth/` (AuthContext, `resolveRoleAccess`, `RequireRole`), `design/` (tokens), `data/`
  (generic `useDocData`/`useQueryData` hooks, `callable` wrapper).
- `src/roles/doctor/` — `DoctorShell`, `pages/`, and `data/` (doctor types, mappers, hooks, actions).
- `src/app/` — route table (`/login`, `/wrong-role`, `/` → RoleLanding, `/doctor/*`).

**THE RULE: a page/component never imports `firebase` directly — it only imports a hook or action
from a `data/` module.** This keeps the UI restylable and the data logic testable in isolation.
Adding a role = a new `roles/<role>/` folder + one route + adding the role to `SUPPORTED_ROLES`
in `src/app/RoleLanding.tsx`; no changes to `shared/`.

## Backend integration rules (critical — shared live backend)

- **Mirror the phone app exactly.** Firestore field names, status strings, Cloud Function names,
  payload keys, and write maps must match what `tablet_reminder` writes. The Phase 2 plan
  documents the verified signatures; treat them as the contract.
- **All doctor Cloud Functions are in `us-central1`** → use `functions` from `lib/firebase.ts`
  (no region override). Only AI/webhook/scheduler functions are `asia-south1` (not used here yet).
- **Mixed write model for appointments:** confirm / mark-arrived / mark-done are *direct*
  `appointments/{id}` updates; cancel / reject / no-show go through the `processCancellation`
  Cloud Function (`cancelledBy: 'provider'` or `'no_show'`); dismiss and penalty-settle are
  callables. Cancellations also delete the slot lock (`appointment_locks/{doctorUID}_{date}_{timeSlot}`)
  and release the patient–doctor guard — reproduce these.
- **Finance is READ-ONLY in the UI.** Cloud Functions write the authoritative finance/order docs;
  the portal only reads and renders them. Never compute money client-side.
- **uid:** read from `useAuth().user` (hooks) or `auth.currentUser` (actions). `settleDoctorPenaltyManually`
  requires `doctorId` to equal the caller's uid (server-enforced).
- **Firestore rules** live in `tablet_reminder/firestore.rules` and already permit the doctor's
  reads/writes. If you add a *new* read/write path and hit `Missing or insufficient permissions`,
  the rule (in that other repo) needs checking — flag it; do not work around it.
- If you must change actual Cloud Functions or rules, that's the `tablet_reminder` repo + Firebase
  deploy access + coordination (the same backend serves the live phone app). Don't deploy casually.

## Conventions

- TypeScript everywhere; keep the data/presentation seam intact.
- TDD the pure units (mappers, id/key helpers); hooks/actions are integration code verified by
  build + a live smoke test against a doctor account.
- Match the existing design tokens in `src/shared/design/tokens.css` (ported from the marketing
  site: grayscale neumorphic, DM Serif Display / Inter / JetBrains Mono).
- Commit frequently with clear messages; work on a feature branch, not `main`.
- Don't touch the repo root (marketing site) or commit a real `.env`.

## Known follow-ups

- Phase 3 wires the pages to the data layer; Phase 3a adds create flows (create patient,
  prescribe medication, order diagnostics).
- Minor hardening noted in reviews: a transient auth-state race in `shared/auth/AuthContext.tsx`
  on rapid sign-in/out; a firebase bundle code-split for size.
- Apple sign-in on web (Services ID + authorized domain) — Google-only for now.
