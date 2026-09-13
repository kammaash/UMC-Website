# Privacy Policy Page + Signed PDF — Design Spec

**Date:** 2026-09-13
**Status:** Approved design → implementation plan
**Owner:** Anand
**Purpose:** Unblock the Google Play listing, which requires a publicly hosted, non-PDF
privacy-policy URL, and produce a board-signed copy of the same policy for the company record.

---

## 1. Summary

One static HTML file, `privacy/index.html` at the marketing-site root, served by Netlify at
**https://unifiedmedicalcare.com/privacy/**. That URL goes into Play Console (privacy policy)
and, via its `#delete-account` anchor, into Play's account-deletion field.

The same file carries a print stylesheet that swaps the web header for the **Ashokanand
Creations Private Limited letterhead** and reveals a **board-approval signature block**. Headless
Chrome renders the print view to a PDF. The directors e-sign that PDF in macOS Preview; the
signed file is uploaded to Firebase Storage (via the console, no rules deploy) and its download
URL is linked from the page as the "board-approved signed copy".

The live marketing footer's legal row gains a "Privacy Policy" link to the page.

### Goals
- Satisfies Google Play's User Data policy: plain HTML, publicly reachable, readable with
  JavaScript disabled, non-editable, names the app and the developer entity, and covers every
  data flow the app actually has.
- Every factual claim is backed by the app's verified inventory
  (`tablet_reminder/docs/privacy-data-inventory.md`, 2026-08-01) and re-checked against the
  code on 2026-09-13.
- Looks like the rest of unifiedmedicalcare.com (same fonts and tokens) and, in print, like a
  formal company document.
- One source of truth: page and PDF never drift.

### Non-goals
- No Terms of Service page (the footer's "Terms" stays as it is).
- No changes to the Flutter app or the doctor portal. The in-app privacy link is a separate
  task in the `tablet_reminder` repo; this spec only records the URL it should point to.
- No Firebase Storage rules change. The signed PDF is fetched through a download-token URL.
- No cookie banner or analytics. The site sets none.

---

## 2. Verified facts the policy must reflect

### Company (from the incorporation certificate, board resolution, and GST certificate)
- Legal name: **ASHOKANAND CREATIONS PRIVATE LIMITED**
- CIN: **U26209AP2025PTC120364** (incorporated 22 July 2025, ROC Andhra Pradesh)
- PAN: ABDCA3414H · TAN: VPNA10215C · GSTIN: 37ABDCA3414H1ZY
- Registered office: H No 46/1L-4, Chanukyapuri Colony, KNL-Camp-B, Kurnool, Kurnool – 518002,
  Andhra Pradesh, India
- Directors: **Anand Kamma** (DIN 10280398), **Ashok Kamma** (DIN 10280418)
- Contact: admin@unifiedmedicalcare.com · +91 63045 19244
- Grievance officer (assumption stated to the user; change if needed): Anand Kamma, Director,
  admin@unifiedmedicalcare.com

### Product
- Brand: **Unified Medical Care (UMC)**. Android package `com.ashokanandcreationspvtltd.umc`.
- Surfaces covered: the Android/iOS app, the doctor web portal (same Firebase backend), and the
  marketing website (collects nothing beyond the visitor's browser requests; no analytics).
- Backend: Firebase project `tablet-reminder-app-111204`, Firestore + Cloud Functions in
  `asia-south1` (Mumbai); some legacy functions in `us-central1`.

### Roles (seven, from `UserRole` enum)
patient, caregiver, doctor, clinic assistant, pharmacy, diagnostic centre, school infirmary.

### Data categories (from the inventory, re-verified)
- **Identity:** name, email, phone (+ verification status), sign-in method, role, timezone,
  profile photo; patients add gender/age/weight/height; doctors add registration number, state of
  registration, specialities, and an optional drawn signature image applied to prescriptions;
  pharmacies and diagnostic centres add establishment details and licence numbers.
- **Health (sensitive):** medications and schedules, adherence logs (who marked a dose and
  when), prescriptions, medical history (diagnosis, clinical notes, follow-up, reason for visit),
  diagnostic test orders and uploaded reports, consultation recordings/transcripts, structured
  notes, assistant chat history, ABHA number when linked.
- **Location:** one-time precise GPS to set a home/delivery address (stored with a geohash);
  continuous position sharing **during an active pharmacy delivery only**, written to the order
  and removed when tracking stops. **No geofencing, no clinic-arrival detection, no location
  history.**
- **Camera / photos:** profile photo, feedback screenshot, doctor signature capture; QR/barcode
  scanning is on-device with no image stored.
- **Microphone:** consultation recording (uploaded for transcription, audio deleted after
  transcription with a 24-hour sweep), voice notes, voice feedback. Regional-language dictation
  sends audio to Sarvam AI; English dictation uses on-device OS speech recognition.
- **Contacts:** write-only. Doctors can save a patient as a device contact. The app never reads
  or uploads the address book.
- **Device:** FCM push token; app version and device model attached to feedback submissions.
  **No** Crashlytics, **no** Firebase Analytics, **no** Play Install Referrer (removed with the
  invite-token system), **no** advertising identifiers.
- **Payments / KYC:** Razorpay processes payments and provider KYC (PAN, legal name, contact,
  address). Currently in mock mode; the policy describes it as the processor used when payments
  are enabled.

### Third-party processors (table in the policy)
| Processor | What it receives | Purpose |
|---|---|---|
| Google Firebase / Google Cloud (Mumbai) | all account and health data | auth, database, file storage, push, functions |
| Google Gemini | consultation audio, voice notes, chat messages, structured-note text, feedback screenshots, medical history when the assistant is asked | AI transcription, note structuring, assistant |
| Sarvam AI | audio for Telugu/Hindi speech-to-text; note text for translation | regional-language speech and translation |
| Google Maps Platform | address text, GPS coordinates | address lookup and distance |
| Razorpay | payment metadata, provider KYC | payments and payouts |
| Google Sign-In / Apple Sign-In | email, name (Apple may relay) | authentication |
| ABDM (National Health Authority) | Aadhaar/mobile OTP flow data, ABHA number | ABHA creation and linking, only when the user starts it |
| WhatsApp (Meta) | nothing from us; the app opens a pre-filled message on the user's device | patient invites |

### Retention and deletion (asymmetric — must be stated)
- In-app deletion exists for every role (server-side auth deletion).
- **Patient deletes:** identity fields are redacted from provider-side terminal records
  (name, location, clinical notes) and diagnostic report files are deleted; the account id,
  money fields and test names are retained so providers keep a service record.
- **Provider deletes:** patient records the provider created are retained whole, because they
  are the patient's medical record.
- Consultation audio: deleted after transcription, 24-hour sweep.
- Requests by email answered within 30 days.

### Access controls (now true, so the policy may say it)
Firestore and Storage rules are membership-scoped for medication records, orders, test orders,
report files and patient groups (gates closed and REST-verified 2026-08-02 and 2026-08-15 per the
app's CLAUDE.md). The policy says "access is restricted by role and by membership in a
patient's care circle", nothing stronger.

---

## 3. Files and structure

```
privacy/
  index.html                 # the page; inline <style>; no JS required
  UMC-Privacy-Policy-v1.0-unsigned.pdf   # generated; committed for reference
scripts/
  build-privacy-pdf.sh       # headless Chrome → PDF from the print view
sections.jsx                 # ContactFooter: add "Privacy Policy" link in .ef-legal
styles.css                   # small addition: .ef-legal a style
```

`privacy/index.html` is self-contained (inline CSS). It links the same Google Fonts stylesheet
as `index.html`. No React, no Babel, no scripts. The page is a plain document.

### Page anatomy
1. **Web header** (`.web-only`): small UMC wordmark linking to `/`, title "Privacy Policy",
   mono kicker with version and effective date.
2. **Document body**: the policy. Semantic `<article>` with `<h2>` per section and `id`s for
   anchors (`#collect`, `#third-parties`, `#delete-account`, `#rights`, `#contact`, …).
3. **Signed-copy callout** (`.web-only`, `id="signed-copy"`, `hidden` until the URL exists):
   "Download the board-approved signed copy (PDF)".
4. **Letterhead** (`.print-only`): rendered as a running header on every printed page via a
   fixed-position element plus body top padding, showing legal name, CIN, registered office,
   GSTIN, email, phone. A running footer shows "Unified Medical Care · Privacy Policy v1.0 ·
   Effective 13 September 2026" and the page counter is handled by Chrome's header/footer being
   disabled (we draw our own footer; no page numbers in v1).
5. **Board approval block** (`.print-only`, forced onto its own final page): a short
   resolution-style statement ("Approved by the Board of Directors of ASHOKANAND CREATIONS
   PRIVATE LIMITED and adopted as the privacy policy of Unified Medical Care with effect from
   13 September 2026"), then two signature cells side by side, each with a blank signature area
   tall enough for a Preview e-signature, name, "Director", DIN, "Date: ____".

### Typography and tokens
Reuse the site tokens: `--serif` for headings, `--sans` for body, `--mono` for kickers, table
headers and the letterhead meta line; `--bg #e3e3e3` page, `--ink #1c1c1c`. Print view uses a
white page, black text, 11pt body, A4 with 18mm margins.

### Footer wiring
In `ContactFooter` (`sections.jsx`), the `.ef-legal` row becomes three items:
`© 2026 Unified Medical Care` · `<a href="/privacy/">Privacy Policy</a>` ·
`ASHOKANAND CREATIONS PRIVATE LIMITED`. Add `.ef-legal a` styling (inherit colour, underline on
hover) in `styles.css`. Nothing else on the site changes.

---

## 4. Policy content outline (final headings)

0. Intro: who operates the app, scope (app, portal, website), sensitive-data stance, no
   advertising or sale, contact.
1. Who uses UMC — the seven roles, one line each.
2. What we collect — Account and identity · Health information · Photographs and camera ·
   Microphone and voice · Location · Contacts · Device and notifications · Payments.
3. Why we collect it.
4. Who can see your data — the care circle, per-role visibility, staff access, legal
   disclosure.
5. Service providers we use — the table above, plus a note on AI: what is sent, that providers
   process it only to return a result to us, and that consultation audio is deleted after
   transcription.
6. ABHA and the Ayushman Bharat Digital Mission — optional, user-initiated, what is exchanged.
7. Where data is stored and how it is protected — Mumbai region, TLS, encryption at rest,
   role- and membership-scoped rules, breach notification under the DPDP Act.
8. How long we keep it — active account; medical-record retention; audio 24h; the asymmetric
   deletion rule in plain words.
9. Your rights — access, correction, erasure, withdraw consent, nominate, grievance; 30-day
   response.
10. Deleting your account (`id="delete-account"`) — in-app path (Settings → Account → Delete),
    email path, what is removed and what is retained.
11. Children — adults; child records managed by guardian, provider or school infirmary.
12. Not a medical device.
13. App permissions — Android permission list with one-line reason each (Internet, Contacts
    write, Location fine/coarse, Notifications, Camera, Microphone, Photos/media).
14. Changes to this policy.
15. Grievance officer and contact — name, designation, email, phone, registered office.

Length target: 1,800–2,400 words. Plain English, second person, no legalese where a plain word
exists. The user's draft wording is kept wherever it is accurate.

---

## 5. PDF build

`scripts/build-privacy-pdf.sh`:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="privacy/UMC-Privacy-Policy-v1.0-unsigned.pdf" \
  --virtual-time-budget=5000 \
  "file://$PWD/privacy/index.html"
```

`@page { size: A4; margin: 18mm 16mm 22mm; }`. `.web-only` hidden in print, `.print-only`
hidden on screen. The board-approval block has `break-before: page`. Fonts load from Google
Fonts over the network during render; the virtual-time budget gives them time to arrive.

---

## 6. Signed-copy flow (manual, user-owned)

1. Run the build script; open the unsigned PDF in Preview; both directors add signatures
   and dates with Preview's Markup → Sign; save as `UMC-Privacy-Policy-v1.0-signed.pdf`.
2. Firebase console → Storage → bucket `tablet-reminder-app-111204.firebasestorage.app` →
   folder `legal/` → upload. Copy the file's download URL (contains `?alt=media&token=…`).
3. Paste that URL into the `href` of `#signed-copy a` in `privacy/index.html`, remove the
   `hidden` attribute, commit, push. Netlify deploys.

The token URL bypasses Storage rules, which is acceptable here because the document is public
by intent. No rules deploy, no coordination with the app repo.

---

## 7. Verification

- Page renders correctly with JavaScript disabled (Chrome DevTools → Disable JavaScript).
- Page renders at 400px width with no horizontal scroll; the processor table scrolls inside its
  own container.
- `python3 -m http.server` from the repo root: `/privacy/` loads, the footer link on `/`
  reaches it, `#delete-account` scrolls to the deletion section.
- PDF: letterhead on page 1, body readable, signature block alone on the last page, two
  signature cells with names and DINs, no browser header/footer.
- Every processor in the inventory table appears in the page's table. Every Android permission
  in the manifest appears in section 13.
- `grep -c 'geofenc\|Crashlytics\|vitals' privacy/index.html` returns 0.

---

## 8. Play Console values (for the user)

- Privacy policy URL: `https://unifiedmedicalcare.com/privacy/`
- Account deletion URL: `https://unifiedmedicalcare.com/privacy/#delete-account`
- Data safety form: fill from `tablet_reminder/docs/privacy-data-inventory.md`; the "background
  location" tier should be re-checked — the Android manifest no longer declares
  `ACCESS_BACKGROUND_LOCATION`, so delivery tracking is foreground-only on Android.

## 9. Follow-ups outside this spec
- Add the in-app privacy link (Settings and sign-up) in `tablet_reminder` pointing at the URL.
- Decide the iOS display name (`TARVA` vs `UMC`); the policy uses "Unified Medical Care (UMC)".
- Terms of Service page.
