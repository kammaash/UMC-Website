// RemindersPage.tsx — https://unifiedmedicalcare.com/reminders/
//
// The ONE fixed address a doctor shows (QR) or sends (WhatsApp) to a patient
// they created in the app. It carries no group id and never will (decision
// 2026-09-16): the page signs the patient in with phone OTP and the backend
// finds their record by the OTP-proven number alone.
//
// Steps (this file grows piece by piece):
//   piece 2 — shell + phone OTP sign-in
//   piece 3 — previewGroupClaim → confirm → claimGroup, and the no-match branches
//   piece 4 — web push registration (+ iPhone Add-to-Home-Screen gate)
//   piece 5 — today's doses + "Taken" (TodayDoses.tsx; ?dose=<logId> highlights)   ← here
//
// Not a member-portal page: no role guard, no users/{uid} requirement, no
// desktop-only redirect, and it must work with no App Check token at all.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { OtpModal } from '../../shared/auth/PhoneOtp'
import { phoneAuthMessage, otpAuthMessage } from '../../shared/auth/phoneAuthErrors'
import { sendOtp, confirmOtp, resetOtp, signOutReminders } from './data/reminderAuth'
import { previewClaim, claimGroup, usersDocExists, deleteOrphanAccount, signOutExisting, syncPatientName } from './data/reminderClaim'
import { decideAfterPreview, decideNoMatch, claimErrorMessage } from './data/claimDecision'
import {
  currentPlatform, pushSupported, permissionState, requestPermission,
  registerPushToken, deactivatePushToken, listenForeground, installPwaHead, PushSetupError,
} from './data/reminderPush'
import { installOs, type Platform } from './data/platformGate'
import { InstallPanel } from './InstallPanel'
import { NotifyPanel } from './NotifyPanel'
import { AllSetCard } from './AllSet'
import { RevealSetup } from './RevealSetup'
import { Glyph } from './glyphs'
import { readSetupDone, writeSetupDone } from './installProgress'
import { Icon } from '../../shared/design/icons'
import { formatIndianPhone } from './data/phoneFormat'
import { formatPatientName } from './data/formatName'
import { TodayDoses } from './TodayDoses'
import { AccountSheet } from './AccountSheet'
import { AccountAvatar } from './AccountAvatar'
import { useGreetingMorph } from './useGreetingMorph'
import './RemindersPage.css'

type OtpStep = 'idle' | 'phone' | 'otp'

// What the signed-in half of the page is doing.
type ClaimState =
  | { kind: 'looking' }
  | { kind: 'confirm'; groupId: string; patientName: string; doctorName: string }
  | { kind: 'claiming'; groupId: string; patientName: string; doctorName: string }
  // returning: signed in to a record this account had already claimed — the
  // heading says "Welcome back" instead of "You're set up".
  | { kind: 'claimed'; groupId: string; fullName: string; doctorName?: string; returning: boolean }
  | { kind: 'error'; message: string }

const NOT_YOU_MSG =
  "No worries — you're signed out, nothing was changed. If your doctor has reminders set up for you, ask them to double-check the phone number on file."
const EXISTING_ACCOUNT_MSG =
  'This number already has a UMC account. Open the UMC app — your reminders are there.'
const OTHER_ACCOUNT_MSG =
  'This record is already set up on another account. Ask your doctor to check.'

// The push half of the "claimed" screen.
type PushState =
  | { kind: 'checking' }
  | { kind: 'gate'; gate: 'ios-add-to-home' | 'ios-too-old' | 'unsupported' }
  | { kind: 'prompt' }        // permission not asked yet → "Enable Reminders" button (needs a tap)
  | { kind: 'denied'; stillBlocked?: boolean }  // permission refused in the browser; stillBlocked after a re-check
  | { kind: 'registering' }
  | { kind: 'enabled' }
  | { kind: 'app-owns' }      // the UMC app took reminders over on this phone — web push stays off
  | { kind: 'error'; message: string }

function pushErrorMessage(err: unknown): string {
  const reason = err instanceof PushSetupError ? err.reason : ''
  switch (reason) {
    case 'vapid-missing': return "Reminders aren't available on this site yet. Please tell your doctor."
    case 'no-token':      return "Couldn't set up notifications on this phone. Try again in a moment."
    case 'write-failed':  return "Couldn't save your reminder setting. Check your connection and try again."
    default:              return "Couldn't turn on reminders. Please try again."
  }
}

// Shown instead of the welcome screen — not alongside it — when the phone
// number just signed in with matches no patient record at all. Fixed overlay,
// same technique as OtpModal, so "Continue with phone" and the rest of the
// welcome copy underneath are fully hidden, not just captioned.
// `nonPatient`: the number already has a UMC account in the app, just not a
// patient one (a doctor, pharmacy…) — asking their doctor to register them
// would be the wrong advice, so that line says so instead (decision 2026-09-19).
function UnregisteredOverlay({ nonPatient, onDismiss }: { nonPatient: boolean; onDismiss: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])
  return (
    <div className="umc-unreg-overlay" onClick={(e) => e.target === e.currentTarget && onDismiss()}>
      <div className="umc-unreg-body" role="dialog" aria-modal="true" aria-labelledby="umc-unreg-hdg">
        <h1 id="umc-unreg-hdg" className="umc-unreg-hdg">Uh oh!</h1>
        <p className="umc-unreg-lead">We don't have you on our list yet.</p>
        <p className="umc-unreg-sub">
          {nonPatient
            ? 'This number is already registered in the UMC app as a non-patient.'
            : "Ask your doctor about UMC to get registered — once they've added you, this same page will have your reminders ready."}
        </p>
        <div className="umc-unreg-soon">
          <span className="umc-unreg-soon-badge">Coming soon</span>
          <img className="umc-unreg-soon-logo" src="/member/app_logo.png" alt="" />
          <p>A UMC app where you'll be able to register yourself and join the UMC Network. Stay tuned!</p>
        </div>
        <button type="button" className="umc-unreg-btn" autoFocus onClick={onDismiss}>Understood</button>
      </div>
    </div>
  )
}

export function RemindersPage() {
  const { status, user, profile } = useAuth()
  const [otpStep, setOtpStep] = useState<OtpStep>('idle')
  // Shown on the welcome screen after a sign-out we initiated (existing
  // account / declined match) or a failed sign-out.
  const [notice, setNotice] = useState<string | null>(null)
  // The full-screen "you're not registered" takeover — a genuinely unmatched
  // phone number gets this instead of the plain `notice` banner.
  // 'new': a number UMC has never seen; 'non-patient': an existing app
  // account that isn't a patient one.
  const [unregistered, setUnregistered] = useState<null | 'new' | 'non-patient'>(null)
  const [claim, setClaim] = useState<ClaimState>({ kind: 'looking' })
  // The lookup runs once per signed-in uid (StrictMode re-runs effects; the
  // orphan deletion must not).
  const lookedUpFor = useRef<string | null>(null)
  // Bumped by "Try again" so the lookup effect runs once more for the same uid.
  const [retryKey, setRetryKey] = useState(0)
  const [platform] = useState<Platform>(() => currentPlatform())
  // null on anything that can take push in a plain tab — there is no step to show.
  const install = installOs(platform.os)
  // Sign-in waits until the setup steps have been gone through once, wherever
  // they are shown (see installProgress.ts).
  const [setupDone, setSetupDone] = useState(readSetupDone)
  const signInHeld = platform.gate === 'ios-add-to-home' && !!install && !setupDone
  const handleSetupDone = () => { writeSetupDone(); setSetupDone(true) }
  // Phones get the setup section on its own a second after load, scrolled up
  // to the top of the screen: on iPhone/iPad it morphs out of the "Set up
  // reminders" pill (InstallPanel autoOpen), on Android it pops in
  // (RevealSetup.tsx). A Mac gets it straight away, in place.
  const onApplePhone = platform.os === 'iphone' || platform.os === 'ipad'
  const reveal = (key: string, panel: ReactNode) =>
    platform.os === 'android' ? <RevealSetup key={key}>{panel}</RevealSetup> : panel
  // ?dose=<logId> from a notification tap (the sender's fcmOptions.link).
  const [highlightLogId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('dose'))
  const [push, setPush] = useState<PushState>({ kind: 'checking' })
  // "You're all set!" is playing: reminders were just switched on by the
  // patient's own tap and the token write came back. Never on the silent
  // refresh a returning patient gets on every open.
  const [celebrating, setCelebrating] = useState(false)
  // Sign-out is blocked while this browser's push token is still live.
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  // Both "settled" states: reminders are handled, here or by the app.
  const settled = push.kind === 'enabled' || push.kind === 'app-owns'
  // Push has landed somewhere definite, good or bad — what the header's
  // status light waits for before it shows (it has nothing to say during
  // 'checking'/'registering'/'prompt').
  const pushResolved = settled || push.kind === 'denied' || push.kind === 'gate' || push.kind === 'error'
  // The name → avatar sequence runs on its own fixed clock (GREETING_HOLD_MS
  // after the claimed screen appears), independent of push.
  const morph = useGreetingMorph(claim.kind === 'claimed', claim.kind === 'claimed' ? claim.fullName : '')
  // The corner label is just the capitalised first initial — same font/colour
  // the name had in the heading (var(--serif) / var(--ink)), just shrunk.
  const nameInitial = claim.kind === 'claimed' ? (claim.fullName.trim().charAt(0).toUpperCase() || '?') : ''
  // The "the UMC app owns reminders here" note collapses out of the way once
  // the corner has settled — the header's status light carries the ongoing
  // signal. ('enabled' has no banner at all any more.) Denied/gated/erroring
  // states stay put; those still need the patient's attention.
  const setupTucked = settled && (morph.phase === 'corner' || morph.phase === 'avatar')

  useEffect(() => { document.title = 'UMC — Medicine reminders'; installPwaHead() }, [])

  // Shared by "no matching record" and the confirm card's "Not me": never
  // leave a phantom Auth account behind. Deletes only when uid carries no
  // users/{uid} doc (a fresh orphan this OTP just minted); otherwise a plain
  // sign-out — a real account (app patient or provider) is never deleted.
  // `onNotFound` lets each caller decide how to break that news (a plain
  // banner for a declined match, the full takeover screen for a true
  // no-match) — the account-safety decision itself is identical either way.
  // `onNonPatient`, when given, replaces the "already has a UMC account"
  // banner for an existing account whose role isn't patient; it is still
  // only signed out, never deleted.
  const cleanupUnclaimedAccount = async (uid: string, onNotFound: () => void, onNonPatient?: () => void) => {
    let exists = true // fail-safe: an unreadable users doc is treated as existing → sign-out, never delete
    try { exists = await usersDocExists(uid) } catch (e) { console.error('users doc read failed:', e) }
    if (decideNoMatch(exists) === 'delete-orphan') {
      onNotFound()
      await deleteOrphanAccount().catch((e) => console.error('orphan delete failed:', e))
    } else {
      const role = (profile?.role || '').trim()
      if (onNonPatient && exists && role && role !== 'patient') onNonPatient()
      else setNotice(EXISTING_ACCOUNT_MSG)
      await signOutExisting().catch((e) => console.error('sign-out failed:', e))
    }
  }

  // ── the lookup: runs as soon as a session exists ─────────────────────────
  useEffect(() => {
    // Signed out: forget the last patient entirely, so nothing of theirs (the
    // header's avatar and status light, the finished name animation) is left
    // behind on the sign-in screen or carried into the next sign-in.
    if (status !== 'signed-in' || !user) { lookedUpFor.current = null; setClaim({ kind: 'looking' }); return }
    if (lookedUpFor.current === user.uid) return
    lookedUpFor.current = user.uid
    const uid = user.uid
    let cancelled = false
    ;(async () => {
      setClaim({ kind: 'looking' })
      let preview
      try { preview = await previewClaim() }
      catch (err) {
        console.error('previewGroupClaim failed:', err)
        if (!cancelled) setClaim({ kind: 'error', message: "Couldn't look up your record. Check your connection and try again." })
        return
      }
      const verdict = decideAfterPreview(preview, profile)
      if (cancelled) return
      switch (verdict.kind) {
        case 'already-claimed': {
          const fullName = profile?.fullName || ''
          setClaim({ kind: 'claimed', groupId: verdict.groupId, fullName, doctorName: verdict.doctorName, returning: true })
          // Best-effort: claimGroup never wrote a name, so fill it in now if
          // the lookup carries one and it's missing/stale. Only from the SAME
          // group, though — the phone lookup returns the first doctor-created
          // record for this number, which could be a second doctor's record or
          // a family member sharing the phone.
          if (preview.found && preview.groupId === verdict.groupId) {
            syncPatientName(uid, fullName, preview.patientName || '').catch((e) => console.error('name sync failed:', e))
          }
          return
        }
        case 'confirm':
          setClaim({ kind: 'confirm', groupId: verdict.groupId, patientName: verdict.patientName, doctorName: verdict.doctorName })
          return
        case 'other-account':
          setNotice(OTHER_ACCOUNT_MSG)
          await signOutExisting().catch((e) => console.error('sign-out failed:', e))
          return
        case 'no-match':
          await cleanupUnclaimedAccount(uid, () => setUnregistered('new'), () => setUnregistered('non-patient'))
          return
      }
    })()
    return () => { cancelled = true }
    // profile is settled by the time status is 'signed-in' (AuthContext loads
    // it before flipping status), so it is read, not depended on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user, retryKey])

  // ── push: once claimed, find out where this browser stands ──────────────
  const claimedGid = claim.kind === 'claimed' ? claim.groupId : null
  // `celebrate`: this follows the patient's own action (Enable Reminders,
  // a re-check after unblocking, Try again), so a confirmed 'enabled' earns
  // "You're all set!".
  const register = async (gid: string, celebrate = true) => {
    setPush({ kind: 'registering' })
    try {
      const action = await registerPushToken(gid, platform.tokenPlatform)
      const enabled = action !== 'app-owns'
      setPush({ kind: enabled ? 'enabled' : 'app-owns' })
      if (enabled && celebrate) setCelebrating(true)
    }
    catch (err) { console.error('push registration failed:', err); setPush({ kind: 'error', message: pushErrorMessage(err) }) }
  }
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!claimedGid) { setPush({ kind: 'checking' }); setCelebrating(false); return }
      if (platform.gate !== 'ok') { setPush({ kind: 'gate', gate: platform.gate }); return }
      if (!(await pushSupported())) { if (!cancelled) setPush({ kind: 'gate', gate: 'unsupported' }); return }
      const perm = permissionState()
      if (cancelled) return
      if (perm === 'granted') await register(claimedGid, false)   // silent refresh on every open (lastSeenAt)
      else if (perm === 'denied') setPush({ kind: 'denied' })
      else setPush({ kind: 'prompt' })
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimedGid])

  // "Allow reminders" — the permission prompt must come from a tap.
  const handleAllow = async () => {
    if (!claimedGid) return
    let perm: NotificationPermission = 'default'
    try { perm = await requestPermission() } catch (err) { console.error('permission request failed:', err) }
    if (perm === 'granted') await register(claimedGid)
    else if (perm === 'denied') setPush({ kind: 'denied' })
  }
  // After the patient unblocks notifications in the site settings: granted →
  // register; back to "not asked" → the ask steps; still denied → say so.
  const recheck = async (fromTap: boolean) => {
    if (!claimedGid) return
    const perm = permissionState()
    if (perm === 'granted') await register(claimedGid)
    else if (perm === 'default') setPush({ kind: 'prompt' })
    else if (fromTap) setPush({ kind: 'denied', stillBlocked: true })
  }
  // Android: the fix happens in Settings, outside the page — look again as
  // soon as the patient comes back to it.
  useEffect(() => {
    if (push.kind !== 'denied' || platform.os !== 'android') return
    const onVisible = () => { if (document.visibilityState === 'visible') void recheck(false) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push.kind, claimedGid])
  // While enabled, a message arriving with the page open is shown by the
  // worker so the same click handling applies.
  useEffect(() => { if (push.kind !== 'enabled') return; return listenForeground() }, [push.kind])

  // ── OTP modal callbacks ──────────────────────────────────────────────────
  const handleSendOtp = async (phone: string): Promise<string | null> => {
    try { await sendOtp(phone); setOtpStep('otp'); return null }
    catch (err) { console.error('Phone sign-in error:', err); return phoneAuthMessage(err) }
  }
  const handleConfirm = async (code: string): Promise<string | null> => {
    try { await confirmOtp(code); setOtpStep('idle'); setNotice(null); return null }
    catch (err) { console.error('OTP confirm error:', err); return otpAuthMessage(err) }
  }
  const handleCancel = () => { resetOtp(); setOtpStep('idle') }

  // ── confirm card: "Yes, that's me" ───────────────────────────────────────
  const handleClaim = async () => {
    if (claim.kind !== 'confirm') return
    const { groupId, patientName, doctorName } = claim
    setClaim({ kind: 'claiming', groupId, patientName, doctorName })
    try {
      const res = await claimGroup(groupId)
      setClaim({ kind: 'claimed', groupId: res.groupId, fullName: res.fullName, doctorName, returning: false })
      // claimGroup doesn't persist the name itself — write it now, best-effort.
      if (user) syncPatientName(user.uid, profile?.fullName, res.fullName).catch((e) => console.error('name sync failed:', e))
    } catch (err) {
      console.error('claimGroup failed:', err)
      setClaim({ kind: 'error', message: claimErrorMessage(err) })
    }
  }
  // ── confirm card: "Not me" — this account is still a fresh orphan (claimGroup
  // hasn't run), so clean it up the same way an unmatched sign-in would.
  const handleDecline = async () => {
    if (claim.kind !== 'confirm' || !user) return
    await cleanupUnclaimedAccount(user.uid, () => setNotice(NOT_YOU_MSG))
  }
  const handleRetry = () => { lookedUpFor.current = null; setNotice(null); setRetryKey((k) => k + 1) }

  // Sign-out must turn this browser's push token off FIRST: the rule on
  // webPushTokens is `uid == patient_uid`, so once the session is gone the
  // patient can no longer stop their own reminders — and this phone would keep
  // buzzing with their doses even after someone else signs in on it.
  // Decision 2026-09-18: if that write fails, refuse to sign out and let them
  // retry, rather than leaving a live token behind on a phone being handed on.
  const handleSignOut = async () => {
    setNotice(null); setSignOutError(null)
    if (claimedGid && push.kind === 'enabled') {
      setSigningOut(true)
      try { await deactivatePushToken(claimedGid) }
      catch (err) {
        console.error('push token deactivation failed:', err)
        setSigningOut(false)
        setSignOutError("Couldn't turn reminders off on this phone. Check your connection and try again.")
        return
      }
      setSigningOut(false)
    }
    try { await signOutReminders() }
    catch (err) { console.error('Sign-out error:', err); setNotice("Couldn't sign out. Please try again.") }
  }

  // ── render ───────────────────────────────────────────────────────────────
  let body
  if (status === 'unknown') {
    body = <div className="umc-rem-loading"><span className="umc-spin" aria-hidden="true" />Loading…</div>
  } else if (status === 'signed-out' || !user) {
    body = (
      <main className="umc-rem-main">
        <h1 className="umc-rem-hdg">Your medicine reminders</h1>
        <p className="umc-rem-lead">
          Your doctor has set up your medicines here. Sign in with
          <strong> the phone number your doctor has</strong>, and this page will
          remind you when each dose is due.
        </p>
        {notice && <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />{notice}</p>}
        {platform.gate === 'ios-add-to-home' && install && <InstallPanel beforeSignIn autoOpen={onApplePhone} os={install} browser={platform.browser} safariVersion={platform.safariVersion} onDone={handleSetupDone} />}
        {platform.gate === 'ios-too-old' && (
          <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />Reminders need iOS 16.4 or newer. Update your iPhone in Settings → General → Software Update, then come back.</p>
        )}
        <button
          type="button"
          className="umc-btn primary full big"
          disabled={signInHeld}
          aria-describedby={signInHeld ? 'umc-rem-held' : undefined}
          onClick={() => { setNotice(null); setOtpStep('phone') }}
        >
          <Icon name="phone" size={20} />
          Continue with phone
          <span className="umc-rem-btn-arrow"><Icon name="chevronRight" size={20} /></span>
        </button>
        {signInHeld && <p className="umc-rem-note umc-rem-held" id="umc-rem-held">Go through the setup steps above first.</p>}
        <p className="umc-rem-note" hidden={signInHeld}>
          {platform.gate === 'ios-add-to-home'
            ? install === 'mac'
              ? 'Sign in from the Dock app · 6-digit code by SMS'
              : 'Sign in from the Home Screen app · 6-digit code by SMS'
            : "You'll get a 6-digit code by SMS · No app needed"}
        </p>
      </main>
    )
  } else if (claim.kind === 'looking') {
    body = <div className="umc-rem-loading"><span className="umc-spin" aria-hidden="true" />Finding your record…</div>
  } else if (claim.kind === 'confirm' || claim.kind === 'claiming') {
    const busy = claim.kind === 'claiming'
    body = (
      <main className="umc-rem-main">
        <h1 className="umc-rem-hdg">Is this you?</h1>
        <div className="umc-rem-card">
          <p className="umc-rem-card-label">We found your record</p>
          <p className="umc-rem-card-value umc-rem-card-name">{formatPatientName(claim.patientName)}</p>
          <p className="umc-rem-card-sub">
            {claim.doctorName ? `Set up by Dr ${claim.doctorName}` : 'Set up by your doctor'}
            {' · '}{formatIndianPhone(user.phoneNumber)}
          </p>
        </div>
        <p className="umc-rem-lead">Confirm, and this phone will get a reminder for every dose your doctor prescribed.</p>
        <button type="button" className="umc-btn primary full big" disabled={busy} onClick={handleClaim}>
          {busy ? <span className="umc-spin on-dark" aria-hidden="true" /> : <><Icon name="check" size={20} />Yes, that's me</>}
        </button>
        <button type="button" className="umc-btn ghost full" disabled={busy} onClick={handleDecline}>
          Not me — sign out
        </button>
      </main>
    )
  } else if (claim.kind === 'claimed') {
    body = (
      <main className="umc-rem-main umc-rem-dash">
        <h1 className="umc-rem-hdg">
          {morph.phase === 'inline' || morph.phase === 'morphing' ? (
            <>{claim.returning ? 'Welcome back' : "You're set up"}{claim.fullName ? ', ' : ''}<span ref={morph.nameRef} style={morph.phase === 'morphing' ? { visibility: 'hidden' } : undefined}>{formatPatientName(claim.fullName)}</span></>
          ) : 'Reminders'}
        </h1>
        {/* The number itself lives in Account details now (decision
            2026-09-19) — this screen doesn't need to repeat it. */}
        {push.kind === 'checking' || push.kind === 'registering' ? (
          <p className="umc-rem-lead">{push.kind === 'registering' ? 'Turning on reminders…' : 'Checking this phone…'}</p>
        ) : push.kind === 'enabled' && celebrating ? (
          <AllSetCard line="Reminders are on. This phone will ring when each dose is due." onFinished={() => setCelebrating(false)} />
        ) : push.kind === 'enabled' ? (
          // No banner (decision 2026-09-18): the green status light in the
          // header is the whole confirmation. This line is visually hidden
          // and only exists so a screen reader still announces the change,
          // since the light itself is aria-hidden.
          <p className="umc-sr-only" role="status">Reminders are on.</p>
        ) : push.kind === 'app-owns' ? (
          <div className={`umc-rem-setup-collapse${setupTucked ? ' is-tucked' : ''}`}>
            <div className="umc-rem-ok" role="status">
              <Icon name="checkCircle" size={22} />
              <span>Your reminders come from the UMC app on this phone, so this page won't send its own. You can still check and mark your medicines here.</span>
            </div>
          </div>
        ) : push.kind === 'prompt' && platform.os === 'android' ? (
          <>
            <p className="umc-rem-lead">Last step: let this phone ring for your medicines.</p>
            {reveal('ask', <NotifyPanel mode="ask" onAllow={handleAllow} onRecheck={() => {}} />)}
          </>
        ) : push.kind === 'denied' && platform.os === 'android' ? (
          reveal('blocked', <NotifyPanel mode="blocked" onAllow={() => {}} onRecheck={() => void recheck(true)} stillBlocked={push.stillBlocked} />)
        ) : push.kind === 'prompt' ? (
          <>
            <p className="umc-rem-lead">Last step: let this phone ring for your medicines. Tap below, then tap <strong>Allow</strong>.</p>
            <button type="button" className="umc-btn primary full big umc-install-ring" onClick={handleAllow}>
              <span className="umc-install-ring-bell" aria-hidden="true"><Glyph name="phone-vibrate" /></span>
              Enable Reminders
              <span className="umc-rem-btn-arrow"><Icon name="chevronRight" size={20} /></span>
            </button>
          </>
        ) : push.kind === 'denied' ? (
          <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />Notifications are blocked for this site. Allow them in your browser's site settings, then reopen this page.</p>
        ) : push.kind === 'gate' && push.gate === 'ios-add-to-home' ? (
          <>
            <p className="umc-rem-lead">
              {install === 'mac'
                ? 'On a Mac, reminders only work from the Dock app.'
                : `On ${install === 'ipad' ? 'an iPad' : 'an iPhone'}, reminders only work from the Home Screen app.`}
            </p>
            {install && <InstallPanel beforeSignIn={false} autoOpen={onApplePhone} os={install} browser={platform.browser} safariVersion={platform.safariVersion} />}
          </>
        ) : push.kind === 'gate' && push.gate === 'ios-too-old' ? (
          <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />Reminders need iOS 16.4 or newer. Update your iPhone in Settings → General → Software Update, then reopen this page.</p>
        ) : push.kind === 'gate' ? (
          <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />This browser can't show reminders. On Android open this page in Chrome; on iPhone/Mac add it to the Home Screen/Dock.</p>
        ) : (
          <>
            <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />{push.message}</p>
            <button type="button" className="umc-btn primary full" onClick={() => register(claim.groupId)}>Try again</button>
          </>
        )}
        <TodayDoses gid={claim.groupId} uid={user.uid} highlightLogId={highlightLogId} />
      </main>
    )
  } else {
    body = (
      <main className="umc-rem-main">
        <h1 className="umc-rem-hdg">Something went wrong</h1>
        <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />{claim.message}</p>
        <button type="button" className="umc-btn primary full" onClick={handleRetry}>Try again</button>
        <button type="button" className="umc-btn ghost full" onClick={handleSignOut}>Sign out</button>
      </main>
    )
  }

  return (
    <div className={`umc-rem-root${unregistered ? ' is-blurred' : ''}`}>
      <div className="umc-rem-brand">
        <img src="/member/app_logo.png" alt="" />
        <span>Unified Medical Care</span>
        {claim.kind === 'claimed' && (
          <div className="umc-rem-brand-right">
            {/* Live status, independent of the "Reminders are on" banner
                above (which collapses once it's been seen) — this stays up
                for as long as the claimed screen does, so the patient can
                glance at it later and know without reading anything.
                Steps aside (morph.peeking) when the peeked initial slides
                out from behind the avatar into this same spot, so the two
                are never on top of each other. */}
            {pushResolved && (
              <span
                className={`umc-rem-status ${settled ? 'is-on' : 'is-off'}${morph.peeking ? ' is-peeked' : ''}`}
                aria-hidden="true"
                title={settled ? 'Reminders are on' : 'Reminders are off'}
              >
                <Glyph name="phone-vibrate" />
              </span>
            )}
            <div className="umc-rem-corner" ref={morph.cornerRef}>
              {morph.phase === 'corner' && (
                <span className="umc-rem-corner-name">{nameInitial}</span>
              )}
              {morph.phase === 'avatar' && (
                <>
                  {/* Peeked: the full name, not the initial the resting
                      corner label uses — this is a deliberate look-up, so
                      it should say who it means, not make the patient
                      infer it from one letter. */}
                  <span className={`umc-rem-corner-name is-tuck${morph.peeking ? ' is-peek' : ''}`}>{formatPatientName(claim.fullName)}</span>
                  <button
                    type="button"
                    className="umc-rem-account-btn is-shown"
                    aria-label="Account details"
                    onClick={() => { morph.handleAvatarClick(); setAccountOpen(true) }}
                    onMouseEnter={morph.handlePointerEnter}
                    onMouseLeave={morph.handlePointerLeave}
                  >
                    <AccountAvatar photoUrl={profile?.profilePhotoUrl} name={claim.fullName} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {morph.overlay && (
        <span
          className={`umc-rem-morph-clone${morph.flying ? ' is-flying' : ''}`}
          aria-hidden="true"
          style={{
            top: morph.overlay.fromTop, left: morph.overlay.fromLeft,
            fontSize: morph.overlay.fontSize, fontFamily: morph.overlay.fontFamily, fontWeight: morph.overlay.fontWeight,
            color: morph.overlay.color,
            ['--dx' as string]: `${morph.overlay.dx}px`, ['--dy' as string]: `${morph.overlay.dy}px`, ['--s' as string]: morph.overlay.scale,
          }}
        >
          {morph.overlay.text}
        </span>
      )}

      {body}

      <div className="umc-rem-foot">
        <a href="/">unifiedmedicalcare.com</a>
      </div>

      {otpStep !== 'idle' && (
        <OtpModal
          key={otpStep}
          step={otpStep}
          onSendOtp={handleSendOtp}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      {unregistered && <UnregisteredOverlay nonPatient={unregistered === 'non-patient'} onDismiss={() => setUnregistered(null)} />}
      {user && claim.kind === 'claimed' && accountOpen && (
        <AccountSheet
          fullName={formatPatientName(claim.fullName)}
          phone={formatIndianPhone(user.phoneNumber)}
          doctorName={claim.doctorName}
          signingOut={signingOut}
          signOutError={signOutError}
          onSignOut={handleSignOut}
          onClose={() => setAccountOpen(false)}
        />
      )}
    </div>
  )
}
