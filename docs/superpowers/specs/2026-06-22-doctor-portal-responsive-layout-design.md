# Doctor Portal — Responsive Layout Design

**Date:** 2026-06-22
**Branch:** portal-clinic-aesthetic
**Status:** Approved, ready for implementation

## Problem

The doctor portal is desktop-only. All layout measurements are fixed (256px sidebar, 56px padding, rigid grid columns). When a user resizes their laptop browser window the sidebar and content do not adapt, causing content to be squeezed or overflow.

## Goal

Make the portal resize gracefully across a ~700px–1400px+ viewport range typical of laptop window resizing. No mobile or phone support is required.

## Approach

Media-query breakpoints at `1100px` and `820px`. Two breakpoints cover the full laptop range cleanly. All layout lives in CSS classes — no JavaScript state changes needed.

## Files

- `portal/src/shared/design/neo.css` — responsive rules (new and updated media query blocks)
- `portal/src/roles/doctor/DoctorShell.tsx` — replace inline grid/padding styles with `umc-shell` CSS class

No individual page files need changes.

## Section 1 — DoctorShell

Replace the inline `style` on the outer grid div and `<main>` with a CSS class `umc-shell` and `umc-shell-main`.

### `umc-shell` (outer grid)

| Viewport | Sidebar column | Behaviour |
|---|---|---|
| ≥1100px | 256px | Full sidebar with icon + label |
| 820–1099px | 200px | Narrowed sidebar, labels still visible |
| <820px | 56px | Icon-only sidebar, labels hidden |

### `umc-shell-main` (main content area)

| Viewport | Padding |
|---|---|
| ≥1100px | 48px 56px |
| 820–1099px | 40px 32px |
| <820px | 32px 24px |

### Sidebar label visibility

At `<820px`, `.umc-shell-label` elements (wrapping nav link text) get `display: none`. Icons remain fully clickable. Each `<NavLink>` gets a `title` attribute equal to the nav label so browser tooltips appear on hover — no JS needed.

### Sidebar `aside` padding

Reduce from `28px 20px` to `16px 12px` at `<820px` so icon-only links stay centred.

## Section 2 — Grids

Add a `640px` breakpoint to collapse all column grids to single-column:

```
≥880px   c3 → 3-col, c4 → 4-col (existing)
641–880px  c3 → 2-col, c4 → 2-col (existing)
≤640px   c2 → 1-col, c3 → 1-col, c4 → 1-col (new)
```

Single media query block at `max-width: 640px` handles all three classes.

## Section 3 — Tabs, PageHeader, misc

### `.umc-tabs`
Add `flex-wrap: wrap` so tabs reflow onto a second line instead of overflowing. Affects SchedulePage ("Past/Cancelled") and FinancePage (three tabs).

### `.umc-page-head` (PageHeader)
At `<640px`, switch from `flex-direction: row` to `flex-direction: column` and `align-items: flex-start` so the action button (e.g. "New note" on NotesPage) drops below the title instead of fighting for space.

## What does NOT change

- Individual page files (HomePage, SchedulePage, PatientsPage, NotesPage, FinancePage, SettingsPage)
- Design tokens (`tokens.css`)
- The neumorphic shadow/colour system
- Any backend or data layer code
