# Doctor Portal — Phase 1: Foundation, Auth & App Shell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `portal/` web app inside the existing `UMC-Website` repo so a doctor can sign in with Google, be role-gated, and land in the `/doctor` app shell with empty page stubs — structured as a multi-role app so Pharmacy/Diagnostics can be added later with zero rework of auth/design.

**Architecture:** A single React + Vite + TypeScript app under `portal/`. Shared, role-agnostic code lives in `src/shared/` (Firebase init, auth, design tokens); role-specific code in `src/roles/<role>/`. A pure `resolveRoleAccess(role, …)` decides routing; a `RequireRole` guard enforces it per route-subtree; a `RoleLanding` reads `users/{uid}.role` and redirects to `/{role}`. Only the **doctor** role-subtree is built in this phase.

**Tech Stack:** React 18, Vite, TypeScript, `react-router-dom` v6, `firebase` v11 (Auth + Firestore + Functions), Vitest + `@testing-library/react` + jsdom.

**Companion spec:** `docs/superpowers/specs/2026-06-11-doctor-web-portal-design.md`

**Where this runs:** Inside the existing repo at `/Users/anandkammasmacbook/StudioProjects/UMC-Website`, in a new `portal/` subdirectory. The build-less marketing site at the repo root is NOT touched. All `src/...` paths below are relative to `UMC-Website/portal/`.

---

## File Structure (created in this phase)

```
UMC-Website/
  portal/
    .env.example
    .gitignore
    index.html
    package.json
    tsconfig*.json
    vite.config.ts            # Vite + Vitest
    netlify.toml              # portal build (used by the 2nd Netlify site)
    public/_redirects         # SPA fallback
    src/
      main.tsx                # React root + Router + AuthProvider
      vite-env.d.ts
      app/
        App.tsx               # route table (login, wrong-role, RoleLanding, /doctor subtree)
        RoleLanding.tsx       # role → redirect
        LoginPage.tsx
        WrongRolePage.tsx
      shared/
        lib/firebase.ts
        auth/
          access.ts           # resolveRoleAccess() — PURE, tested
          access.test.ts
          AuthContext.tsx
          RequireRole.tsx
          RequireRole.test.tsx
        design/
          tokens.css
          base.css
      roles/
        doctor/
          DoctorShell.tsx     # sidebar nav + <Outlet/>
          pages/
            HomePage.tsx SchedulePage.tsx PatientsPage.tsx
            NotesPage.tsx FinancePage.tsx SettingsPage.tsx
    test/setup.ts
```

---

## Task 1: Scaffold the `portal/` Vite app inside the repo

**Files:**
- Create: `portal/` project via Vite template, plus `portal/vite.config.ts`, `portal/test/setup.ts`

- [ ] **Step 1: Create a feature branch**

Run from `/Users/anandkammasmacbook/StudioProjects/UMC-Website`:
```bash
git checkout -b feat/doctor-portal
```
Expected: switched to a new branch (keeps the portal off `main` until ready).

- [ ] **Step 2: Scaffold the Vite React-TS app into `portal/`**

Run from `UMC-Website/`:
```bash
npm create vite@latest portal -- --template react-ts
cd portal
npm install
```
Expected: a `portal/` folder with a working React-TS skeleton. (Do NOT run `git init` — the repo already exists at the root.)

- [ ] **Step 3: Install runtime + test dependencies**

Run from `UMC-Website/portal/`:
```bash
npm install firebase react-router-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 4: Configure Vite + Vitest**

Replace `portal/vite.config.ts` with:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
  },
})
```

- [ ] **Step 5: Add the test setup file**

Create `portal/test/setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add test scripts**

In `portal/package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Verify the test runner boots**

Run from `UMC-Website/portal/`:
```bash
npm run test
```
Expected: Vitest runs and reports "No test files found" (exit 0).

- [ ] **Step 8: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal
git commit -m "chore(portal): scaffold vite + react-ts + vitest"
```

---

## Task 2: Port design tokens and base styles (shared)

**Files:**
- Create: `portal/src/shared/design/tokens.css`, `portal/src/shared/design/base.css`
- Modify: `portal/index.html` (fonts/title)
- Delete: default `portal/src/index.css`, `portal/src/App.css` (and their imports)

- [ ] **Step 1: Create the design tokens**

Create `portal/src/shared/design/tokens.css` (values lifted from `../styles.css` of the marketing site):
```css
:root {
  --serif: 'DM Serif Display', 'DM Serif Text', Georgia, serif;
  --sans:  'Inter', system-ui, -apple-system, sans-serif;
  --mono:  'JetBrains Mono', 'SFMono-Regular', ui-monospace, monospace;

  --ease-out:   cubic-bezier(0.16, 1, 0.3, 1);
  --ease-inout: cubic-bezier(0.83, 0, 0.17, 1);

  --bg:        #e3e3e3;
  --bg-2:      #ededed;
  --bg-sunken: #d6d6d6;
  --ink:       #1c1c1c;
  --ink-soft:  #565656;
  --ink-faint: #8c8c8c;
  --line:      rgba(20,20,20,0.14);
  --line-2:    rgba(20,20,20,0.06);
  --shadow-dark:  rgba(150,150,150,0.55);
  --shadow-light: rgba(255,255,255,0.9);

  --neo-rest: 8px 12px 30px var(--shadow-dark), -5px -5px 16px var(--shadow-light);
}
```

- [ ] **Step 2: Create base styles**

Create `portal/src/shared/design/base.css`:
```css
* { box-sizing: border-box; }
html, body, #root { margin: 0; height: 100%; }
body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; }
```

- [ ] **Step 3: Wire fonts + title in index.html**

In `portal/index.html`, inside `<head>` add:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
```
Set `<title>UMC — Doctor Portal</title>`.

- [ ] **Step 4: Remove default template styles**

Delete `portal/src/index.css` and `portal/src/App.css`. (Their imports are removed when `main.tsx`/`App.tsx` are replaced in later tasks; if the template's `App.tsx` still imports `./App.css`, delete that import line now so the build stays green.)

- [ ] **Step 5: Verify build compiles**

Run from `portal/`:
```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal && git commit -m "feat(portal): port UMC design tokens, base styles, fonts"
```

---

## Task 3: Firebase initialization from env (shared)

**Files:**
- Create: `portal/src/shared/lib/firebase.ts`, `portal/.env.example`, `portal/.gitignore`
- Modify: `portal/src/vite-env.d.ts`

- [ ] **Step 1: Declare env var types**

Replace `portal/src/vite-env.d.ts` with:
```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FB_API_KEY: string
  readonly VITE_FB_AUTH_DOMAIN: string
  readonly VITE_FB_PROJECT_ID: string
  readonly VITE_FB_STORAGE_BUCKET: string
  readonly VITE_FB_MESSAGING_SENDER_ID: string
  readonly VITE_FB_APP_ID: string
}
interface ImportMeta { readonly env: ImportMetaEnv }
```

- [ ] **Step 2: Create the Firebase init module**

Create `portal/src/shared/lib/firebase.ts`:
```ts
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app)
```

- [ ] **Step 3: Create .env.example and ignore real env**

Create `portal/.env.example`:
```
VITE_FB_API_KEY=
VITE_FB_AUTH_DOMAIN=
VITE_FB_PROJECT_ID=
VITE_FB_STORAGE_BUCKET=
VITE_FB_MESSAGING_SENDER_ID=
VITE_FB_APP_ID=
```
Create `portal/.gitignore`:
```
node_modules
dist
.env
.env.local
```

- [ ] **Step 4: MANUAL — fill real values + authorized domains**

Firebase console → Project settings → "Your apps" → add a **Web app** → copy config into a local `portal/.env` (NOT committed) using the real `VITE_FB_*` values. Then Auth → Settings → Authorized domains → add `localhost` and `portal.unifiedmedicalcare.com`.

- [ ] **Step 5: Verify build**

Run from `portal/`:
```bash
npm run build
```
Expected: build succeeds (env is read at runtime; not required to build).

- [ ] **Step 6: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal && git commit -m "feat(portal): firebase init from env + .env.example"
```

---

## Task 4: `resolveRoleAccess` — pure, role-parameterized access decision (TDD)

**Files:**
- Create: `portal/src/shared/auth/access.ts`, `portal/src/shared/auth/access.test.ts`

Role-parameterized so the same logic guards `/doctor`, `/pharmacy`, `/diagnostics` later.

- [ ] **Step 1: Write the failing test**

Create `portal/src/shared/auth/access.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { resolveRoleAccess } from './access'

describe('resolveRoleAccess', () => {
  it('returns "loading" while auth state is unknown', () => {
    expect(resolveRoleAccess('doctor', { status: 'unknown', profile: null })).toBe('loading')
  })
  it('returns "unauthenticated" when signed out', () => {
    expect(resolveRoleAccess('doctor', { status: 'signed-out', profile: null })).toBe('unauthenticated')
  })
  it('returns "no-profile" when signed in but no users doc', () => {
    expect(resolveRoleAccess('doctor', { status: 'signed-in', profile: null })).toBe('no-profile')
  })
  it('returns "wrong-role" when the role does not match', () => {
    expect(resolveRoleAccess('doctor', { status: 'signed-in', profile: { role: 'pharmacy' } })).toBe('wrong-role')
  })
  it('returns "allow" when the role matches', () => {
    expect(resolveRoleAccess('doctor', { status: 'signed-in', profile: { role: 'doctor' } })).toBe('allow')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `portal/`:
```bash
npm run test -- src/shared/auth/access.test.ts
```
Expected: FAIL — cannot find module `./access`.

- [ ] **Step 3: Write the minimal implementation**

Create `portal/src/shared/auth/access.ts`:
```ts
export type AuthStatus = 'unknown' | 'signed-out' | 'signed-in'
export interface UserProfile { role: string }
export interface AccessInput {
  status: AuthStatus
  profile: UserProfile | null
}
export type Access = 'loading' | 'unauthenticated' | 'no-profile' | 'wrong-role' | 'allow'

export function resolveRoleAccess(role: string, { status, profile }: AccessInput): Access {
  if (status === 'unknown') return 'loading'
  if (status === 'signed-out') return 'unauthenticated'
  if (!profile) return 'no-profile'
  return profile.role === role ? 'allow' : 'wrong-role'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `portal/`:
```bash
npm run test -- src/shared/auth/access.test.ts
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal && git commit -m "feat(portal): resolveRoleAccess pure decision + tests"
```

---

## Task 5: AuthContext — Firebase auth state + user profile (shared)

**Files:**
- Create: `portal/src/shared/auth/AuthContext.tsx`

Uses `AuthStatus` and `UserProfile` from `./access`.

- [ ] **Step 1: Create the AuthContext**

Create `portal/src/shared/auth/AuthContext.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { AuthStatus, UserProfile } from './access'

interface AuthValue {
  status: AuthStatus
  user: User | null
  profile: UserProfile | null
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthCtx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('unknown')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (!u) { setProfile(null); setStatus('signed-out'); return }
      const snap = await getDoc(doc(db, 'users', u.uid))
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null)
      setStatus('signed-in')
    })
  }, [])

  const signInWithGoogle = async () => { await signInWithPopup(auth, new GoogleAuthProvider()) }
  const logout = async () => { await signOut(auth) }

  return (
    <AuthCtx.Provider value={{ status, user, profile, signInWithGoogle, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth(): AuthValue {
  const v = useContext(AuthCtx)
  if (!v) throw new Error('useAuth must be used within AuthProvider')
  return v
}
```

- [ ] **Step 2: Verify build**

Run from `portal/`:
```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal && git commit -m "feat(portal): AuthContext with Google sign-in + profile load"
```

---

## Task 6: RequireRole route guard (TDD)

**Files:**
- Create: `portal/src/shared/auth/RequireRole.tsx`, `portal/src/shared/auth/RequireRole.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `portal/src/shared/auth/RequireRole.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RequireRole } from './RequireRole'
import * as AuthModule from './AuthContext'

function renderAt(authValue: Partial<ReturnType<typeof AuthModule.useAuth>>) {
  vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
    status: 'signed-out', user: null, profile: null,
    signInWithGoogle: vi.fn(), logout: vi.fn(),
    ...authValue,
  } as ReturnType<typeof AuthModule.useAuth>)

  return render(
    <MemoryRouter initialEntries={['/doctor']}>
      <Routes>
        <Route path="/doctor" element={<RequireRole role="doctor" />}>
          <Route index element={<div>PROTECTED</div>} />
        </Route>
        <Route path="/login" element={<div>LOGIN</div>} />
        <Route path="/wrong-role" element={<div>WRONG ROLE</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireRole', () => {
  it('renders protected content for a matching role', () => {
    renderAt({ status: 'signed-in', profile: { role: 'doctor' } })
    expect(screen.getByText('PROTECTED')).toBeInTheDocument()
  })
  it('redirects an unauthenticated user to /login', () => {
    renderAt({ status: 'signed-out', profile: null })
    expect(screen.getByText('LOGIN')).toBeInTheDocument()
  })
  it('redirects a non-matching role to /wrong-role', () => {
    renderAt({ status: 'signed-in', profile: { role: 'pharmacy' } })
    expect(screen.getByText('WRONG ROLE')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `portal/`:
```bash
npm run test -- src/shared/auth/RequireRole.test.tsx
```
Expected: FAIL — cannot find module `./RequireRole`.

- [ ] **Step 3: Write the minimal implementation**

Create `portal/src/shared/auth/RequireRole.tsx`:
```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { resolveRoleAccess } from './access'

export function RequireRole({ role }: { role: string }) {
  const { status, profile } = useAuth()
  const access = resolveRoleAccess(role, { status, profile })

  if (access === 'loading') return <div style={{ padding: 40 }}>Loading…</div>
  if (access === 'unauthenticated') return <Navigate to="/login" replace />
  if (access === 'wrong-role' || access === 'no-profile') return <Navigate to="/wrong-role" replace />
  return <Outlet />
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `portal/`:
```bash
npm run test -- src/shared/auth/RequireRole.test.tsx
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal && git commit -m "feat(portal): RequireRole route guard + tests"
```

---

## Task 7: Login, Wrong-role, and RoleLanding (app)

**Files:**
- Create: `portal/src/app/LoginPage.tsx`, `portal/src/app/WrongRolePage.tsx`, `portal/src/app/RoleLanding.tsx`

- [ ] **Step 1: Create the LoginPage**

Create `portal/src/app/LoginPage.tsx`:
```tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../shared/auth/AuthContext'

export function LoginPage() {
  const { status, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (status === 'signed-in') navigate('/', { replace: true })  // RoleLanding routes by role
  }, [status, navigate])

  return (
    <main style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 48, margin: '0 0 8px' }}>UMC Portal</h1>
        <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>Sign in with your UMC account.</p>
        <button onClick={signInWithGoogle} style={{
          marginTop: 16, padding: '14px 26px', borderRadius: 999, border: '1px solid var(--line)',
          background: 'var(--bg-2)', boxShadow: 'var(--neo-rest)', cursor: 'pointer',
          fontFamily: 'var(--sans)', fontSize: 16,
        }}>Continue with Google</button>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Create the WrongRolePage**

Create `portal/src/app/WrongRolePage.tsx`:
```tsx
import { useAuth } from '../shared/auth/AuthContext'

export function WrongRolePage() {
  const { logout } = useAuth()
  return (
    <main style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <h1 style={{ fontFamily: 'var(--serif)' }}>No portal for this account yet</h1>
        <p style={{ color: 'var(--ink-soft)' }}>
          This account isn’t set up for a web portal. Use the UMC app, or sign in with a doctor account.
        </p>
        <button onClick={logout} style={{ marginTop: 12, padding: '10px 20px', borderRadius: 999,
          border: '1px solid var(--line)', background: 'var(--bg-2)', cursor: 'pointer' }}>Sign out</button>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Create the RoleLanding**

Create `portal/src/app/RoleLanding.tsx`:
```tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../shared/auth/AuthContext'

// Roles that currently have a web portal. Add 'pharmacy'/'diagnostics' here when built.
const SUPPORTED_ROLES = new Set(['doctor'])

export function RoleLanding() {
  const { status, profile } = useAuth()
  if (status === 'unknown') return <div style={{ padding: 40 }}>Loading…</div>
  if (status === 'signed-out') return <Navigate to="/login" replace />
  if (!profile || !SUPPORTED_ROLES.has(profile.role)) return <Navigate to="/wrong-role" replace />
  return <Navigate to={`/${profile.role}`} replace />
}
```

- [ ] **Step 4: Verify build**

Run from `portal/`:
```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal && git commit -m "feat(portal): login, wrong-role, and role-landing pages"
```

---

## Task 8: Doctor shell + page stubs (roles/doctor)

**Files:**
- Create: `portal/src/roles/doctor/DoctorShell.tsx` and six stubs under `portal/src/roles/doctor/pages/`

- [ ] **Step 1: Create the DoctorShell (sidebar)**

Create `portal/src/roles/doctor/DoctorShell.tsx`:
```tsx
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthContext'

const NAV = [
  { to: '/doctor', label: 'Home', end: true },
  { to: '/doctor/schedule', label: 'Schedule' },
  { to: '/doctor/patients', label: 'Patients' },
  { to: '/doctor/notes', label: 'Notes' },
  { to: '/doctor/finance', label: 'Finance' },
  { to: '/doctor/settings', label: 'Settings' },
]

export function DoctorShell() {
  const { user, logout } = useAuth()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: '100%' }}>
      <aside style={{ background: 'var(--bg-2)', borderRight: '1px solid var(--line)', padding: 24,
        display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, marginBottom: 20 }}>UMC · Doctor</div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} style={({ isActive }) => ({
            padding: '10px 14px', borderRadius: 10, textDecoration: 'none',
            fontFamily: 'var(--sans)', color: isActive ? 'var(--bg)' : 'var(--ink)',
            background: isActive ? 'var(--ink)' : 'transparent',
          })}>{n.label}</NavLink>
        ))}
        <div style={{ marginTop: 'auto', fontSize: 12, color: 'var(--ink-faint)' }}>
          <div>{user?.email}</div>
          <button onClick={logout} style={{ marginTop: 8, background: 'none', border: 'none',
            color: 'var(--ink-soft)', cursor: 'pointer', padding: 0 }}>Sign out</button>
        </div>
      </aside>
      <main style={{ padding: 40, overflowY: 'auto' }}><Outlet /></main>
    </div>
  )
}
```

- [ ] **Step 2: Create the six page stubs**

`portal/src/roles/doctor/pages/HomePage.tsx`:
```tsx
export function HomePage() { return <h1 style={{ fontFamily: 'var(--serif)' }}>Home</h1> }
```
`portal/src/roles/doctor/pages/SchedulePage.tsx`:
```tsx
export function SchedulePage() { return <h1 style={{ fontFamily: 'var(--serif)' }}>Schedule</h1> }
```
`portal/src/roles/doctor/pages/PatientsPage.tsx`:
```tsx
export function PatientsPage() { return <h1 style={{ fontFamily: 'var(--serif)' }}>Patients</h1> }
```
`portal/src/roles/doctor/pages/NotesPage.tsx`:
```tsx
export function NotesPage() { return <h1 style={{ fontFamily: 'var(--serif)' }}>Notes</h1> }
```
`portal/src/roles/doctor/pages/FinancePage.tsx`:
```tsx
export function FinancePage() { return <h1 style={{ fontFamily: 'var(--serif)' }}>Finance</h1> }
```
`portal/src/roles/doctor/pages/SettingsPage.tsx`:
```tsx
export function SettingsPage() { return <h1 style={{ fontFamily: 'var(--serif)' }}>Settings</h1> }
```

- [ ] **Step 3: Verify build**

Run from `portal/`:
```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal && git commit -m "feat(portal): doctor shell + page stubs"
```

---

## Task 9: Wire the router and providers

**Files:**
- Modify: `portal/src/app/App.tsx` (create), `portal/src/main.tsx`
- Delete: default `portal/src/App.tsx` content (replace it)

- [ ] **Step 1: Define the route table**

Replace `portal/src/App.tsx` with:
```tsx
import { Routes, Route } from 'react-router-dom'
import { RequireRole } from '../shared/auth/RequireRole'
import { RoleLanding } from './RoleLanding'
import { LoginPage } from './LoginPage'
import { WrongRolePage } from './WrongRolePage'
import { DoctorShell } from '../roles/doctor/DoctorShell'
import { HomePage } from '../roles/doctor/pages/HomePage'
import { SchedulePage } from '../roles/doctor/pages/SchedulePage'
import { PatientsPage } from '../roles/doctor/pages/PatientsPage'
import { NotesPage } from '../roles/doctor/pages/NotesPage'
import { FinancePage } from '../roles/doctor/pages/FinancePage'
import { SettingsPage } from '../roles/doctor/pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/wrong-role" element={<WrongRolePage />} />
      <Route path="/" element={<RoleLanding />} />
      <Route path="/doctor" element={<RequireRole role="doctor" />}>
        <Route element={<DoctorShell />}>
          <Route index element={<HomePage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
```
> Note: `App.tsx` now lives in `src/app/`, so imports reach up one level (`../shared`, `../roles`).

- [ ] **Step 2: Mount providers and router**

Replace `portal/src/main.tsx` with:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './shared/design/tokens.css'
import './shared/design/base.css'
import { AuthProvider } from './shared/auth/AuthContext'
import App from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
```

- [ ] **Step 3: Run the full test suite**

Run from `portal/`:
```bash
npm run test
```
Expected: PASS — 8 tests (5 from access, 3 from RequireRole).

- [ ] **Step 4: Verify build**

Run from `portal/`:
```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 5: MANUAL — smoke test sign-in**

With a real `portal/.env` set, run `npm run dev` and open the local URL. Using a doctor test account (e.g. `iyYwg9woPdg6OiTTFBaROF6zrL13`): Google sign-in → `/` → redirected to `/doctor` Home with the sidebar. A non-doctor account → `/wrong-role`.

- [ ] **Step 6: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal && git commit -m "feat(portal): wire router, role guard, auth provider"
```

---

## Task 10: Netlify deploy config (second site)

**Files:**
- Create: `portal/netlify.toml`, `portal/public/_redirects`

- [ ] **Step 1: Add Netlify build config (relative to base dir)**

Create `portal/netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"
```
(The second Netlify site sets **Base directory = `portal`**, so `command`/`publish` are relative to `portal/`. The root marketing site's deploy is unaffected.)

- [ ] **Step 2: Add SPA redirect**

Create `portal/public/_redirects`:
```
/*  /index.html  200
```

- [ ] **Step 3: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal && git commit -m "chore(portal): netlify SPA build + redirect config"
```

- [ ] **Step 4: MANUAL — create the second Netlify site + DNS**

In Netlify: "Add new site" from the same `UMC-Website` repo, set **Base directory = `portal`**. Add the six `VITE_FB_*` env vars under Site settings → Environment. Point `portal.unifiedmedicalcare.com` (a CNAME/subdomain) at this site. Confirm the domain is in Firebase Auth authorized domains (Task 3).

---

## Phase 1 Done — Definition of Done

- `npm run test` passes (8 tests) and `npm run build` succeeds, both from `portal/`.
- A doctor account signs in with Google and reaches `/doctor` with the sidebar; non-doctors hit `/wrong-role`; signed-out users hit `/login`.
- Structure supports adding `roles/pharmacy/` + `roles/diagnostics/` later with no change to `shared/`.
- Deployable as a second Netlify site (base dir `portal/`) at `portal.unifiedmedicalcare.com`; marketing site untouched.

**Follow-ups (not in this phase):**
- Marketing site: add the quiet "Beta tester? Sign in →" link → portal subdomain.
- Apple sign-in on web (Services ID + authorized domain).

**Next:** Plan 2 — Data Layer (`src/roles/doctor/data/` typed models + hooks over Firestore and the existing Cloud Functions).
