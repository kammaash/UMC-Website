# Doctor Portal — Responsive Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the doctor portal layout adapt gracefully when the user resizes their laptop browser window (~700px–1400px+ viewport widths).

**Architecture:** Two CSS breakpoints (1099px, 819px) drive sidebar width and main padding; a third (640px) collapses multi-column grids to single column and stacks the PageHeader action. Shell layout moves from DoctorShell inline styles into CSS classes so breakpoints can override them. Nav labels are wrapped in `.umc-shell-label` spans and hidden at icon-only width.

**Tech Stack:** React 18, TypeScript, Vite, plain CSS (no CSS-in-JS, no preprocessors).

## Global Constraints

- Never import Firebase directly in page/component files — only via `data/` hooks and actions.
- Do not modify any file outside `portal/`.
- Preserve the existing neumorphic design token system (`tokens.css`, `neo.css`).
- No new npm dependencies.
- Build command: `cd portal && npm run build` (runs `tsc -b && vite build`).
- Dev server: `cd portal && npm run dev` → http://localhost:5173.

---

## File Map

| File | Change |
|---|---|
| `portal/src/shared/design/neo.css` | Add `.umc-shell`, `.umc-shell-aside`, `.umc-shell-main`, `.umc-shell-label` with two breakpoints; update `.umc-page-head` to own its flex layout; update `.umc-tabs`; add 640px breakpoint for grids. |
| `portal/src/roles/doctor/DoctorShell.tsx` | Replace inline grid/padding styles with CSS classes; wrap nav labels in `.umc-shell-label`; add `title` attrs to NavLinks. |
| `portal/src/shared/design/primitives.tsx` | Remove inline flex styles from `PageHeader` div (moved to CSS). |

---

## Task 1 — Add responsive shell + grid CSS to `neo.css`

**Files:**
- Modify: `portal/src/shared/design/neo.css`

**Produces:** `.umc-shell`, `.umc-shell-aside`, `.umc-shell-main`, `.umc-shell-label` classes with two shell breakpoints; updated `.umc-page-head`; updated `.umc-tabs`; new 640px grid breakpoint.

- [ ] **Step 1: Open `neo.css` and add the shell layout block**

After the existing `/* ── Page scaffold ──` block (after line 8, before `/* ── Cards`), insert:

```css
/* ── Shell layout (DoctorShell sidebar + main) ──────────────────── */
.umc-shell { display: grid; grid-template-columns: 256px 1fr; height: 100%; background: var(--surface); }
.umc-shell-aside { padding: 28px 20px; }
.umc-shell-main  { padding: 48px 56px; overflow-y: auto; }

@media (max-width: 1099px) {
  .umc-shell      { grid-template-columns: 200px 1fr; }
  .umc-shell-main { padding: 40px 32px; }
}
@media (max-width: 819px) {
  .umc-shell       { grid-template-columns: 64px 1fr; }
  .umc-shell-aside { padding: 16px 6px; }
  .umc-shell-main  { padding: 32px 20px; }
  .umc-shell-label { display: none; }
}
```

- [ ] **Step 2: Update `.umc-page-head` to own its flex layout**

Find the existing `.umc-page-head` rule:
```css
.umc-page-head { margin-bottom: 28px; }
```

Replace it with:
```css
.umc-page-head {
  margin-bottom: 28px;
  display: flex; align-items: flex-end; justify-content: space-between; gap: 24px;
}
@media (max-width: 640px) {
  .umc-page-head { flex-direction: column; align-items: flex-start; gap: 16px; }
}
```

- [ ] **Step 3: Add `flex-wrap` to `.umc-tabs`**

Find:
```css
.umc-tabs { display: inline-flex; gap: 4px; padding: 5px; border-radius: var(--r-pill);
  background: var(--surface); box-shadow: var(--neo-input); margin-bottom: 24px; }
```

Replace with:
```css
.umc-tabs { display: inline-flex; flex-wrap: wrap; gap: 4px; padding: 5px; border-radius: var(--r-pill);
  background: var(--surface); box-shadow: var(--neo-input); margin-bottom: 24px; }
```

- [ ] **Step 4: Add 640px grid breakpoint**

Find the existing grid media query block at the bottom of the utility section:
```css
@media (max-width: 880px) {
  .umc-grid.c3, .umc-grid.c4 { grid-template-columns: 1fr 1fr; }
}
```

Add immediately after it:
```css
@media (max-width: 640px) {
  .umc-grid.c2, .umc-grid.c3, .umc-grid.c4 { grid-template-columns: 1fr; }
}
```

- [ ] **Step 5: Verify the CSS file builds**

```bash
cd /Users/gayani/UMC-Website/portal && npm run build
```

Expected: build completes with no errors (Vite will bundle the CSS). TypeScript errors are irrelevant here since we haven't changed TSX yet.

- [ ] **Step 6: Commit**

```bash
cd /Users/gayani/UMC-Website
git add portal/src/shared/design/neo.css
git commit -m "feat(portal): responsive shell + grid CSS — breakpoints at 1099/819/640px"
```

---

## Task 2 — Update `DoctorShell.tsx` to use CSS classes

**Files:**
- Modify: `portal/src/roles/doctor/DoctorShell.tsx`

**Consumes:** `.umc-shell`, `.umc-shell-aside`, `.umc-shell-main`, `.umc-shell-label` from Task 1.

**Produces:** A `DoctorShell` component whose layout is driven by CSS classes, with nav labels wrapped in `.umc-shell-label` spans and `title` attributes on every `NavLink`.

- [ ] **Step 1: Replace the component with the new implementation**

Replace the entire contents of `portal/src/roles/doctor/DoctorShell.tsx` with:

```tsx
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthContext'
import { Icon } from '../../shared/design/icons'

const NAV = [
  { to: '/dashboard', label: 'Home', icon: 'eventAvailable', end: true },
  { to: '/dashboard/schedule', label: 'Schedule', icon: 'calendar' },
  { to: '/dashboard/patients', label: 'Patients', icon: 'people' },
  { to: '/dashboard/notes', label: 'Notes', icon: 'description' },
  { to: '/dashboard/finance', label: 'Finance', icon: 'payments' },
  { to: '/dashboard/settings', label: 'Settings', icon: 'settings' },
]

export function DoctorShell() {
  const { user, profile, logout } = useAuth()
  const name = (profile as { fullName?: string } | null)?.fullName
  return (
    <div className="umc-shell">
      <aside className="umc-shell-aside" style={{
        background: 'var(--surface)', borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ padding: '0 8px 8px' }}>
          <div className="umc-shell-label" style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 4 }}>
            Unified Medical Care
          </div>
          <div className="umc-shell-label" style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--ink)' }}>Doctor</div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 16 }}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} title={n.label} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', borderRadius: 'var(--r-md)', textDecoration: 'none',
              fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 600,
              color: isActive ? 'var(--surface)' : 'var(--ink-soft)',
              background: isActive ? 'var(--ink)' : 'transparent',
              boxShadow: isActive ? 'var(--neo-cta)' : 'none',
              transition: 'background .2s, color .2s',
            })}>
              <Icon name={n.icon} size={19} />
              <span className="umc-shell-label">{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: '0 8px' }}>
          <div className="umc-shell-label" style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            {name || 'Doctor'}
          </div>
          <div className="umc-shell-label" style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.email}
          </div>
          <button onClick={logout} style={{
            marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
            color: 'var(--ink-soft)', cursor: 'pointer', padding: 0, fontFamily: 'var(--sans)', fontSize: 13,
          }}>
            <Icon name="logout" size={16} />
            <span className="umc-shell-label">Sign out</span>
          </button>
        </div>
      </aside>

      <main className="umc-shell-main"><Outlet /></main>
    </div>
  )
}
```

Key changes from the original:
- Outer `div` loses all inline style → uses `className="umc-shell"`
- `aside` padding moves to `className="umc-shell-aside"`; remaining inline styles (background, border, flex) stay
- `main` loses inline style → uses `className="umc-shell-main"`
- Brand text and "Doctor" heading each wrapped in `<span className="umc-shell-label">` (hides at ≤819px)
- Each `NavLink` gains `title={n.label}` (tooltip when labels hidden)
- Nav label text wrapped in `<span className="umc-shell-label">`
- User name, email, "Sign out" text each wrapped in `<span className="umc-shell-label">`

- [ ] **Step 2: Build to confirm no TypeScript errors**

```bash
cd /Users/gayani/UMC-Website/portal && npm run build
```

Expected: exits 0. If TypeScript errors appear they will reference line numbers — fix them before committing.

- [ ] **Step 3: Commit**

```bash
cd /Users/gayani/UMC-Website
git add portal/src/roles/doctor/DoctorShell.tsx
git commit -m "feat(portal): DoctorShell uses responsive CSS classes, nav labels hidden at icon-only width"
```

---

## Task 3 — Update `PageHeader` in `primitives.tsx`

**Files:**
- Modify: `portal/src/shared/design/primitives.tsx`

**Why:** `PageHeader` has `style={{ display: 'flex', alignItems: 'flex-end', ... }}` as an inline style on its wrapper div. Inline styles beat CSS, so the `@media (max-width: 640px)` rule added in Task 1 cannot override `flex-direction`. Moving those properties to the `.umc-page-head` CSS class (already done in Task 1) means the media query now works.

**Consumes:** Updated `.umc-page-head` from Task 1 (now owns `display: flex; align-items: flex-end; justify-content: space-between; gap: 24px`).

- [ ] **Step 1: Remove inline flex from `PageHeader`**

Find the `PageHeader` function in `portal/src/shared/design/primitives.tsx`. It currently reads:

```tsx
export function PageHeader({ eyebrow, title, subtitle, action, large }: {
  eyebrow?: string; title: string; subtitle?: string; action?: ReactNode; large?: boolean
}) {
  return (
    <div className="umc-page-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
      <div>
        {eyebrow && <p className="umc-eyebrow">{eyebrow}</p>}
        <h1 className={`umc-title${large ? ' lg' : ''}`}>{title}</h1>
        {subtitle && <p className="umc-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
```

Replace the opening div line only — remove the `style` prop:

```tsx
export function PageHeader({ eyebrow, title, subtitle, action, large }: {
  eyebrow?: string; title: string; subtitle?: string; action?: ReactNode; large?: boolean
}) {
  return (
    <div className="umc-page-head">
      <div>
        {eyebrow && <p className="umc-eyebrow">{eyebrow}</p>}
        <h1 className={`umc-title${large ? ' lg' : ''}`}>{title}</h1>
        {subtitle && <p className="umc-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
```

- [ ] **Step 2: Build to confirm no errors**

```bash
cd /Users/gayani/UMC-Website/portal && npm run build
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/gayani/UMC-Website
git add portal/src/shared/design/primitives.tsx
git commit -m "feat(portal): move PageHeader flex layout to CSS so 640px breakpoint can override it"
```

---

## Task 4 — Visual verification

**Files:** None (read-only verification step)

This task has no automated tests — layout is verified by eye. Run the dev server and resize the window through the three breakpoints on each page.

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/gayani/UMC-Website/portal && npm run dev
```

Sign in with a doctor test account to reach `/dashboard`.

- [ ] **Step 2: Check ≥1100px (wide laptop)**

At full window width:
- Sidebar is 256px with icon + label text for all 6 nav items
- Brand header ("Unified Medical Care" / "Doctor") is visible
- User name, email, Sign out label are visible
- `main` has 48px top/bottom and 56px left/right padding
- Home page: 3-column stat grid (`c3`) — 3 columns
- Finance / Patients: 2-column grid (`c2`) — 2 columns
- Schedule tabs: all 4 tabs on one row

- [ ] **Step 3: Check 820–1099px (mid laptop)**

Resize window to ~950px wide:
- Sidebar narrows to 200px — labels still visible
- `main` padding reduces to 40px 32px
- All page content fits without horizontal scroll

- [ ] **Step 4: Check <820px (narrow window)**

Resize window to ~750px wide:
- Sidebar is 64px — only icons visible (labels hidden)
- Hovering a nav icon shows the browser tooltip with the page name
- Brand text hidden, just a small gap at top of sidebar
- User name and email hidden; only the logout icon remains
- `main` padding is 32px 20px
- Home page 3-col stat grid collapses to 2-col (880px rule already covers this)

- [ ] **Step 5: Check ≤640px (very narrow)**

Resize window to ~620px wide (uncommon on laptops but the grid/header rules still apply):
- All `c2`, `c3`, `c4` grids collapse to 1-column (stats stack vertically)
- `PageHeader` with action: title block stacks above the "New note" button (Notes page)
- No horizontal overflow anywhere
- Schedule tabs wrap to a second line if they don't fit in one row

- [ ] **Step 6: Final build check**

```bash
cd /Users/gayani/UMC-Website/portal && npm run build
```

Expected: exits 0, no errors or warnings about missing exports.
