# Doctor Web Portal — Design Spec

**Date:** 2026-06-11
**Status:** Approved design, pending spec review → implementation plan
**Owner (backend/wiring):** Anand · **Owner (design/UI elevation):** brother

---

## 1. Summary

A functional web portal for **doctors** on Unified Medical Care (UMC), reachable from the
existing marketing site. Doctors sign in with their existing UMC account and do their work
— schedule, appointments, patients, notes, finance, settings — from a desktop browser. It is
a **web counterpart to the doctor side of the existing Flutter phone app**
(`../tablet_reminder`), reusing the **same Firebase backend** (Firestore, Cloud Functions,
Auth).

Two distinct destinations behind one front door:
- **Newcomers** → the existing cinematic marketing experience (unchanged).
- **Existing doctors** → a quiet "Beta tester? Sign in →" link → the portal.

### Goals
- Full feature parity with the phone app's doctor role, **including write/create flows**
  (create patient, add medication, order diagnostics) in v1.
- The backend is **completely wired and functional** at handoff; the UI is **functional but
  plain**. The brother then elevates the design on top of a working app.
- A clean, enforced seam between **data/logic** and **presentation** so design iteration is
  safe and never touches data or money flows.

### Non-goals
- No new backend / server. The Firebase project, Firestore schema, and Cloud Functions
  already exist and are shared with the phone app.
- No changes to the marketing site beyond adding one sign-in link.
- Mobile-only features (push notifications, local alarms, vibration, native geolocation) are
  not ported; web equivalents (e.g. browser notifications) are out of scope for v1.

---

## 2. Core architectural principle — two layers, one seam

Every source file belongs to exactly one layer:

- **Data/logic layer (Anand owns; fully wired before handoff):** Firebase init, auth, typed
  models, and hooks/functions. All **reads** hit Firestore directly; all **writes/actions**
  call the **existing Cloud Functions**. No business logic is reimplemented — the rule
  "Cloud Functions write, UI reads" (from the app's architecture) is preserved.
- **Presentation layer (brother owns; iterates freely):** design tokens, neumorphic component
  primitives, and page layouts. Consumes hooks only.

**The enforced rule:** a component never imports `firebase` — it only imports a hook from
`src/data/`. This makes restyle/relayout safe by construction.

---

## 3. Tech stack

- **React + Vite + TypeScript** — TypeScript makes the data/presentation contract real and
  enforced.
- **React Router** — page routing.
- **Firebase JS SDK** — Auth, Firestore, Cloud Functions (`httpsCallable`).
- **Firestore `onSnapshot` listeners** — live updates for schedule/home, matching the app's
  stream-based UI.
- **Styling: plain CSS driven by custom-property tokens**, ported from the marketing site's
  `styles.css` (`--ink`, `--bg-2`, neumorphic shadow vars; DM Serif Display / Inter /
  JetBrains Mono). No CSS framework — keeps the look consistent and the editing idiom familiar.
- **Data fetching:** lightweight hooks over `onSnapshot`/`getDoc`. (A query cache like TanStack
  Query is optional and can be added later; not required for v1.)

---

## 4. Project structure & deploy

**One repo (monorepo): keep the portal inside the existing `UMC-Website` repo**, in a
`portal/` subdirectory. The build-less marketing site stays at the repo root, untouched; the
portal is a self-contained Vite app under `portal/`. Rationale: the doctor portal, plus the
planned **Pharmacy** and **Diagnostics** portals, all share one Firebase backend, one design
system, and one auth mechanism — keeping them in one repo (and one app) maximizes reuse and
avoids drift across three codebases. (Firebase *web* config keys are not secrets, so a public
repo is fine; the real `.env` stays gitignored.)

**One app, many roles.** The portal is a *single* React app that routes by role after login,
mirroring the phone app's "one binary, many roles" model. Doctor ships first; Pharmacy and
Diagnostics are added later as sibling role-subtrees that reuse the shared auth + design +
data primitives. Routes are namespaced per role: `/doctor/*`, later `/pharmacy/*`,
`/diagnostics/*`. A `RoleLanding` at `/` reads `users/{uid}.role` and redirects accordingly.

**Deploy:** a **second Netlify site** pointed at the same repo with **base directory
`portal/`**, building to `portal/dist`, served at `portal.unifiedmedicalcare.com`. The
existing marketing Netlify site (repo root) is unchanged. Subdomain, not a path, because the
root site is build-less and the portal needs a Vite build — two sites, one repo.

**Marketing site change:** add a single quiet "Beta tester? Sign in →" link at the root site
pointing at `portal.unifiedmedicalcare.com`. No other changes.

**Shared-vs-role layering** (the §2 seam still holds, now with a role axis):

```
UMC-Website/
  index.html, *.jsx, styles.css   ← marketing (root Netlify site, unchanged)
  portal/                          ← Vite app (second Netlify site, base dir = portal/)
    src/
      app/
        App.tsx                    ← top-level router: login, role landing, role subtrees
        RoleLanding.tsx            ← reads users/{uid}.role → redirect to /{role}
        LoginPage.tsx, WrongRolePage.tsx
      shared/                       (Anand — reused by every role)
        lib/firebase.ts            ← Firebase init
        auth/                      ← AuthContext, resolveRoleAccess(), RequireRole guard
        design/                    ← tokens.css, base.css (ported), NeoCard/NeoButton (brother)
      roles/
        doctor/                     (built now)
          DoctorShell.tsx, DoctorRoutes
          data/                    ← typed models + hooks (Anand)
          pages/                   ← Home, Schedule, Patients, Notes, Finance, Settings (brother)
        pharmacy/   (later)
        diagnostics/ (later)
```

---

## 5. Feature map → routes

Role-agnostic: `/login`, `/wrong-role`, and `/` (RoleLanding → redirects to `/{role}`).
Doctor routes are namespaced under `/doctor`:

| Route | Mirrors app screen | Reads (Firestore) | Actions (existing Cloud Functions) |
|---|---|---|---|
| `/login` | Sign-in | — | Google auth (Apple next) |
| `/doctor` (Home) | `doctor_home_screen` | today's appointments, reports to review, smart cards | — |
| `/doctor/schedule` | `doctor_appointments_screen` | `appointments` where `doctorUID == uid` | `confirmByDoctor`, `rejectByDoctor`, `markConsultationDoneByDoctor`, `cancelByDoctor`, `markPatientNoShow`, `dismissAppointmentByDoctor` |
| `/doctor/patients` | `doctor_dashboard` | `doctors/{uid}/createdPatients` | create patient (Cloud Function / batched write per app) |
| `/doctor/patients/:id` | `patient_details_view` | createdPatient doc, `…/tablets`, `patientGroups/{id}/medicationLogs` | add medication, order diagnostics |
| `/doctor/notes` | `medical_notes_screen` | `doctors/{uid}/createdPatients/{pg}/notes` | create/update note (voice playback if present; recording optional) |
| `/doctor/finance` | `doctor_finances_screen` | `doctors/{uid}/finance/{summary,transactions,pending,completed}` | read-only (optionally `settleDoctorPenaltyManually`) |
| `/doctor/settings` | `consultation_settings_screen` | `doctors/{uid}/consultationSettings/settings` | write settings (fee, slot duration, days/hours, clinic, location, accepting toggle) |

---

## 6. Data model (from the existing backend — read-only reference)

Mirrored as TypeScript types in `src/data/types.ts`. Source of truth is the live Firestore
schema used by the phone app.

- **`users/{doctorUID}`** — `fullName`, `email`, `phone`, `role: 'doctor'`,
  `registrationNumber`, `stateOfRegistration`, `timezone`, `specialities: string[]`, `fcmToken`.
- **`doctors/{doctorUID}`** — `phone`, `registrationNumber`, `stateOfRegistration`,
  `heldPayoutAmount`, `razorpayAccountStatus`, `verificationStatus`, `kycStatus`.
  - `…/createdPatients/{patientGroupID}` — demographics, `hasAddedDoctor`, `linkedAt`, `createdAt`.
    - `…/tablets/{tabletId}` — medication + schedule + `prescribedBy(UID)`, `createdByDoctor`.
    - `…/notes/{noteId}` — `content`, `voiceNoteUrl?`, `appointmentId`, timestamps, `createdByDoctor`.
  - `…/consultationSettings/settings` — `fee`, `slotDuration`, `workingDays[]`, `startTime`,
    `endTime`, `clinicName`, `clinicAddress`, `clinicLocation` (GeoPoint), `isAcceptingAppointments`.
  - `…/finance/summary` — lifetime + `byMonth.{YYYY_MM}.*` rollups, `outstandingPenalty`.
  - `…/finance/transactions/records/{id}` — payout log.
  - `…/finance/pending|completed/records/{id}` — penalties (pending vs settled).
- **`appointments/{id}`** — `doctorUID`, `patientUID`, `patientGroupID`, `date`, `timeSlot`,
  `slotDuration`, `fee`, clinic fields, `reasonForVisit`, `status` (lifecycle), `paymentStatus`,
  `escrowHeld`, `paymentAmount`, dual-confirm flags, `dismissedByDoctor`, timestamps.
- **`appointment_locks/{doctorUID}_{date}_{timeSlot}`** — slot ownership (selection/booking).
- **`patientGroups/{id}`** — patient container; `doctor_uids[]`, `caregivers[]`, tablets,
  `medicationLogs` (adherence; read-only to doctor).
- **`DoctorSpecialties/doctorSpecialities`** — curated speciality list for onboarding.

> Finance reads only — the finance map is authoritative and written exclusively by Cloud
> Functions. The UI never computes or mutates finance numbers.

---

## 7. Auth & security

- **Google sign-in** works out of the box on web → ship first.
- **Apple-on-web** needs extra setup (a Services ID + adding `portal.unifiedmedicalcare.com`
  to Firebase Auth authorized domains) → add immediately after Google.
- Role is read from `users/{uid}.role`; the route guard admits only `role == 'doctor'` and
  redirects others to a "use the app / wrong role" screen.
- **Firestore rules are platform-agnostic and already gate doctor data correctly** — no rules
  changes needed for reads/writes the app already performs. If the web introduces any *new*
  write path, re-check `firestore.rules` first (many fields are server-mutated only).
- **App Check for web** (reCAPTCHA) is a later hardening step, consistent with the app's
  "enforce App Check before production" note.

---

## 8. Build order

1. **Foundation** — repo, Vite + TS, `lib/firebase.ts`, auth + route guard. A doctor can log
   in and land on an empty shell gated to `role == 'doctor'`.
2. **Data layer** — all typed models + hooks in `src/data/`, verified against real Firestore
   data and real Cloud Function calls. *(The bulk of Anand's work.)*
3. **Functional-but-plain UI** — every route wired and working end-to-end with minimal styling
   and the token system in place. Includes the v1 write/create flows.
4. **Handoff** — brother takes the working app and elevates the design via the token +
   component system, never touching `src/data` or `src/lib`.

---

## 9. Open items / follow-ups (non-blocking)

- Voice-note **recording** on web (MediaRecorder) — playback is in v1; recording can be a
  fast follow.
- DNS for `portal.unifiedmedicalcare.com` and a Netlify site for the new repo.
- Confirm whether create-patient and diagnostic-ordering go through Cloud Functions or
  batched client writes in the app, and mirror that exact path on web.
