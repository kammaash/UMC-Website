# Clinic Location Picker (Doctor Settings) — Design Spec

**Date:** 2026-06-13
**Status:** Approved design, pending spec review → implementation plan
**Scope:** `portal/` only, plus the spec/plan docs and the deploy workflow env wiring.

---

## 1. Summary

Add a **map-based clinic location picker** to the doctor's Consultation Settings page in the
web portal, replacing today's free-text Clinic Address `<textarea>`. This brings the web
portal to parity with the phone app (`../Tablet-Reminder-App-main`), whose
`LocationPickerScreen` lets a doctor drop a pin on a Google Map, search, use current location,
reverse-geocode to an address, and confirm — persisting both the address string and a
`clinicLocation` GeoPoint.

The portal's data layer already supports this: `SaveSettingsInput` accepts optional
`clinicLatitude/clinicLongitude` and `saveConsultationSettings` writes
`clinicLocation = new GeoPoint(...)` when both are present; the settings type/mappers already
read `clinicLocation`. Only the **web side** was deliberately left as free text
("Map/location picking is out of web scope"). This spec removes that limitation.

### Goals
- A modal **Google Maps** location picker mirroring the phone app's UX: draggable center pin,
  Places search, "my location", reverse-geocoded address, Confirm/Cancel.
- The Clinic Address becomes **read-only**, set exclusively by confirming a location on the
  map (per product decision). It remains a **required** field to save.
- Persist `clinicAddress` (reverse-geocoded string) + `clinicLocation` GeoPoint, matching the
  phone app's Firestore contract exactly.
- Keep the portal's data/presentation seam intact: no page imports `firebase` directly; the
  picker component knows nothing about Firestore.

### Non-goals
- No backend / Cloud Function / Firestore rules changes. Doctors already write
  `doctors/{uid}/consultationSettings/settings`.
- No changes outside `portal/` except the spec/plan docs and the `deploy-portal.yml` build env.
- Not porting the phone app's Places **REST** calls — browser CORS blocks them; the web uses
  the Maps JS Places library instead.
- No offline maps, no saved-places history, no multi-clinic support.

### Decisions (locked in brainstorming)
1. **Provider:** Google Maps JavaScript API (parity with the app, best India address quality).
2. **API key:** new web-enabled key; the plan includes the GCP setup steps + env + CI wiring.
3. **Address field:** **picker-only** (read-only text; changed only via the map).

---

## 2. Architecture & file seam

| File | Change | Responsibility |
| --- | --- | --- |
| `shared/lib/googleMaps.ts` | **new** | `loadGoogleMaps()` — lazily inject the Maps JS script (`libraries=places`, `loading=async`) using `import.meta.env.VITE_GMAPS_API_KEY`; cache the promise so it loads once; resolve with `google.maps`; reject if the key is missing or the script errors. |
| `roles/doctor/components/ClinicLocationPicker.tsx` | **new** | Self-contained modal picker. Props `{ initialAddress, initialLat, initialLng, fallbackState, onConfirm({address,lat,lng}), onClose }`. Owns all map/Places/geocoder/geolocation state. **No Firestore knowledge.** |
| `roles/doctor/data/stateCenters.ts` | **new** | Ported `Map<string, {lat,lng}>` of Indian state/UT centroids (from the app's `_kStateCenters`) for the camera fallback. Pure data + a lookup helper (unit-tested). |
| `roles/doctor/pages/SettingsPage.tsx` | **edit** | Replace the address `<textarea>` with a read-only address display + "Set clinic location" button that opens the picker; seed from loaded `clinicLocation`/`clinicAddress`; thread `clinicLatitude/Longitude` into save. |
| `roles/doctor/data/settingsActions.ts` | **edit (tiny)** | No logic change (already writes `clinicLocation`); remove the stale "out of web scope" comment. |
| `roles/doctor/data/useConsultationSettings.ts` / `mappers.ts` / `types.ts` | **verify** | Already expose `clinicLocation: GeoPoint | null`; confirm `SettingsPage` reads it. No change expected. |
| `package.json` | **edit** | Add `@types/google.maps` to `devDependencies` for typing. |
| `.env.example` | **edit** | Add `VITE_GMAPS_API_KEY=`. |
| `.github/workflows/deploy-portal.yml` | **edit** | Add `VITE_GMAPS_API_KEY: ${{ secrets.VITE_GMAPS_API_KEY }}` to the Build step env (mirrors the `VITE_FB_*` vars). |

Each unit has one purpose and a defined interface: the loader (script → `google.maps`), the
picker (seed → `{address,lat,lng}`), the state-centers table (state name → centroid), and the
page (settings doc ↔ form ↔ save).

---

## 3. Picker UX (mirrors the phone app's `LocationPickerScreen`)

A modal overlay (not a router route) styled to the portal's design tokens, containing:

- **Google map** filling the modal, with a **fixed center pin** overlaid; dragging the map
  moves the target location under the pin (the app's "map moves under a fixed pin" pattern).
- **Search bar** (Places Autocomplete, `components: country:in`) → selecting a prediction
  recenters the map (skip the next reverse-geocode, like the app).
- **"My location"** button → browser `navigator.geolocation.getCurrentPosition` → recenter +
  reverse-geocode.
- **Reverse-geocode on idle**: when the map settles, `google.maps.Geocoder` turns the center
  into a formatted address shown in a bottom bar ("Getting address…" while pending).
- **Confirm / Cancel.** Confirm is disabled until an address resolves; it returns
  `{ address, lat, lng }`. Cancel closes without changes.

### Initial-camera fallback hierarchy (same order as the app)
1. Existing `clinicLocation` coords (already-picked) → street zoom.
2. Browser GPS position → street zoom.
3. Doctor's `stateOfRegistration` centroid (from `stateCenters.ts`) → state zoom.
4. All-India centroid → country zoom.

The doctor's `stateOfRegistration` is read from the `doctors/{uid}` doc (the page already has
access to the doctor's data layer; if not already loaded, fetched via a doctor-profile hook).

---

## 4. Data flow

1. `SettingsPage` loads settings via `useConsultationSettings()` → seeds `clinicAddress`,
   `clinicLat`, `clinicLng` (the latter two from `data.clinicLocation`).
2. "Set clinic location" opens `<ClinicLocationPicker>` seeded with those values +
   `fallbackState`.
3. On **Confirm**, the page stores `{address, lat, lng}` in form state, shows the read-only
   address with a "📍 Location set" chip.
4. **Save** calls `saveConsultationSettings({ …, clinicAddress, clinicLatitude: lat,
   clinicLongitude: lng })`, which writes `clinicAddress` + `clinicLocation` GeoPoint
   (`merge: true`) — unchanged action.

`canSave` keeps requiring a non-empty `clinicAddress`; since address is picker-only, in
practice it requires a confirmed location (except the manual fallback in §6).

---

## 5. APIs & key

- **Maps JavaScript API** — the interactive map.
- **Places library** (`AutocompleteService` + `PlacesService.getDetails`, or the newer
  `Place`/`AutocompleteSuggestion`; implementation choice deferred to the plan) — search.
- **Geocoder** — reverse-geocode center → address.
- **Browser geolocation** — "my location" (no native plugin).

The key is read from `VITE_GMAPS_API_KEY` and the script is **lazy-loaded only when the picker
first opens**, so the initial bundle is unaffected.

---

## 6. Error handling / graceful degradation

- **Key unset at build / script load fails / referrer blocked / offline:** the picker renders
  an **error state with a manual address text input** so a doctor is never hard-blocked. On
  manual entry, coordinates are omitted (only `clinicAddress` is saved). This also lets the
  portal keep building and functioning before the key is provisioned (incremental rollout).
- **Geolocation denied/unavailable:** silently fall through to the state/India camera
  fallback (no error shown), matching the app.
- **Reverse-geocode failure:** Confirm stays disabled with a "Move the map to select a
  location" hint; the doctor can still search or retry.

---

## 7. Setup & CI (per the "include setup steps" decision)

The implementation plan will document, as explicit steps the user performs:

1. In the Firebase/GCP project, enable **Maps JavaScript API**, **Places API**, and
   **Geocoding API**.
2. Create a **web API key**, restricted by **HTTP referrer** to the production domain
   (and `localhost` for dev), and scoped to those 3 APIs. Note billing must be enabled.
3. Add `VITE_GMAPS_API_KEY=<key>` to local `portal/.env` and to `.env.example` (empty).
4. Add a GitHub Actions secret `VITE_GMAPS_API_KEY` and reference it in the
   `deploy-portal.yml` Build step env, exactly like the `VITE_FB_*` vars.

The key shipping in the client bundle is expected for Maps JS; the **referrer restriction** is
the guardrail (same posture as the phone app's embedded key).

---

## 8. Testing

- **Pure unit (Vitest), per the TDD-the-pure-units convention:** the `stateCenters.ts` lookup
  (known state → centroid, unknown → undefined) and any address-formatting helper.
- **Integration (manual):** the picker is integration code — verified by `tsc -b` +
  `npm run build` and a **live smoke test** against a doctor test account: open settings, set
  a location, save, confirm `clinicAddress` + `clinicLocation` land in Firestore and the phone
  app reads them back consistently.
- No backend/rules tests — no backend change.

---

## 9. Risks & notes

- **Web key vs mobile key:** the app's embedded key is app-restricted; a new web key is
  required. Until it exists, the manual-entry fallback (§6) keeps the page usable.
- **Places API surface churn:** Google is migrating to the new `Place`/`AutocompleteSuggestion`
  APIs; the legacy `AutocompleteService`/`PlacesService` still function. The plan picks one and
  isolates it inside the picker so a later swap is contained.
- **`stateOfRegistration` availability:** if a doctor doc lacks it, the camera falls back to
  all-India — acceptable.
- **Prior non-goal:** the original portal spec listed "native geolocation" as out of scope;
  this feature uses **browser** geolocation (a web equivalent) and is an intentional scope
  extension.
