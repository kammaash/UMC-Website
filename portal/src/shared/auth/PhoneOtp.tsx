// PhoneOtp.tsx — the phone-number + 6-digit-code modal shared by the
// member-portal sign-in (LoginPage) and the patient reminders page. The
// Firebase error-to-message mappers are next door in phoneAuthErrors.ts.
// Extracted verbatim from LoginPage.tsx on 2026-09-17; behaviour unchanged.
//
// The caller owns the Firebase calls: onSendOtp receives the E.164 number
// (+91 + 10 digits) and returns an error message or null; onConfirm receives
// the 6-digit code and does the same. The modal keeps itself open on an error
// and lets the parent unmount it on success. It renders the hidden
// #umc-recaptcha container the caller's RecaptchaVerifier attaches to.
import {
  useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ClipboardEvent as ReactClipboardEvent,
} from 'react'
import './PhoneOtp.css'

export interface OtpModalProps {
  // Return a human-readable error message to show in the popup, or null on success.
  onConfirm: (code: string) => Promise<string | null>
  onCancel: () => void
  step: 'phone' | 'otp'
  onSendOtp: (phone: string) => Promise<string | null>
}

export function OtpModal({ onConfirm, onCancel, step, onSendOtp }: OtpModalProps) {
  const isPhone = step === 'phone'
  const [val, setVal] = useState('')                              // phone (10 digits)
  const [digits, setDigits] = useState(['', '', '', '', '', ''])  // otp (6 boxes)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const boxesRef = useRef<Array<HTMLInputElement | null>>([])

  const code = digits.join('')
  const ready = isPhone ? val.length === 10 : code.length === 6

  const submit = async () => {
    if (!ready || submitting) return
    setErr(null)
    setSubmitting(true)
    const msg = isPhone ? await onSendOtp('+91' + val) : await onConfirm(code)
    if (msg) {
      // Failure — keep the popup open, surface the reason, let them retry.
      setErr(msg)
      setSubmitting(false)
      if (!isPhone) { setDigits(['', '', '', '', '', '']); boxesRef.current[0]?.focus() }
    }
    // Success — the parent advances the step (or closes the modal), which unmounts
    // this instance; leave the spinner running through that transition.
  }

  const focusBox = (i: number) => boxesRef.current[Math.max(0, Math.min(5, i))]?.focus()
  const onBoxChange = (i: number, raw: string) => {
    setErr(null)
    const clean = raw.replace(/\D/g, '')
    const next = [...digits]
    if (!clean) { next[i] = ''; setDigits(next); return }
    let idx = i
    for (const ch of clean) { if (idx > 5) break; next[idx] = ch; idx++ }
    setDigits(next)
    focusBox(Math.min(idx, 5))
  }
  const onBoxKeyDown = (i: number, e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { submit(); return }
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = [...digits]
      if (next[i]) { next[i] = ''; setDigits(next) }
      else if (i > 0) { next[i - 1] = ''; setDigits(next); focusBox(i - 1) }
    } else if (e.key === 'ArrowLeft') { e.preventDefault(); focusBox(i - 1) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); focusBox(i + 1) }
  }
  const onBoxPaste = (e: ReactClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    const next = ['', '', '', '', '', '']
    for (let k = 0; k < text.length; k++) next[k] = text[k]
    setErr(null); setDigits(next)
    focusBox(Math.min(text.length, 5))
  }

  return (
    <div className="umc-otp-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="umc-otp-card">
        <h2 className="umc-otp-title">{isPhone ? 'Your number' : 'Check your phone'}</h2>
        <p className="umc-otp-desc">
          {isPhone ? 'Enter your Indian mobile number' : 'Enter the 6-digit code'}
        </p>

        {isPhone ? (
          <div className="umc-otp-field">
            <span className="umc-otp-prefix">+91</span>
            <input
              className="umc-otp-input umc-otp-input-bare"
              type="tel" inputMode="numeric"
              maxLength={10} autoFocus
              value={val}
              onChange={(e) => { setErr(null); setVal(e.target.value.replace(/\D/g, '').slice(0, 10)) }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            />
          </div>
        ) : (
          <div className="umc-otp-boxes">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { boxesRef.current[i] = el }}
                className={`umc-otp-box ${d ? 'is-filled' : ''}`}
                type="text" inputMode="numeric" autoComplete="one-time-code"
                maxLength={1} autoFocus={i === 0}
                value={d}
                onChange={(e) => onBoxChange(i, e.target.value)}
                onKeyDown={(e) => onBoxKeyDown(i, e)}
                onPaste={onBoxPaste}
                onFocus={(e) => e.target.select()}
              />
            ))}
          </div>
        )}

        {err && <div className="umc-otp-error" role="alert">{err}</div>}

        <div className="umc-otp-row">
          <button className="umc-otp-btn umc-otp-cancel" onClick={onCancel}>Cancel</button>
          <button
            className={`umc-otp-btn umc-otp-submit${submitting ? ' is-loading' : ''}`}
            disabled={!ready || submitting}
            onClick={submit}
          >
            {submitting
              ? <span className="umc-spinner" aria-hidden="true" />
              : (isPhone ? 'Send code →' : 'Verify →')}
          </button>
        </div>
      </div>
      <div id="umc-recaptcha" />
    </div>
  )
}
