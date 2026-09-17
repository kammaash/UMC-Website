// RemindersPage.tsx — https://unifiedmedicalcare.com/reminders/
//
// The ONE fixed address a doctor shows (QR) or sends (WhatsApp) to a patient
// they created in the app. It carries no group id and never will (decision
// 2026-09-16): the page signs the patient in with phone OTP and the backend
// finds their record by the OTP-proven number alone.
//
// Steps (this file grows piece by piece):
//   piece 2 — shell + phone OTP sign-in
//   piece 3 — previewGroupClaim → confirm → claimGroup, and the no-match branches   ← here
//   piece 4 — web push registration (+ iPhone Add-to-Home-Screen gate)
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

  useEffect(() => { document.title = 'UMC — Medicine reminders' }, [])

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
        <button
          type="button"
          className="umc-rem-btn umc-rem-primary"
          onClick={() => { setNotice(null); setOtpStep('phone') }}
        >
          Continue with phone →
        </button>
        <p className="umc-rem-note">You'll get a 6-digit code by SMS · No app needed</p>
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
        <p className="umc-rem-lead">Next, this phone needs permission to show reminders. That step comes next.</p>
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
