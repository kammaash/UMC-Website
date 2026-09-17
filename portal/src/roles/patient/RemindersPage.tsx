// RemindersPage.tsx — https://unifiedmedicalcare.com/reminders/
//
// The ONE fixed address a doctor shows (QR) or sends (WhatsApp) to a patient
// they created in the app. It carries no group id and never will (decision
// 2026-09-16): the page signs the patient in with phone OTP and the backend
// finds their record by the OTP-proven number alone.
//
// Steps (this file grows piece by piece):
//   piece 2 — shell + phone OTP sign-in            ← here
//   piece 3 — previewGroupClaim → confirm → claimGroup, and the no-match branches
//   piece 4 — web push registration (+ iPhone Add-to-Home-Screen gate)
//   piece 5 — today's doses + "Taken"
//
// Not a member-portal page: no role guard, no users/{uid} requirement, no
// desktop-only redirect, and it must work with no App Check token at all.
import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { OtpModal } from '../../shared/auth/PhoneOtp'
import { phoneAuthMessage, otpAuthMessage } from '../../shared/auth/phoneAuthErrors'
import { sendOtp, confirmOtp, resetOtp, signOutReminders } from './data/reminderAuth'
import { formatIndianPhone } from './data/phoneFormat'
import './RemindersPage.css'

type OtpStep = 'idle' | 'phone' | 'otp'

export function RemindersPage() {
  const { status, user } = useAuth()
  const [otpStep, setOtpStep] = useState<OtpStep>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { document.title = 'UMC — Medicine reminders' }, [])

  const handleSendOtp = async (phone: string): Promise<string | null> => {
    try { await sendOtp(phone); setOtpStep('otp'); return null }
    catch (err) { console.error('Phone sign-in error:', err); return phoneAuthMessage(err) }
  }
  const handleConfirm = async (code: string): Promise<string | null> => {
    try { await confirmOtp(code); setOtpStep('idle'); return null }
    catch (err) { console.error('OTP confirm error:', err); return otpAuthMessage(err) }
  }
  const handleCancel = () => { resetOtp(); setOtpStep('idle') }
  const handleSignOut = async () => {
    setError(null)
    try { await signOutReminders() }
    catch (err) { console.error('Sign-out error:', err); setError("Couldn't sign out. Please try again.") }
  }

  return (
    <div className="umc-rem-root">
      <div className="umc-rem-brand">
        <img src="/member/app_logo.png" alt="" />
        <span>Unified Medical Care</span>
      </div>

      {status === 'unknown' ? (
        <div className="umc-rem-loading">Loading…</div>
      ) : status === 'signed-out' || !user ? (
        <main className="umc-rem-main">
          <h1 className="umc-rem-hdg">Your medicine reminders</h1>
          <p className="umc-rem-lead">
            Your doctor has set up your medicines here. Sign in with
            <strong> the phone number your doctor has</strong>, and this page will
            remind you when each dose is due.
          </p>
          {error && <p className="umc-rem-error" role="alert">{error}</p>}
          <button
            type="button"
            className="umc-rem-btn umc-rem-primary"
            onClick={() => { setError(null); setOtpStep('phone') }}
          >
            Continue with phone →
          </button>
          <p className="umc-rem-note">You'll get a 6-digit code by SMS · No app needed</p>
        </main>
      ) : (
        <main className="umc-rem-main">
          <h1 className="umc-rem-hdg">Signed in</h1>
          <div className="umc-rem-card">
            <p className="umc-rem-card-label">Your number</p>
            <p className="umc-rem-card-value">{formatIndianPhone(user.phoneNumber)}</p>
          </div>
          <p className="umc-rem-lead">Next, we'll look up the record your doctor created for this number.</p>
          {error && <p className="umc-rem-error" role="alert">{error}</p>}
          <button type="button" className="umc-rem-btn umc-rem-secondary" onClick={handleSignOut}>
            Not you? Sign out
          </button>
        </main>
      )}

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
