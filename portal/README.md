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

Add `localhost` and the deploy domain (`unifiedmedicalcare.com`) to Firebase Auth →
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

Deployment is automated via GitHub Actions (`.github/workflows/deploy-portal.yml`): on every
push to `main`, the workflow builds `portal/` (`npm ci && npm run build`, with the `VITE_*`
secrets injected as env), copies `portal/dist/` into the repo-root `member/` folder, and writes
a `/login` entry that reuses the same bundle. Those folders are committed back to `main` and
served by GitHub Pages (custom domain `unifiedmedicalcare.com`, see the root `CNAME`) at
`unifiedmedicalcare.com/member` and `unifiedmedicalcare.com/login`. The marketing site is the
repo root itself, served from the same Pages site.
