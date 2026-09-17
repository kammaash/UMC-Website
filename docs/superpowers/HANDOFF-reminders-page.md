# HANDOFF — Patient reminders web page (`/reminders/`)

**Written 2026-09-17 for whoever picks this up on another machine with their own Claude Code
terminal. Read fully before touching anything. The backend is LIVE; the page is built and
tested but NOT merged, NOT deployed, and NOT yet exercised end to end with a real patient.**

## 1. What this is, in one paragraph

A doctor creates a patient in the UMC phone app and prescribes medicines. Instead of installing
the app, the patient scans a QR (or gets a WhatsApp message) pointing at ONE fixed address,
`https://unifiedmedicalcare.com/reminders/`, signs in with phone OTP, confirms "yes, that's me",
allows notifications, and from then on this phone gets a web push for every dose, with a
"Taken" button. The page also lists today's medicines with a Taken button of its own. Installing
the app later needs no migration: same phone, same account, same patient group.

## 2. Where things are

| What | Where |
|---|---|
| The page (React, TypeScript, Vite) | `portal/src/roles/patient/` in this repo (`UMC-Website`) |
| Branch | `feat/reminders-web-page`, cut from `origin/main` (the local branch named `privacy-main` on Anand's Mac equals `origin/main`; his local `main` is stale — always branch from `origin/main`) |
| Backend (Cloud Functions, rules, sender) | the `tablet_reminder` repo (Flutter app + `functions/`), all LIVE in production since 2026-09-16 |
| Backend design spec | `tablet_reminder/docs/superpowers/specs/2026-09-14-web-medication-reminders-backend-design.md` |
| Backend deploy record | `tablet_reminder/docs/web-reminders-deploy.md` |
| Doctor-side link/QR | `tablet_reminder/lib/components/reminders_link.dart` (prints the fixed address) |

Commits on the branch, oldest first:

1. `46db4f2` — extract the phone-OTP modal from `LoginPage.tsx` into `shared/auth/PhoneOtp.tsx` (+ `.css`, `phoneAuthErrors.ts`). Pure move.
2. `ff37603` — `/reminders` route, page shell, phone OTP sign-in, deploy-workflow copy step.
3. `da3f858` — claim step: `previewGroupClaim` → confirm card → `claimGroup`; the no-match rule.
4. `f62dda0` — web push: service worker, manifest, VAPID token, `webPushTokens` write, iPhone gate.
5. `e592a4c` — today's doses list + "Taken" from the page; `?dose=` deep link.
6. `d86766b` — restyle onto the app's light neumorphic theme.
7. this handoff.

## 3. Get running (15 minutes)

```bash
git clone https://github.com/kammaash/UMC-Website.git && cd UMC-Website
git checkout feat/reminders-web-page
cd portal && npm ci
cp .env.example .env        # then fill the 7 values (below)
npm run dev                 # → http://localhost:5173/member/reminders
```

`.env` is gitignored. The six `VITE_FB_*` values are the Firebase **web** config for project
`tablet-reminder-app-111204` (Firebase console → Project settings → General → Your apps → the
web app). `VITE_FB_VAPID_KEY` is Project settings → Cloud Messaging → Web Push certificates →
Key pair. All seven are public web config, not secrets; ask Anand for a copy of his `.env`.
Do NOT set `VITE_FB_APPCHECK_SITE_KEY` — the page must work with no App Check token.

The dev server mounts the whole portal under `/member/` (Vite `base`), so the page is at
`/member/reminders` locally and at `/reminders/` in production. Both are the same bundle.

Verification baselines (measured 2026-09-17, re-measure before quoting):

| Command | Expected |
|---|---|
| `npm run build` | green (`tsc -b && vite build`) |
| `npx eslint .` | **8 errors, all pre-existing** in files this work never touched (`ClinicLocationPicker`, `SchedulePage`, `SettingsPage`, `mappers.ts`, `useFirestore.ts`, `primitives.tsx`, `AuthContext.tsx`). Any change must not raise this number. |
| `npm test` | 76 passing (vitest, jsdom) |

**Important: the dev server hits PRODUCTION.** There is no test backend. Phone OTP sends real
SMS, `claimGroup` really claims a patient group, `webPushTokens` and `medicationLogs` are real
documents. Treat every click as production.

## 4. The rules this repo already lives by (the portal's `CLAUDE.md` is gitignored, so here they are)

- **Never modify anything outside `portal/`** except the deploy workflow (`.github/workflows/deploy-portal.yml`), which already had to learn about `reminders/`.
- **A page/component never imports `firebase` directly** — only hooks/actions from a `data/` module. This keeps UI restylable and logic testable. `roles/patient/data/` follows it.
- **Mirror the phone app and the backend exactly**: Firestore field names, status strings, callable names, payload keys. The contracts are in §6; do not "improve" a shape here — change it in `tablet_reminder` first and deploy there.
- **No custom server.** The portal reads Firestore under rules and calls existing Cloud Functions. If a new read/write hits `Missing or insufficient permissions`, the rule (in `tablet_reminder/firestore.rules`) needs a look; do not work around it client-side.
- **Cloud Functions are in `asia-south1`**; `shared/lib/firebase.ts` already pins that.
- TypeScript everywhere; TDD the pure units (`data/*.ts` with `*.test.ts`); commit on a feature branch, never straight to `main` (a push to `main` deploys).

## 5. Architecture of the page

```
portal/src/
  app/App.tsx                 <Route path="/reminders" element={<RemindersPage/>}/>   (no role guard)
  main.tsx                    router basename '' at the site root, '/member' under /member
  shared/auth/PhoneOtp.tsx    the +91 / 6-box OTP modal, shared with the doctor login
  shared/auth/PhoneOtp.css    every colour is var(--otp-*, <dark default>); the reminders root sets light values
  shared/auth/phoneAuthErrors.ts   Firebase auth error → message
  shared/auth/access.ts       UserProfile gained optional patientGroupID
  shared/design/{tokens,neo}.css, icons.tsx   the app's design system (web port) — use these, don't invent
  roles/patient/
    RemindersPage.tsx         state machine: auth → claim → push; renders everything except the list
    RemindersPage.css         page styles on the app tokens
    TodayDoses.tsx            today's medicines + Taken; ?dose=<logId> highlight + scroll
    data/reminderAuth.ts      sendOtp / confirmOtp / resetOtp / signOutReminders   (firebase/auth)
    data/reminderClaim.ts     previewClaim / claimGroup / usersDocExists / deleteOrphanAccount / signOutExisting
    data/claimDecision.ts     PURE: decideAfterPreview, decideNoMatch, browserTimezone, claimErrorMessage
    data/reminderPush.ts      currentPlatform / permission / SW registration / registerPushToken / listenForeground / installPwaHead
    data/platformGate.ts      PURE: iOS version + standalone + API presence → gate + token platform label
    data/tokenDocId.ts        PURE: sha256 hex of the FCM token (= server's webPushTokens doc id)
    data/doses.ts             PURE: today's doses, mirrors the server's medicationTimeHelpers.js
    data/useTodayDoses.ts     live group + tablets + today's logs → doses (30 s tick)
    data/reminderDoses.ts     markDoseTaken → medicationLogs write (markedBySource 'patient_web')
    data/phoneFormat.ts       "+917799440022" → "+91 77994 40022"
  public/firebase-messaging-sw.js   the service worker (see §6.4)
  public/manifest.webmanifest       scope + start_url /reminders/, standalone
```

Page flow (every state is in `RemindersPage.tsx`):

1. `status === 'unknown'` → "Loading…" (waits for the persisted session; matters on a Home Screen reopen).
2. Signed out → welcome + **Continue with phone** → `OtpModal` → `sendOtp('+91…')` → `confirmOtp(code)`.
   On an iPhone in a browser tab the **Add to Home Screen** steps show ABOVE the button (the
   Home Screen app has its own storage, so sign in there or you sign in twice; harmless).
3. Signed in → `previewClaim()` (no args; the server finds the doctor-created group by the
   OTP-proven phone) → `decideAfterPreview(preview, profile)`:
   - `already-claimed` (users doc already has `patientGroupID`, role patient) → skip to 4.
   - `confirm` → card with patient name + "Set up by Dr X" → **Yes, that's me** → `claimGroup(gid)` with the browser's IANA zone.
   - `other-account` → sign out + message.
   - `no-match` → **the rule (decided 2026-09-17, mirrors the member portal exactly):** delete the
     just-created Auth account ONLY if no `users/{uid}` doc exists (fresh orphan); if a users doc
     exists (an existing app patient or a provider) → plain sign-out, never delete. An unreadable
     users doc fails SAFE to sign-out.
4. Claimed → push: `currentPlatform()` gate → `pushSupported()` → permission `granted` ⇒ silent
   `registerPushToken` on every open (refreshes `lastSeenAt`, re-activates); `default` ⇒ **Allow
   reminders** button (the prompt needs a tap); `denied` ⇒ how to unblock. Then `TodayDoses`.

## 6. Backend contracts (all LIVE; source of truth is `tablet_reminder/functions/`)

### 6.1 Callables (`asia-south1`, NOT App-Check-armed by decision — never require an App Check token here)
- `previewGroupClaim({})` → `{found:false}` | `{found:true, groupId, patientName, doctorName, isPrimary}`. Fails OPEN to `found:false` on any server error (so a preview can never block sign-in).
- `claimGroup({groupId, timezone})` → `{ok:true, groupId, fullName}`. Errors: `failed-precondition` (already on another account / record gone), `permission-denied` (record is not for this phone). Writes `patient_uid`, `timezone`, and `users/{uid}` `{role:'patient', patientGroupID}` in one transaction. Idempotent for the same uid.

### 6.2 Firestore (rules gate everything on `patient_uid` / membership)
- `patientGroups/{gid}` — read: member. The page reads `timezone`.
- `patientGroups/{gid}/tablets/*` — read: member. Fields used: `medication.name/strength/dosage`, `schedule.times[]` ("8:00 AM"), `schedule.daysOfWeek[]` (`['All']` or `['Mo','We',…]`), `schedule.reminderEnabled`, `caregiverSettings.lateWindow` ("15 Min").
- `patientGroups/{gid}/medicationLogs/{logId}` — read: member; write: `uid == patient_uid` only. **`logId = ${tabletId}_${yyyy-MM-dd}_${time with ':'→'-' and ' '→'_'}`**, e.g. `abc_2026-09-17_8-00_AM`. The Taken write is EXACTLY the app's doc: `{tabletId, medicationName, scheduledTime, takenAt(Timestamp), date, status:'taken'|'taken_late', takenLate, createdAt(serverTimestamp), markedBy: uid, markedBySource:'patient_web'}`, `set()` without merge.
- `patientGroups/{gid}/webPushTokens/{sha256hex(token)}` — read/write: `uid == patient_uid` only. Page writes `{token, platform:'android-chrome'|'ios-homescreen'|'other', userAgent(≤256), createdAt (first write only), lastSeenAt, active:true, deactivatedReason: deleted}`. The sender sets `active:false, deactivatedReason` on a dead token; the app sets `active:false, deactivatedReason:'app_login'` when the patient logs into the app (app takes over reminders).
- `patientGroups/{gid}/reminderSends/*` — server-only. Never read it.

### 6.3 The sender (`sendWebMedicationReminders`, every minute)
Pushes each due dose (`reminderEnabled === true`, today in `daysOfWeek`, scheduled time within the
last `sendWindowMinutes` in the GROUP's timezone) to each active token, once per dose per day.
Message: `notification {title: medication name, body: "Time for your 8:00 AM dose"}`,
`data {type:'medication_reminder', gid, tabletId, logId, scheduledTime, date, actionToken}`,
`webpush.fcmOptions.link = https://unifiedmedicalcare.com/reminders/?dose=<logId>`,
`webpush.notification {tag: logId, requireInteraction: true, actions:[{action:'taken', title:'Taken'}]}`.
**Kill switch: `app_service/webReminders.enabled`** (5-min cache). `durationDays` is ignored (course-end is a deferred app-wide gap).

### 6.4 `markDoseFromPush` (HTTPS, unauthenticated by design — the action token is the auth)
`POST {token}` from origin `https://unifiedmedicalcare.com` ONLY (CORS is the apex; if the page is
ever served from `www.`, the function's CORS list must change first). 200 `{ok}` / 200 `{alreadyTaken}`,
403 `invalid-token` (bad/expired — tokens expire 6 h after the dose), 429 rate-limited, 503 when
the kill switch is off. The service worker calls it for the notification's Taken button and shows
a "Not marked as taken — tap to open the page" notification on any failure. iOS shows NO action
buttons: a tap opens the page at `?dose=`, and the page's own Taken does the write.

Service worker facts: served at `/reminders/firebase-messaging-sw.js` (the workflow copies it
from the built bundle so its scope covers the page); Firebase config arrives in the registration
URL's query string (Vite cannot inject env into `public/`); it loads the compat SDK from
gstatic pinned to `package.json`'s firebase version (`SDK` const — keep them equal); it registers
its `notificationclick` BEFORE `firebase.messaging()` and calls `stopImmediatePropagation()` so
the SDK's own handler never runs. The SDK stores the message on the notification as
`data.FCM_MSG`; foreground messages (page open) are re-shown through the same registration.

## 7. Deploy (GitHub Pages, no Firebase Hosting)

Push to `main` runs `.github/workflows/deploy-portal.yml`: `npm ci && npm run build` with the
`VITE_*` secrets (**`VITE_FB_VAPID_KEY` is already set as a repo secret, 2026-09-17**), then copies
`portal/dist/` → `member/`, `member/index.html` → `login/index.html` and `reminders/index.html`,
`member/firebase-messaging-sw.js` → `reminders/`, and commits those back to `main` as a bot commit
(`[skip ci]`). `reminders/` does not exist until that first run; until then the root `404.html`
bounces `/reminders/` to the home page. Pull the bot commit afterwards.

To ship: `git checkout main && git pull && git merge feat/reminders-web-page && git push` (or a PR).
A push to `main` is immediately live — do it only when the page is ready for a real patient.

## 8. Testing — what is known, what is owed

**Test numbers** (Firebase console → Authentication → Sign-in method → Phone → test numbers; codes there):
- `+916304519244` = Dr Ranganath's account, `+917995601391` = the Anand Kamma test doctor (and it is registered as **+1**, not +91). Both hit the designed "already has a UMC account" sign-out. Not a bug.
- **`+919999900001` is FREE** (no Auth user, no users doc, no group). Use it: have Dr Ranganath (test doctor `9xUOSn1HzYcgGOD4luRZKMpPuEo1`) either edit **Patient B** (`patientGroups/DOC_1789194364694_XG634U`, currently phone `7799440022`, unclaimed) to that number, or create a fresh patient with it and prescribe ONE tablet due a few minutes ahead. Patient B's 34 existing tablets all have `reminderEnabled:false` (prescribed before the 2026-09-16 deploy, no backfill by decision) → they LIST with a "No reminder" badge but never push.
- `previewGroupClaim` matches on the OTP-proven phone's last 10 digits against `patient_phone_last10` on doctor-created (`createdByDoctor:true`) groups, first match.

**Owed (nobody has done these yet):**
1. Full flow with the free test number on desktop Chrome from the dev server: sign in → confirm → claim → Allow → check `webPushTokens/{hash}` appears → wait for a due, reminder-enabled dose → the notification arrives on the Mac → tap Taken → `medicationLogs/{logId}` with `markedBySource:'patient_web_push'`; page Taken → `'patient_web'`. Function logs: `sendWebMedicationReminders {"groups":1,"dosesDue":1,"sent":1,...}`.
2. Merge + deploy, then the same on **Android Chrome** at the live address.
3. **iPhone** (iOS ≥ 16.4): open the live address in Safari → Add to Home Screen → open from the Home Screen → sign in there → Allow. Confirm a push arrives; confirm a tap opens the page with the dose highlighted (no Taken button on iOS notifications).
4. Then note results in this file.

Headless-Chrome tip: screenshots of the OPEN OTP modal hang against the Vite dev server (HMR);
capture from `npx vite preview` instead. Headless always gets a reCAPTCHA image puzzle on Send;
real browsers pass the invisible check.

## 9. Decisions that must not be undone

- **No group id, no code, no link parameter in the address — ever.** The QR is `unifiedmedicalcare.com/reminders/` and nothing else. The app repo deleted an entire bearer-token invite system because "the token WAS the auth"; do not rebuild it here. The only identity is Firebase's OTP-proven `phone_number`; the only pointer in a URL is `?dose=<logId>` from a notification, which grants nothing.
- **No App Check requirement** on this page (`previewGroupClaim`/`claimGroup` are deliberately unarmed; `markDoseFromPush` is unauthenticated by design).
- **Delete an Auth account only when it is a fresh orphan** (no users doc). See §5 step 3.
- **The doctor login is untouched**: `LoginPage.tsx` still redirects phone-width viewports to the download section and still deletes unregistered OTP sign-ups; that gate is why this page has its own auth actions. `PhoneOtp.css` dark defaults keep it byte-identical.
- **The list shows every tablet scheduled today**, reminder-enabled or not (badge), and ignores course end, matching the sender. Changing either is a product call for both channels together.
- Shared backend: any change to rules/functions/config happens in `tablet_reminder`, with its deploy protocol (fetch live rules first, diff, tests, deploy by name). Not from here.

## 10. Small things you will notice

- `.gitignore` at the repo root has an uncommitted one-character change on Anand's Mac (his; not part of this work).
- `member/` and `login/` in the repo are the LAST deploy's build output (bot commits); do not edit them by hand.
- Local `node_modules` on Anand's Mac predated `@types/google.maps` until `npm ci` on 2026-09-17; if `tsc` complains about `google`, run `npm ci`.
- The manifest lists one 180 px icon (`/member/app_logo.png`); Android's install prompt wants 192 px, but install is not needed on Android for push. iPhone uses the apple-touch-icon.
