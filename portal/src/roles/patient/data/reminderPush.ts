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
import { registerAction, type ExistingToken, type RegisterAction } from './pushDecision'
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

// Chromium exposes its native PWA install sheet through beforeinstallprompt.
// Keep the event until onboarding reaches the install step. Other browsers
// simply never emit it (Apple uses its share-sheet/Home Screen flow instead).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

let pendingInstallPrompt: BeforeInstallPromptEvent | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    pendingInstallPrompt = event as BeforeInstallPromptEvent
  })
  window.addEventListener('appinstalled', () => { pendingInstallPrompt = null })
}

// Browsers may reject prompt() when the preceding notification dialog has
// consumed the user activation. That is not fatal: the normal browser install
// affordance remains available and the reminders dashboard still opens.
export async function requestAppInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = pendingInstallPrompt
  if (!event) return 'unavailable'
  try {
    await event.prompt()
    const { outcome } = await event.userChoice
    pendingInstallPrompt = null
    return outcome
  } catch {
    return 'unavailable'
  }
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

// The token this browser last registered, so sign-out can turn exactly that
// doc off without asking FCM for a token all over again.
let lastToken: string | null = null

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

  const ref = doc(db, 'patientGroups', gid, 'webPushTokens', await tokenDocId(token))
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
export async function deactivatePushToken(gid: string): Promise<void> {
  if (!lastToken) return   // this browser never registered — nothing to turn off
  const ref = doc(db, 'patientGroups', gid, 'webPushTokens', await tokenDocId(lastToken))
  await setDoc(ref, {
    active: false,
    deactivatedReason: 'web_signout',
    lastSeenAt: serverTimestamp(),
  }, { merge: true })
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
