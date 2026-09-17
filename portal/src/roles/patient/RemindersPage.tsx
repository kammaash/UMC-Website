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
//   piece 4 — web push registration (+ iPhone Add-to-Home-Screen gate)              ← here
//   piece 5 — today's doses + "Taken"
//
// Not a member-portal page: no role guard, no users/{uid} requirement, no
// desktop-only redirect, and it must work with no App Check token at all.
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { OtpModal } from '../../shared/auth/PhoneOtp'
import { phoneAuthMessage, otpAuthMessage } from '../../shared/auth/phoneAuthErrors'
import { sendOtp, confirmOtp, resetOtp, signOutReminders } from './data/reminderAuth'
import { previewClaim, claimGroup, usersDocExists, deleteOrphanAccount, signOutExisting } from './data/reminderClaim'
import { decideAfterPreview, decideNoMatch, claimErrorMessage } from './data/claimDecision'
import {
  currentPlatform, pushSupported, permissionState, requestPermission,
  registerPushToken, listenForeground, installPwaHead, PushSetupError,
} from './data/reminderPush'
import type { Platform } from './data/platformGate'
import { formatIndianPhone } from './data/phoneFormat'
import './RemindersPage.css'

type OtpStep = 'idle' | 'phone' | 'otp'

// What the signed-in half of the page is doing.
type ClaimState =
  | { kind: 'looking' }
  | { kind: 'confirm'; groupId: string; patientName: string; doctorName: string }
  | { kind: 'claiming'; groupId: string; patientName: string; doctorName: string }
  | { kind: 'claimed'; groupId: string; fullName: string }
  | { kind: 'error'; message: string }

const NO_RECORD_MSG = (phone: string) =>
  `We couldn't find a record for ${phone}. Ask your doctor to check the number they saved for you, then try again.`
const EXISTING_ACCOUNT_MSG =
  'This number already has a UMC account. Open the UMC app — your reminders are there.'
const OTHER_ACCOUNT_MSG =
  'This record is already set up on another account. Ask your doctor to check.'

// The push half of the "claimed" screen.
type PushState =
  | { kind: 'checking' }
  | { kind: 'gate'; gate: 'ios-add-to-home' | 'ios-too-old' | 'unsupported' }
  | { kind: 'prompt' }        // permission not asked yet → "Allow reminders" button (needs a tap)
  | { kind: 'denied' }        // permission refused in the browser
  | { kind: 'registering' }
  | { kind: 'enabled' }
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

// iPhone: web push only works from a Home Screen web app, and that app has
// its own sign-in, so the steps come BEFORE sign-in on the welcome screen.
function AddToHomeSteps({ beforeSignIn }: { beforeSignIn: boolean }) {
  return (
    <div className="umc-rem-card">
      <p className="umc-rem-card-label">iPhone · one-time setup</p>
      <ol className="umc-rem-steps">
        <li><span>1</span><span>Tap the <strong>Share</strong> button at the bottom of Safari (the square with an arrow).</span></li>
        <li><span>2</span><span>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</span></li>
        <li><span>3</span><span>Open <strong>UMC Reminders</strong> from your Home Screen{beforeSignIn ? ' and sign in there' : ''}.</span></li>
      </ol>
    </div>
  )
}

export function RemindersPage() {
  const { status, user, profile } = useAuth()
  const [otpStep, setOtpStep] = useState<OtpStep>('idle')
  // Shown on the welcome screen after a sign-out we initiated (no record /
  // existing account) or a failed sign-out.
  const [notice, setNotice] = useState<string | null>(null)
  const [claim, setClaim] = useState<ClaimState>({ kind: 'looking' })
  // The lookup runs once per signed-in uid (StrictMode re-runs effects; the
  // orphan deletion must not).
  const lookedUpFor = useRef<string | null>(null)
  // Bumped by "Try again" so the lookup effect runs once more for the same uid.
  const [retryKey, setRetryKey] = useState(0)
  const [platform] = useState<Platform>(() => currentPlatform())
  const [push, setPush] = useState<PushState>({ kind: 'checking' })

  useEffect(() => { document.title = 'UMC — Medicine reminders'; installPwaHead() }, [])

  // ── the lookup: runs as soon as a session exists ─────────────────────────
  useEffect(() => {
    if (status !== 'signed-in' || !user) { lookedUpFor.current = null; return }
    if (lookedUpFor.current === user.uid) return
    lookedUpFor.current = user.uid
    const uid = user.uid
    const phone = formatIndianPhone(user.phoneNumber)
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
        case 'already-claimed':
          setClaim({ kind: 'claimed', groupId: verdict.groupId, fullName: profile?.fullName || '' })
          return
        case 'confirm':
          setClaim({ kind: 'confirm', groupId: verdict.groupId, patientName: verdict.patientName, doctorName: verdict.doctorName })
          return
        case 'other-account':
          setNotice(OTHER_ACCOUNT_MSG)
          await signOutExisting().catch((e) => console.error('sign-out failed:', e))
          return
        case 'no-match': {
          // Decide BEFORE touching the account: delete only a fresh orphan.
          let exists = true // fail-safe: an unreadable users doc is treated as existing → sign-out, never delete
          try { exists = await usersDocExists(uid) } catch (e) { console.error('users doc read failed:', e) }
          if (decideNoMatch(exists) === 'delete-orphan') {
            setNotice(NO_RECORD_MSG(phone))
            await deleteOrphanAccount().catch((e) => console.error('orphan delete failed:', e))
          } else {
            setNotice(EXISTING_ACCOUNT_MSG)
            await signOutExisting().catch((e) => console.error('sign-out failed:', e))
          }
          return
        }
      }
    })()
    return () => { cancelled = true }
    // profile is settled by the time status is 'signed-in' (AuthContext loads
    // it before flipping status), so it is read, not depended on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user, retryKey])

  // ── push: once claimed, find out where this browser stands ──────────────
  const claimedGid = claim.kind === 'claimed' ? claim.groupId : null
  const register = async (gid: string) => {
    setPush({ kind: 'registering' })
    try { await registerPushToken(gid, platform.tokenPlatform); setPush({ kind: 'enabled' }) }
    catch (err) { console.error('push registration failed:', err); setPush({ kind: 'error', message: pushErrorMessage(err) }) }
  }
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!claimedGid) { setPush({ kind: 'checking' }); return }
      if (platform.gate !== 'ok') { setPush({ kind: 'gate', gate: platform.gate }); return }
      if (!(await pushSupported())) { if (!cancelled) setPush({ kind: 'gate', gate: 'unsupported' }); return }
      const perm = permissionState()
      if (cancelled) return
      if (perm === 'granted') await register(claimedGid)   // silent refresh on every open (lastSeenAt)
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
      setClaim({ kind: 'claimed', groupId: res.groupId, fullName: res.fullName })
    } catch (err) {
      console.error('claimGroup failed:', err)
      setClaim({ kind: 'error', message: claimErrorMessage(err) })
    }
  }
  const handleRetry = () => { lookedUpFor.current = null; setNotice(null); setRetryKey((k) => k + 1) }

  const handleSignOut = async () => {
    setNotice(null)
    try { await signOutReminders() }
    catch (err) { console.error('Sign-out error:', err); setNotice("Couldn't sign out. Please try again.") }
  }

  // ── render ───────────────────────────────────────────────────────────────
  let body
  if (status === 'unknown') {
    body = <div className="umc-rem-loading">Loading…</div>
  } else if (status === 'signed-out' || !user) {
    body = (
      <main className="umc-rem-main">
        <h1 className="umc-rem-hdg">Your medicine reminders</h1>
        <p className="umc-rem-lead">
          Your doctor has set up your medicines here. Sign in with
          <strong> the phone number your doctor has</strong>, and this page will
          remind you when each dose is due.
        </p>
        {notice && <p className="umc-rem-error" role="alert">{notice}</p>}
        {platform.gate === 'ios-add-to-home' && <AddToHomeSteps beforeSignIn />}
        {platform.gate === 'ios-too-old' && (
          <p className="umc-rem-error" role="alert">Reminders need iOS 16.4 or newer. Update your iPhone in Settings → General → Software Update, then come back.</p>
        )}
        <button
          type="button"
          className="umc-rem-btn umc-rem-primary"
          onClick={() => { setNotice(null); setOtpStep('phone') }}
        >
          Continue with phone →
        </button>
        <p className="umc-rem-note">
          {platform.gate === 'ios-add-to-home'
            ? 'Sign in from the Home Screen app · 6-digit code by SMS'
            : "You'll get a 6-digit code by SMS · No app needed"}
        </p>
      </main>
    )
  } else if (claim.kind === 'looking') {
    body = <div className="umc-rem-loading">Finding your record…</div>
  } else if (claim.kind === 'confirm' || claim.kind === 'claiming') {
    const busy = claim.kind === 'claiming'
    body = (
      <main className="umc-rem-main">
        <h1 className="umc-rem-hdg">Is this you?</h1>
        <div className="umc-rem-card">
          <p className="umc-rem-card-label">We found your record</p>
          <p className="umc-rem-card-value umc-rem-card-name">{claim.patientName}</p>
          <p className="umc-rem-card-sub">
            {claim.doctorName ? `Set up by Dr ${claim.doctorName}` : 'Set up by your doctor'}
            {' · '}{formatIndianPhone(user.phoneNumber)}
          </p>
        </div>
        <p className="umc-rem-lead">Confirm, and this phone will get a reminder for every dose your doctor prescribed.</p>
        <button type="button" className="umc-rem-btn umc-rem-primary" disabled={busy} onClick={handleClaim}>
          {busy ? <span className="umc-rem-spinner" aria-hidden="true" /> : "Yes, that's me →"}
        </button>
        <button type="button" className="umc-rem-btn umc-rem-secondary" disabled={busy} onClick={handleSignOut}>
          Not me — sign out
        </button>
      </main>
    )
  } else if (claim.kind === 'claimed') {
    const first = (claim.fullName || '').trim().split(/\s+/)[0]
    body = (
      <main className="umc-rem-main">
        <h1 className="umc-rem-hdg">{first ? `You're set up, ${first}` : "You're set up"}</h1>
        <div className="umc-rem-card">
          <p className="umc-rem-card-label">Your number</p>
          <p className="umc-rem-card-value">{formatIndianPhone(user.phoneNumber)}</p>
        </div>
        {push.kind === 'checking' || push.kind === 'registering' ? (
          <p className="umc-rem-lead">{push.kind === 'registering' ? 'Turning on reminders…' : 'Checking this phone…'}</p>
        ) : push.kind === 'enabled' ? (
          <div className="umc-rem-ok" role="status">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>
            <span>Reminders are on. This phone will get a notification for every dose your doctor prescribed.</span>
          </div>
        ) : push.kind === 'prompt' ? (
          <>
            <p className="umc-rem-lead">Last step: allow this phone to show reminders. Tap the button, then tap <strong>Allow</strong>.</p>
            <button type="button" className="umc-rem-btn umc-rem-primary" onClick={handleAllow}>Allow reminders →</button>
          </>
        ) : push.kind === 'denied' ? (
          <p className="umc-rem-error" role="alert">Notifications are blocked for this site. Allow them in your browser's site settings, then reopen this page.</p>
        ) : push.kind === 'gate' && push.gate === 'ios-add-to-home' ? (
          <>
            <p className="umc-rem-lead">On iPhone, reminders only work from the Home Screen app.</p>
            <AddToHomeSteps beforeSignIn={false} />
          </>
        ) : push.kind === 'gate' && push.gate === 'ios-too-old' ? (
          <p className="umc-rem-error" role="alert">Reminders need iOS 16.4 or newer. Update your iPhone in Settings → General → Software Update, then reopen this page.</p>
        ) : push.kind === 'gate' ? (
          <p className="umc-rem-error" role="alert">This browser can't show reminders. On Android open this page in Chrome; on iPhone add it to the Home Screen.</p>
        ) : (
          <>
            <p className="umc-rem-error" role="alert">{push.message}</p>
            <button type="button" className="umc-rem-btn umc-rem-primary" onClick={() => register(claim.groupId)}>Try again →</button>
          </>
        )}
        <button type="button" className="umc-rem-btn umc-rem-secondary" onClick={handleSignOut}>
          Not you? Sign out
        </button>
      </main>
    )
  } else {
    body = (
      <main className="umc-rem-main">
        <h1 className="umc-rem-hdg">Something went wrong</h1>
        <p className="umc-rem-error" role="alert">{claim.message}</p>
        <button type="button" className="umc-rem-btn umc-rem-primary" onClick={handleRetry}>Try again →</button>
        <button type="button" className="umc-rem-btn umc-rem-secondary" onClick={handleSignOut}>Sign out</button>
      </main>
    )
  }

  return (
    <div className="umc-rem-root">
      <div className="umc-rem-brand">
        <img src="/member/app_logo.png" alt="" />
        <span>Unified Medical Care</span>
      </div>

      {body}

      <div className="umc-rem-foot">
        <a href="/">unifiedmedicalcare.com</a>
      </div>

      {otpStep !== 'idle' && (
        <OtpModal
          step={otpStep}
          onSendOtp={handleSendOtp}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
