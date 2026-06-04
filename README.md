# Handoff: Unified Medical Care — Landing Experience

## Overview
A single-page marketing/landing experience for **Unified Medical Care (UMC)** — a medication-reminder app that connects patients, doctors, pharmacies and diagnostic centers. The page is an orchestrated, cinematic scroll: a black intro where a medical **cross** is built and spun via press-and-hold, "detonates" into a light theme, and blooms into a **four-pillar role hub**. Each pillar opens (camera "dive") into a full-screen **role-detail page**. Below the hub are standard marketing sections (marquee, trust, download, FAQ) and an oversized "Join the beta" finale.

## About the Design Files
The files in this bundle are **design references created in HTML/CSS + in-browser React (Babel)** — a working prototype that demonstrates the intended look, motion, and behavior. They are **not** meant to be shipped as-is. The task is to **recreate these designs in the target codebase's environment** (e.g. React/Next, Vue, SwiftUI, etc.) using its established component patterns, animation libraries, and conventions. If no front-end environment exists yet, pick the most appropriate framework and implement there. Treat the HTML as the source of truth for *visual + motion intent*; re-implement the structure idiomatically.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, motion timings and easings are all specified and should be reproduced faithfully. The one intentional placeholder is the **demo-video slot** on each role page (see below) — it is a styled empty frame awaiting four real video files.

---

## Global System

### Fonts
- **Serif (display):** `DM Serif Display` (fallbacks: DM Serif Text, Georgia, serif) — headings, role titles, big marks.
- **Sans (body/UI):** `Inter` (fallbacks: system-ui, -apple-system, sans-serif) — body copy, buttons, card descriptions.
- **Mono (labels):** `JetBrains Mono` (fallbacks: SFMono-Regular, ui-monospace, monospace) — eyebrows, kickers, captions, meta. Typically UPPERCASE with wide letter-spacing (0.18–0.3em).

### Design Tokens (CSS custom properties)
```
--serif: 'DM Serif Display', 'DM Serif Text', Georgia, serif
--sans:  'Inter', system-ui, -apple-system, sans-serif
--mono:  'JetBrains Mono', 'SFMono-Regular', ui-monospace, monospace

--ease-out:   cubic-bezier(0.16, 1, 0.3, 1)
--ease-inout: cubic-bezier(0.83, 0, 0.17, 1)

Colors (light theme):
--bg:        #e3e3e3   (page background)
--bg-2:      #ededed   (raised surfaces: cards, prong caps)
--bg-sunken: #d6d6d6   (footer / finale background)
--ink:       #1c1c1c   (primary text / the cross)
--ink-soft:  #565656   (secondary text)
--ink-faint: #8c8c8c   (muted labels)
--line:      rgba(20,20,20,0.14)   (hairline borders)
--line-2:    rgba(20,20,20,0.06)
--shadow-dark:  rgba(150,150,150,0.55)   (neumorphic dark side)
--shadow-light: rgba(255,255,255,0.9)    (neumorphic light side)
--black:     #0b0b0b   (intro background)

Role-detail (dive) page is DARK: background #0a0a0a, text #f3f3f3
(secondary text uses rgba(243,243,243,α) at α ≈ 0.4–0.75).
```

### Neumorphic raised surface (used by buttons + role cards)
- Resting shadow: `box-shadow: 8px 12px 30px var(--shadow-dark), -5px -5px 16px var(--shadow-light)`
- Hover (lift): `transform: translateY(-4px)` + larger shadow `10px 16px 42px / -6px -6px 22px`
- Press/`:active` (depress): `transform: translateY(3px) scale(0.98)` + reduced shadow `3px 5px 13px / -3px -3px 10px`

### Texture
A faint fractal-noise SVG grain overlay sits over everything at `opacity: 0.04`, `mix-blend-mode: overlay`, `z-index: 9000`, `pointer-events: none`.

### Scroll model
The whole page lives in a `.scroll-shell` (full-viewport, `overflow-y: scroll`, `scroll-snap-type: y proximity`). Scroll is **locked** until the pillars bloom (class `.locked` → `overflow: hidden`). Each section/footer is `scroll-snap-align: start`.

### Responsive breakpoints
**Both the radial hub and the card carousel are kept.** The radial four-pillar hub is the default and scales with **both** width and height (see screen 3), so it also serves normal portrait phones. The card carousel is the fallback only for **tiny portrait phones (≤380px)** and **short/landscape phones (≤900px AND ≤560px tall)**. Additional radial-hub tuning at 860px, 680px, 480px; short-height tuning at 600px.

---

## Screens / Views

### 1. Loader (compass ring)
- Fixed full-screen on `--black`. A circular **compass-style dashed-tick ring** (36 ticks) with a continuously spinning two-tone pill at its center. Four **cardinal ticks** (N/E/S/W, every 9th) are longer/bolder; the other ticks are short. **No percentage counter and no linear bar** — the ring itself is the progress indicator: ticks light up clockwise from the top (12 o'clock) as load advances.
- Auto-advances 0→100 over a randomized interval. **On reaching 100% the pill does NOT snap** — it rotates smoothly forward (continuing from its live spin angle) into a final pose with the **dark end pointing NE and the white end pointing SW** (≈ the app-logo pill orientation), and the page only advances *after* that settle completes. Implemented with a self-terminating `requestAnimationFrame` tween, an idempotent advance guard, and a safety timeout so the reveal can never hang. Then fades out (`opacity`/`visibility`, ~0.85s) into the intro. Honors `prefers-reduced-motion` (near-instant).

### 2. Intro — the cross (hero → hold → detonate → bloom)
- **Hero:** black screen, oversized serif words "Care." "Connect." "Comfort." (`clamp(54px, 13vw, 188px)`, line-height 0.92) rise/rotate into view. A small scroll auto-runs the opening (blur + cross build over ~1.8s).
- **The cross:** a sharp, equal-arm medical cross (two bars + center square) built from the vertical arm first, then horizontal. Sized responsively `clamp(190px, 38vmin, 460px)` (wrapper `clamp(196px, 39vmin, 472px)`). Has a soft white drop-shadow on black; gentle "breathe" scale animation (3.4s) when ready.
- **Press & Hold:** pointer-down spins the cross like a tyre — angular speed ramps with a smoothstep curve to a **fixed peak of 10 deg/ms**. Tangential "speedline" streaks fan out and rotate with it. A "Press & Hold" → "Hold" prompt + fill bar shows progress. Releasing early **reverse-spins** it back over the time it was held.
- **Detonate (settle/boom):** at full hold, the cross decelerates to upright, recolors **black**, and drifts to the bloom center while a light shock-wipe + pulse rings sweep out and flip the background from black to light (`.intro.lit`).
- **Bloom:** the settled cross becomes the hub center, scaled to **30%** of full size (`hubCrossScale = 0.30`, hard-coded). Lighting paths draw outward to four pillars which emerge with staggered delays.
- **Re-anchoring:** the settled cross's centered position is recomputed on every window resize/zoom (it re-aligns to the live hub-inner center). On phones it **fades out**; growing the viewport back fades it in at the correct spot.

### 3. Four-pillar role hub (default layout, incl. normal portrait phones)
- `.hub` fills the viewport (`display: grid; place-items: center`), reserving top space for the title.
- `.hub-inner` is a **square that scales with BOTH dimensions**: `min(58vmin, 520px, calc(100dvh − --hub-reserve), calc(100vw − --prong-w − --hub-reserve-x))`. The `100dvh` term shrinks it on short screens; the `100vw` term shrinks it on narrow screens — both kept in one `min()` so it stays square and the cross + prongs + labels never overflow. Prong size is a shared CSS var `--prong-w` (`clamp(150px, 20vmin, 188px)` on desktop, fixed/`vw` at smaller breakpoints) used by both the prongs and the width constraint so everything scales together. Contains: the center cross, four **lighting paths** (top/right/bottom/left, draw outward, light up on hover with a travelling pulse), and four **prongs** (role buttons) at the 4 cardinal points.
- **Prong** = a circular cap (size via `--cap`, `clamp(94px,12.5vmin,120px)` desktop; `border 1.5px var(--line)`, `bg var(--bg-2)`) containing a line icon. Hover/focus: cap inverts (`bg var(--ink)`, icon `var(--bg)`) + scales 1.08.
- **Permanent role labels** (`.prong-name`, mono uppercase): each prong shows a **always-visible** label on its **inner** side (toward the cross) — there is NO hover-pop anymore. **Patient (top)** and **Pharmacy (bottom)** labels are **rotated 90° (vertical)** to run along their prongs; **Doctor (right)** and **Diagnostics (left)** stay horizontal. Each label is nudged perpendicular off its lighting-path line so the two never intersect; positions are derived from `--cap` so they track the prong at any size.
- **Title block** (`.stage-head`, absolutely positioned top-center): mono eyebrow "An ecosystem, not an app", serif h2 "The four pillars of modern healthcare" (`clamp(22px, 3.4vw, 40px)`), mono hint "Select a pillar to dive in →" (hidden during a dive).
- **Bloom/convert animation:** the hub eases in on bloom (`hubConvIn`, fade+scale) and re-plays when the layout converts back to the radial hub on resize (the display swap re-triggers the CSS animation).

### 4. Role-card carousel (smallest / short screens only)
**Both layouts are kept.** The radial hub is the default and shows on normal portrait phones too; the card carousel is the fallback only for **tiny portrait phones (`max-width: 380px`)** and **short/landscape phones (`max-width: 900px and max-height: 560px`)**. Crossing the breakpoint animates the conversion both ways (cards stagger-in; radial hub `hubConvIn`s in). On these small screens the center cross is hidden **instantly at detonation** (`[data-phase="settle"] .cross-wrap { transition: none }`) so it never drifts-to-center then fades.

The four roles become a **horizontal swipe carousel, one PORTRAIT card per screen** with a peek of the next. The scroller is **horizontal-only** (`overflow-y: hidden; touch-action: pan-x; overscroll-behavior-y: none`). Cards have a staggered **entry animation** (`rcEnter`, rise + scale, `backwards` fill so press/hover stay responsive).
- Container `.role-cards`: `display:flex; overflow-x:auto; scroll-snap-type: x mandatory; position: relative`. Side padding centers the active card: `padding: 26px calc((100% − var(--rc-w)) / 2) 46px` (the generous bottom padding keeps the neumorphic shadow from clipping). Scrollbars hidden. `--rc-w: min(74vw, 300px)`.
- `.role-card`: `flex: 0 0 var(--rc-w); scroll-snap-align: center; min-height: clamp(360px, 54vh, 448px)`. Vertical layout (`flex-direction: column`): icon cap (66px) at top, mono number removed, serif label (30px), sans description (14px), and an **EXPLORE → CTA pinned to the bottom** (`margin-top: auto`, mono uppercase). Neumorphic raised + press behavior (see token section). Cards fade in staggered.
- **Pagination dots** below (`.role-dots`): 4 dots, active dot elongates to 24px (`opacity 1`), inactive `opacity 0.22`. Tapping a dot smooth-scrolls to that card; the active dot tracks the centered card on scroll.
- The carousel sits **below** the title with comfortable top clearance (`.hub` padding-top `clamp(168px, 25vh, 232px)`) so the heading never overlaps the cards.

### 5. Role-detail page (the "dive")
Clicking a prong/card runs a **camera dive**: a circular iris (clip-path `circle()`) grows out of the clicked circle to fill the screen, the role's symbol FLIPs from the small icon to a huge faint backdrop, and a dark role page (`#0a0a0a`, text `#f3f3f3`) eases in with a slow rack-focus blur (`blur(16px)` on the symbol). Closing dollies smoothly back, collapsing the iris into the originating prong/card.
- **Background symbol** (`.dive-icon`): the role's line icon, huge and faint, **centered** and responsive/capped: base `min(78vmin, 720px)`, `min(100vmin, 640px)` ≤860px, `min(116vmin, 560px)` ≤680px. Blurs when the text is focused.
- **Copy** (`.dive-info`): on desktop a left-anchored column (`max-width: min(560px, 82vw)`, vertically centered, internally scrollable with a top/bottom mask). On phone it's a full-width scrollable overlay from the top. Text enters line-by-line (rise + unblur, staggered ~1.0–1.6s after open) and exits quickly (drop-up + blur).
  - **Eyebrow** (`.di-eyebrow`): mono uppercase role label (number removed).
  - **Title** (`h3`): serif, `clamp(44px, 7vw, 92px)` desktop / `clamp(40px, 13vw, 66px)` phone.
  - **Lede** (`.di-lede`): `clamp(16px, 1.9vw, 22px)`, `rgba(243,243,243,0.75)`, max ~32–40ch.
  - **Feature head** (`.di-feat-head`): mono uppercase, e.g. "What every patient gets".
  - **Feature rows** (`.di-row`): each a bold title + description (numbers removed), hairline-separated.
  - **Demo-video slot** (`.di-demo`) — **PLACEHOLDER, underneath all the text**: a mono "See it in action" label over a **16:9 framed box** (`aspect-ratio: 16/9`, `border-radius: 16px`, light hairline border, subtle inner gradient) with a circular **play button** and a caption "{Role} walkthrough · demo". One per role; awaiting real files (see Assets). Animates in with the other lines and out on close.
- **Back button** (`.dive-back`): top-left, "← All pillars". Arrow keys ←/→/↑/↓ cycle roles; Esc closes.

### 6. Marquee
Infinite horizontal scroller of serif phrases (`clamp(22px, 3vw, 40px)`) separated by small dots: "Reminders that land", "Caregivers in the loop", "Doctors in sync", "Pharmacies connected", "Diagnostics on time", "Never a missed dose". 38s linear loop, pauses on hover.

### 7. Trust
Two-column grid (`1.1fr 1fr`, collapses to 1 column ≤1024px). Left: serif "big" statement "Health data is the most personal data. We treat it that way." + a supporting paragraph. Right: three points (lock / shield / users icons) — "Encrypted by default", "Consent-first sharing", "Role-scoped access" — each a bold title + description, hairline-separated.

### 8. Download
Centered. A pill **badge** "Now in TestFlight beta", serif h2 "Care that *never sleeps.*" (`clamp(40px, 7.5vw, 104px)`, the em italic + muted), a supporting paragraph, and two buttons:
- **Primary** (`.btn.primary`): solid `var(--ink)` bg, apple glyph, "Join the beta on / TestFlight".
- **Ghost** (`.btn.ghost`): raised neumorphic surface, bell glyph, "Android / Notify me".
- Mono meta line: "Requires iOS 16+ · Free during beta · No card required".
Buttons are pill-shaped (`border-radius: 999px`, `padding: 18px 30px`), lift on hover.

### 9. FAQ
Section header (serif h2 "Questions, answered" — leading index number removed) + an accordion list (`max-width: 920px`). Each item: a full-width question button with a +/− toggle (`.pm`, rotates) and an animated `max-height` answer panel. First item open by default; clicking the open one closes it. 5 Q&As (see `sections.jsx`).

### 10. "Join the beta" finale (Links)
Full-viewport closing section on `--bg-sunken`. A mono kicker "Now in TestFlight", then one **oversized serif link** "Join the beta" (`clamp(56px, 14vw, 200px)`) whose text swaps on hover (two stacked copies translate; an arrow `↗` slides in) — links to #download. A short sub-line, then a giant "Unified Medical Care" wordmark and a mono baseline row (© 2026 Unified Medical Care · Care · Connect · Comfort).

---

## Interactions & Behavior (timings)
- **Loader:** randomized 0→100, fade-out 0.9s.
- **Intro auto-open:** ~1.8s (280ms reduced-motion). Blur ramps 0→30px.
- **Hold:** spin peak fixed at **10 deg/ms** (smoothstep ramp). Early release reverse-spins over the held duration.
- **Settle/detonate:** ~1.35s (380ms reduced). Cross decelerates (`easeOut`), recolors black, drifts to center, scales to 30%. Boom rings + light wipe synced.
- **Pillars bloom:** paths draw 0.1–0.19s delays; prongs emerge 0.30–0.60s delays (`cubic-bezier(0.22,1,0.36,1)`).
- **Prong hover label:** spring `cubic-bezier(0.34,1.56,0.64,1)`, ~0.5s.
- **Dive in:** ~1.7s (340ms reduced); dive out ~0.82× that. Ease `cubic-bezier(0.65,0,0.35,1)`. Iris = animated `clip-path: circle()`; symbol FLIP via measured transform; rack-focus blur eases in as copy enters.
- **Role copy:** line-by-line in (rise+unblur) staggered 1.0–1.62s; out (drop-up+blur) ~0.32–0.4s reverse stagger.
- **Card carousel:** native scroll-snap swipe; dot tap = smooth `scrollTo`.
- **Cross re-anchor:** on `resize`, rAF-throttled recompute of the settled cross offset to the hub-inner center.
- All decorative motion must collapse under `prefers-reduced-motion: reduce` (durations ~0; show end states, not pre-animation hidden states).

## State Management
Implemented in one component (`IntroStage`). Key state:
- `phase`: `hero | holding | settle | bloomed | dive` (drives everything; mirror via a `data-phase` attribute for CSS).
- `introP` (0..1 opening progress), `holdP` (0..1 press progress), `spin` (live cross rotation deg), `lit` (bg flipped to light), `active` (role index when dived), `closing`, `focused` (rack-focus blur), `hoverSide` (which path lights), `cardIdx` (active carousel card).
- Refs for animation bookkeeping: cross transform offset (`{dx,dy}`), measured rects for the FLIP/iris (`fromRect`, `fromCircle`), RAF handles, and "live" mirrors of phase/active/closing for use inside RAF loops.
- Scroll lock toggled by phase (locked until `bloomed`).
- No data fetching. Role content is static (see `icons.jsx`).

## Design Tokens
See the **Design Tokens** block above (colors, eases, neumorphic shadows). Type scale is fluid via `clamp()` per element (values given per screen above). Radii: cards `22px`, demo frame/feat `16px`, buttons/badges/dots `999px`, prong caps `50%`. Spacing uses `clamp()` throughout (section padding `clamp(80px,12vh,160px) clamp(20px,6vw,120px)`).

## Assets
- **Icons:** inline SVG line set (24×24, `stroke=currentColor`, `stroke-width≈1.6`) defined in `icons.jsx`: bell, alarm, users, pill, shield, pin, chart, stethoscope, doc, flask, mic, lock, cloud, cal, apple. Re-implement as your icon components or inline SVG.
- **Fonts:** load DM Serif Display, Inter, JetBrains Mono (e.g. Google Fonts or self-hosted).
- **`assets/` folder** (included): `app_logo.png`, `pill.png`, `flutter_01.png` — incidental; the current design draws the cross/loader in CSS/SVG and does not depend on these for the hero.
- **Demo videos — TO BE SUPPLIED:** four clips, one per role (Patient, Doctor, Pharmacy, Diagnostics). The `.di-demo` frame is a 16:9 placeholder; drop the files in and swap the placeholder for a `<video>` (or your player). Confirm orientation — if the recordings are portrait/phone, the slot aspect ratio should change to suit.

## Role data (from `icons.jsx`)
Four roles, each `{ key, side, icon, label, title, lede, rows[] }` (the `num` field is no longer rendered):
- **Patient** — side top, icon `pill`. "Never miss a dose…" Rows: Smart medication alarms; (see file for full list).
- **Doctor** — side right, icon `stethoscope`. "A live window into adherence…" Rows: Adherence dashboards; …
- **Pharmacy** — side bottom, icon `flask`. "Close the loop on refills…" Rows: Refill coordination; Location matching; Inventory-aware.
- **Diagnostics** — side left, icon `doc`. "Tests, scheduled and surfaced…" Rows: Test scheduling; …
(Full copy, including each row's title/description and the per-role `FEAT_HEAD`, is in `icons.jsx` / `intro.jsx`.)

## Files (in this bundle)
- `Tablet Reminder.html` — entry point; loads React + Babel and the scripts below, mounts `<App/>` into `#root`.
- `styles.css` — all styling, tokens, animations, responsive rules. The single source of truth for visuals.
- `app.jsx` — Loader + App assembly (renders IntroStage, Marquee, Trust, Download, FAQ, Links). Cross size fixed at 30%; no tweak panel.
- `intro.jsx` — the cross/hero/hold/detonate/bloom, the radial hub, the phone role-card carousel, and the role-detail "dive" (incl. the demo-video slot).
- `sections.jsx` — Marquee, Features (defined but not mounted), Trust, Download, FAQ, Footer (defined but not mounted), Links finale, the scroll-reveal helper, and smooth-scroll.
- `icons.jsx` — inline icon set + ROLES data + FEAT_HEAD map.
- `tweaks-panel.jsx` — prototype-only tweak shell (no longer used by the design; safe to ignore/remove).
- `assets/` — incidental images (see Assets).

> Note: the file is named "Tablet Reminder" for historical reasons — the product/app name is **Unified Medical Care**.
