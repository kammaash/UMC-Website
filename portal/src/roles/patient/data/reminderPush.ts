// reminderPush.ts — web push registration for the reminders page (the only
// module here that touches the browser push APIs and firebase/messaging).
//
// Flow: permission (needs a user gesture) → register the service worker at
// the page's mount → FCM token via the VAPID key → write
// patientGroups/{gid}/webPushTokens/{sha256(token)} under rules (patient-only).
// Spec field set (design §5.3): token, platform, userAgent, createdAt,
// lastSeenAt, active — createdAt only on first write, lastSeenAt on every
// page open; re-registering also re-activates a token the app or the sender
// deactivated (the sender simply deactivates it again if it is really dead).
import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging'
import { doc, getDoc, setDoc, serverTimestamp, deleteField } from 'firebase/firestore'
import { app, db } from '../../../shared/lib/firebase'
import { detectPlatform, type Platform, type TokenPlatform } from './platformGate'
import { registerAction, needsTurningOff, signOutTargets, type ExistingToken, type RegisterAction, type TokenRef } from './pushDecision'
import { tokenDocId } from './tokenDocId'

// ── platform facts (DOM) ─────────────────────────────────────────────────
export function currentPlatform(): Platform {
  const nav = navigator as Navigator & { standalone?: boolean }
  const standalone = nav.standalone === true
    || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches)
  return detectPlatform({
    ua: navigator.userAgent,
    standalone,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPushManager: 'PushManager' in window,
    hasNotification: 'Notification' in window,
  })
}

export async function pushSupported(): Promise<boolean> {
  try { return await isSupported() } catch { return false }
}

export function permissionState(): NotificationPermission | 'unsupported' {
  return 'Notification' in window ? Notification.permission : 'unsupported'
}

export async function requestPermission(): Promise<NotificationPermission> {
  return Notification.requestPermission()
}

// Chromium offers to install the page through beforeinstallprompt, and on
// Android shows its own "Add to Home screen" bar if nobody answers the event.
// Android takes reminders in an ordinary tab, so the page asks nobody to
// install it (decision 2026-09-29) — and holding the event back keeps that
// bar from appearing on its own, unexplained. The browser's menu can still
// install the page for anyone who wants it. Other browsers never emit the
// event (Apple uses its share-sheet/Home Screen flow instead).
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault() })
}

// ── PWA head tags (manifest + Apple metas), injected only on this page so
// the doctor portal served from the same bundle does not advertise itself
// as the reminders app. Idempotent. ──────────────────────────────────────
export function installPwaHead(): void {
  if (document.querySelector('link[rel="manifest"]')) return
  const link = document.createElement('link')
  link.rel = 'manifest'; link.href = '/member/manifest.webmanifest'
  document.head.appendChild(link)
  const metas: Array<[string, string]> = [
    ['apple-mobile-web-app-capable', 'yes'],
    ['mobile-web-app-capable', 'yes'],
    ['apple-mobile-web-app-title', 'UMC Reminders'],
    ['apple-mobile-web-app-status-bar-style', 'black'],
    ['theme-color', '#0b0b0b'],
  ]
  for (const [name, content] of metas) {
    const m = document.createElement('meta'); m.name = name; m.content = content
    document.head.appendChild(m)
  }
}

// ── service worker ───────────────────────────────────────────────────────
// The bundle is mounted at /member/ (dev + the doctor portal) and /reminders/
// (production). The worker lives beside index.html at either mount.
function mount(): string {
  return location.pathname.startsWith('/member') ? '/member/' : '/reminders/'
}
function swUrl(): string {
  const q = new URLSearchParams({
    apiKey: import.meta.env.VITE_FB_API_KEY,
    projectId: import.meta.env.VITE_FB_PROJECT_ID,
    messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FB_APP_ID,
  })
  return `${mount()}firebase-messaging-sw.js?${q}`
}
async function registration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register(swUrl(), { scope: mount() })
  await navigator.serviceWorker.ready
  return reg
}

// ── token + Firestore ────────────────────────────────────────────────────
export type PushSetupReason = 'vapid-missing' | 'no-token' | 'write-failed'
export class PushSetupError extends Error {
  readonly reason: PushSetupReason
  constructor(reason: PushSetupReason, cause?: unknown) {
    super(reason, { cause })
    this.reason = reason
  }
}

// The token this page load registered, so sign-out can turn exactly that
// doc off without asking FCM for a token all over again.
let lastToken: string | null = null

// …and the last one this BROWSER registered, on any visit, kept where a
// reload cannot lose it. Sign-out needs it for the visits that never get as
// far as a token of their own (FCM unreachable, the save failing, the record
// lookup failing) while an earlier visit's token is still on. Only the doc's
// address is kept — the group and the token's hash — never the token.
// Storage can throw (private modes, blocked site data); sign-out then has
// only this page load's token to go by, as it did before.
const REMEMBER_KEY = 'umc-push-token'
function readRemembered(): TokenRef | null {
  try {
    const raw = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null') as Partial<TokenRef> | null
    return raw && typeof raw.gid === 'string' && typeof raw.id === 'string' && raw.gid && raw.id
      ? { gid: raw.gid, id: raw.id } : null
  } catch { return null }
}
function remember(ref: TokenRef): void {
  try { localStorage.setItem(REMEMBER_KEY, JSON.stringify(ref)) } catch { /* lastToken still holds for this view */ }
}
function forget(): void {
  try { localStorage.removeItem(REMEMBER_KEY) } catch { /* nothing to do */ }
}

// Returns what happened: 'register' (this phone is on) or 'app-owns' (the UMC
// app has taken reminders over — the token stays off; see pushDecision.ts).
export async function registerPushToken(gid: string, platform: TokenPlatform): Promise<RegisterAction> {
  const vapidKey = import.meta.env.VITE_FB_VAPID_KEY
  if (!vapidKey) throw new PushSetupError('vapid-missing')
  const reg = await registration()
  const messaging = getMessaging(app)
  let token: string
  try {
    token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg })
  } catch (e) { throw new PushSetupError('no-token', e) }
  if (!token) throw new PushSetupError('no-token')
  lastToken = token

  const id = await tokenDocId(token)
  // Before the write, not after: if the write below fails, an earlier
  // visit's doc under this same id may well be on.
  remember({ gid, id })
  const ref = doc(db, 'patientGroups', gid, 'webPushTokens', id)
  try {
    const snap = await getDoc(ref)
    const action = registerAction(snap.exists() ? (snap.data() as ExistingToken) : null)
    // Presence is recorded either way — the sender ignores an inactive token,
    // but lastSeenAt still says this phone is around.
    const presence = {
      token,
      platform,
      userAgent: navigator.userAgent.slice(0, 256),
      lastSeenAt: serverTimestamp(),
    }
    if (action === 'app-owns') {
      await setDoc(ref, presence, { merge: true })
      return action
    }
    const base = { ...presence, active: true, deactivatedReason: deleteField() }
    await setDoc(ref, snap.exists() ? base : { ...base, createdAt: serverTimestamp() }, { merge: true })
    return action
  } catch (e) { throw new PushSetupError('write-failed', e) }
}

// Sign-out: stop this browser's token before the session goes away. The rule
// on webPushTokens is `uid == patient_uid`, so this CANNOT be done after
// signOut — and if it is skipped, the doses of the patient who just left keep
// pushing to a phone that may now belong to someone else. Throws on a failed
// write so the caller can refuse to sign out (decision 2026-09-18).
//
// Called on EVERY sign-out (decision 2026-09-29), whatever this page load
// managed to do; it works out for itself whether this browser holds a token
// that is on (pushDecision.ts). `gid` is null when the page never learned
// which record this is.
function isPermissionDenied(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && String((err as { code: unknown }).code) === 'permission-denied'
}
export async function deactivatePushToken(gid: string | null): Promise<void> {
  const currentId = lastToken ? await tokenDocId(lastToken) : null
  for (const target of signOutTargets(gid, currentId, readRemembered())) {
    const ref = doc(db, 'patientGroups', target.gid, 'webPushTokens', target.id)
    try {
      const snap = await getDoc(ref)
      if (!needsTurningOff(snap.exists() ? (snap.data() as ExistingToken) : null)) continue
      await setDoc(ref, {
        active: false,
        deactivatedReason: 'web_signout',
        lastSeenAt: serverTimestamp(),
      }, { merge: true })
    } catch (err) {
      // The rules say this account is not the record's patient (any more).
      // Trying again cannot change that, so it must not keep them signed in
      // for ever; every other failure can be retried, and is.
      if (!isPermissionDenied(err)) throw err
      console.error('push token not reachable by this account:', err)
    }
  }
  lastToken = null
  forget()
}

// ── foreground messages ──────────────────────────────────────────────────
// With the page open the SDK hands the message to the page instead of
// displaying it. Show it through the worker's registration so the SAME click
// handling (Taken action / open page) applies. The SDK's display path puts
// the whole message under data.FCM_MSG; mirror that.
export function listenForeground(): () => void {
  let unsub = () => {}
  pushSupported().then((ok) => {
    if (!ok) return
    unsub = onMessage(getMessaging(app), async (payload: MessagePayload) => {
      const reg = await navigator.serviceWorker.getRegistration(mount())
      if (!reg) return
      const d = payload.data || {}
      const opts: NotificationOptions & { actions?: Array<{ action: string; title: string }> } = {
        body: payload.notification?.body,
        tag: d.logId || undefined,
        requireInteraction: true,
        actions: d.actionToken ? [{ action: 'taken', title: 'Taken' }] : [],
        data: { FCM_MSG: payload },
      }
      await reg.showNotification(payload.notification?.title || 'Medicine reminder', opts)
    })
  })
  return () => unsub()
}
