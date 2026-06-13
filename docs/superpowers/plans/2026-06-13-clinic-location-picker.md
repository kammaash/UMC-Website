# Clinic Location Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the doctor's free-text Clinic Address with a Google-Maps location picker (parity with the phone app), persisting `clinicAddress` + `clinicLocation` GeoPoint.

**Architecture:** A lazy Maps-JS loader + a self-contained modal picker component under `roles/doctor/`, wired into `SettingsPage`. The existing `saveConsultationSettings` already writes the GeoPoint. Picker-only read-only address with a manual-entry fallback when Maps is unavailable.

**Tech Stack:** React 19 + TypeScript + Vite, Google Maps JavaScript API (+ Places library, Geocoder), browser geolocation, Firebase Firestore (existing).

**Source of truth (phone app, read-only reference):**
`/Users/gayani/Tablet-Reminder-App-main/lib/Widgets/location_picker_screen.dart`,
`.../lib/components/Backend_Integration/location_helper.dart`,
`.../lib/screens/Doctor/consultation_settings_screen.dart`.

---

### Task 1: State-centroid lookup (pure unit, TDD)

**Files:**
- Create: `portal/src/roles/doctor/data/stateCenters.ts`
- Test: `portal/src/roles/doctor/data/stateCenters.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { stateCenter } from './stateCenters'

describe('stateCenter', () => {
  it('returns the centroid for a known state', () => {
    expect(stateCenter('Karnataka')).toEqual({ lat: 15.3173, lng: 75.7139 })
  })
  it('returns undefined for an unknown / empty state', () => {
    expect(stateCenter('Atlantis')).toBeUndefined()
    expect(stateCenter('')).toBeUndefined()
    expect(stateCenter(null)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test, verify it fails** — `npm test -- stateCenters` → FAIL (module/export missing).

- [ ] **Step 3: Implement** — port the app's `_kStateCenters` table to a `Record<string, {lat,lng}>` (35 states/UTs, exact names + coords from `location_picker_screen.dart:24-61`) and:

```ts
export interface LatLng { lat: number; lng: number }
export const INDIA_CENTER: LatLng = { lat: 20.5937, lng: 78.9629 }
export const STATE_CENTERS: Record<string, LatLng> = { /* ...ported... */ }
export function stateCenter(name: string | null | undefined): LatLng | undefined {
  return name ? STATE_CENTERS[name] : undefined
}
```

- [ ] **Step 4: Run test, verify it passes** — `npm test -- stateCenters` → PASS.

---

### Task 2: Google Maps JS loader

**Files:**
- Create: `portal/src/shared/lib/googleMaps.ts`
- Modify: `portal/package.json` (devDependencies: `@types/google.maps`)
- Modify: `portal/.env.example` (add `VITE_GMAPS_API_KEY=`)

- [ ] **Step 1: Add types** — `npm i -D @types/google.maps` (in `portal/`).

- [ ] **Step 2: Implement loader** — single cached promise; reject when key missing or script errors:

```ts
let promise: Promise<typeof google.maps> | null = null
export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (promise) return promise
  const key = import.meta.env.VITE_GMAPS_API_KEY as string | undefined
  if (!key) return Promise.reject(new Error('Maps key missing'))
  promise = new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve(window.google.maps)
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async&v=weekly`
    s.async = true
    s.onerror = () => { promise = null; reject(new Error('Maps script failed')) }
    s.onload = () => window.google?.maps ? resolve(window.google.maps) : reject(new Error('Maps unavailable'))
    document.head.appendChild(s)
  })
  return promise
}
```

- [ ] **Step 3: `.env.example`** — append `VITE_GMAPS_API_KEY=`.

- [ ] **Step 4: Verify** — `npx tsc -b` → clean (no test; integration code).

---

### Task 3: ClinicLocationPicker modal component

**Files:**
- Create: `portal/src/roles/doctor/components/ClinicLocationPicker.tsx`

Interface:
```ts
interface PickerResult { address: string; lat: number; lng: number }
export function ClinicLocationPicker(props: {
  initialAddress: string
  initialLat: number | null
  initialLng: number | null
  fallbackState: string | null
  onConfirm: (r: PickerResult) => void
  onClose: () => void
}): JSX.Element
```

- [ ] **Step 1: Modal shell + load state** — fixed full-screen overlay (reuse the design tokens / OTP-modal styling pattern from `app/LoginPage.tsx` for the scrim; map fills it). On mount call `loadGoogleMaps()`; track `status: 'loading' | 'ready' | 'error'`.

- [ ] **Step 2: Map + fixed pin** — once ready, `new google.maps.Map(el, { center, zoom, disableDefaultUI:true, clickableIcons:false })`. Overlay a fixed center pin (absolutely-positioned SVG, like the app's red `location_pin`). Initial camera = fallback hierarchy: `initialLat/Lng` (zoom 16) → browser geolocation (zoom 16) → `stateCenter(fallbackState)` (zoom 6.5) → `INDIA_CENTER` (zoom 4.2).

- [ ] **Step 3: Reverse-geocode on idle** — `map.addListener('idle', …)`; read `map.getCenter()`; `new google.maps.Geocoder().geocode({ location })` → `results[0].formatted_address`; show in a bottom bar ("Getting address…" while pending). Guard a `skipNextIdle` flag for programmatic recenters (search/my-location), mirroring the app.

- [ ] **Step 4: Search (Places)** — a search input → `AutocompleteService.getPlacePredictions({ input, componentRestrictions:{country:'in'} })` (debounced 400ms, min 3 chars) → list; selecting one → `PlacesService.getDetails({ placeId, fields:['geometry'] })` → `map.panTo(loc)` + set address from the prediction description (set `skipNextIdle`).

- [ ] **Step 5: My-location** — button → `navigator.geolocation.getCurrentPosition` → `map.panTo` + zoom 16 (reverse-geocode runs on idle). Silently ignore denial.

- [ ] **Step 6: Confirm / Cancel** — Confirm disabled until an address resolves; calls `onConfirm({address, lat: center.lat(), lng: center.lng()})`. Cancel/scrim → `onClose()`.

- [ ] **Step 7: Error / manual fallback** — when `status==='error'` (missing key, script/referrer failure), render a heading + a manual address `<textarea>` + a "Use this address" button calling `onConfirm({address, lat:NaN, lng:NaN})`; the page treats `NaN` coords as "no coordinates" (address-only save). Also expose a clear "Cancel".

- [ ] **Step 8: Verify** — `npx tsc -b` → clean.

---

### Task 4: Wire into SettingsPage + save

**Files:**
- Modify: `portal/src/roles/doctor/pages/SettingsPage.tsx`
- Modify: `portal/src/roles/doctor/data/settingsActions.ts` (remove stale comment only)

- [ ] **Step 1: State + seeding** — add `clinicLat`/`clinicLng` (number|null) and `pickerOpen` (bool) state. In the seed effect, set `clinicAddress` (existing), and `clinicLat/Lng` from `data.clinicLocation?.latitude/longitude ?? null`. Add `const { data: doctorRec } = useDoctorRecord()` for `doctorRec?.stateOfRegistration`.

- [ ] **Step 2: Replace the address `<textarea>`** (currently `SettingsPage.tsx:146-154`) with a **read-only** address display (the saved text or a "No location set yet" placeholder) + a "📍 Set clinic location" `Button` that sets `pickerOpen=true`. Keep the `error` styling when `clinicAddress.trim()===''`. Show a small "Location set" chip when coords exist.

- [ ] **Step 3: Render the picker** — `{pickerOpen && <ClinicLocationPicker initialAddress={clinicAddress} initialLat={clinicLat} initialLng={clinicLng} fallbackState={doctorRec?.stateOfRegistration ?? null} onClose={()=>setPickerOpen(false)} onConfirm={(r)=>{ setClinicAddress(r.address); setClinicLat(Number.isNaN(r.lat)?null:r.lat); setClinicLng(Number.isNaN(r.lng)?null:r.lng); setPickerOpen(false) }} />}`.

- [ ] **Step 4: Thread coords into save** — in `handleSave`'s `input`, add `clinicLatitude: clinicLat, clinicLongitude: clinicLng`; delete the "out of web scope" comment block (`SettingsPage.tsx:85-86`). `canSave` unchanged (still requires non-empty `clinicAddress`).

- [ ] **Step 5: Clean `settingsActions.ts`** — remove the stale "Map/location picking is out of web scope" framing in the file comment; logic unchanged.

- [ ] **Step 6: Verify** — `npx tsc -b` → clean; `npm run build` → succeeds.

---

### Task 5: CI / deploy wiring

**Files:**
- Modify: `.github/workflows/deploy-portal.yml`

- [ ] **Step 1** — add to the **Build** step `env:` block (after the `VITE_FB_*` lines):

```yaml
          VITE_GMAPS_API_KEY: ${{ secrets.VITE_GMAPS_API_KEY }}
```

- [ ] **Step 2 (user action, documented):** in the GCP/Firebase project enable **Maps JavaScript API**, **Places API**, **Geocoding API**; create a **web key** restricted by HTTP referrer to the prod domain + `localhost`; add it as repo secret `VITE_GMAPS_API_KEY` and to local `portal/.env`.

---

### Task 6: Full verification

- [ ] `cd portal && npx tsc -b` → clean.
- [ ] `npm test -- stateCenters` → PASS.
- [ ] `npm run build` → succeeds (picker degrades to manual entry when key unset).
- [ ] Manual smoke (once key set, against a doctor account): open Settings → Set clinic location → search / drag / my-location → Confirm → Save → verify `clinicAddress` + `clinicLocation` in Firestore.

---

## Self-Review

- **Spec coverage:** loader (§2→T2), picker UX incl. fallback hierarchy + search + my-location + reverse-geocode (§3→T3), data flow + read-only address + required (§4→T4), APIs/key (§5→T2/T3), error/manual fallback (§6→T3.7), setup/CI (§7→T5), testing incl. pure-unit `stateCenters` (§8→T1/T6). All covered.
- **Placeholders:** none — the pure-unit test is complete; the picker steps give exact API calls; the porting of `STATE_CENTERS` references the exact source lines.
- **Type consistency:** `PickerResult{address,lat,lng}`, `LatLng{lat,lng}`, `stateCenter(name)`, `loadGoogleMaps()`, `SaveSettingsInput.clinicLatitude/Longitude` used consistently across tasks.
