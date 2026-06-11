# UMC Portal

Web portal for Unified Medical Care providers. Single multi-role React app (Vite + TypeScript)
that signs providers in against the same Firebase backend as the phone app and routes by role.
**Doctor** is the first role; Pharmacy and Diagnostics are added later as sibling role-subtrees.

## Develop

```bash
npm install
cp .env.example .env   # fill in the Firebase web config (see below)
npm run dev            # local dev server
npm run test           # unit tests (Vitest)
npm run build          # production build → dist/
```

## Environment

Create a `.env` (gitignored) with the Firebase **Web app** config from the Firebase console
(Project settings → Your apps → Web app):

```
VITE_FB_API_KEY=
VITE_FB_AUTH_DOMAIN=
VITE_FB_PROJECT_ID=
VITE_FB_STORAGE_BUCKET=
VITE_FB_MESSAGING_SENDER_ID=
VITE_FB_APP_ID=
```

Add `localhost` and the deploy domain (`portal.unifiedmedicalcare.com`) to Firebase Auth →
Settings → Authorized domains.

## Structure

```
src/
  app/        route table, RoleLanding, Login, WrongRole
  shared/     role-agnostic: firebase init, auth (AuthContext, RequireRole), design tokens
  roles/
    doctor/   DoctorShell + pages (Home, Schedule, Patients, Notes, Finance, Settings)
```

The seam: components consume hooks from the data layer; they never import `firebase` directly.
Shared code has no role-specific coupling, so a new role = a new `roles/<role>/` folder + one
route, with no changes to `shared/`.

## Deploy

A dedicated Netlify site points at this repo with **base directory `portal/`**
(`netlify.toml` builds to `dist/`, `public/_redirects` provides the SPA fallback), served at
`portal.unifiedmedicalcare.com`. The marketing site at the repo root is a separate Netlify site.
