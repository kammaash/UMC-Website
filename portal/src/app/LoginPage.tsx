import {
  useEffect, useRef, useCallback, useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ClipboardEvent as ReactClipboardEvent,
} from 'react'
import { useLocation } from 'react-router-dom'
import { RecaptchaVerifier } from 'firebase/auth'
import { auth } from '../shared/lib/firebase'
import { useAuth } from '../shared/auth/AuthContext'

/* ─── inline styles ─────────────────────────────────────────────────────── */
const css = `
  .umc-login-root {
    --serif:      'DM Serif Text', 'DM Serif Display', Georgia, serif;
    --sans:       'Inter', system-ui, sans-serif;
    --mono:       'JetBrains Mono', ui-monospace, monospace;
    --ease-out:   cubic-bezier(0.16, 1, 0.3, 1);
    --bg:         #0b0b0b;
    --fg:         #f3f3f3;
    --fg-soft:    rgba(243,243,243,0.45);
    --fg-faint:   rgba(243,243,243,0.18);
    --surface:    #161618;
    --surface-hi: #1d1d21;

    font-family: var(--sans);
    background: var(--bg);
    color: var(--fg);
    -webkit-font-smoothing: antialiased;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 40px 24px;
    position: relative;
  }

  /* grain overlay */
  .umc-login-root::after {
    content: "";
    position: fixed; inset: 0; z-index: 9000; pointer-events: none; opacity: 0.045;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    mix-blend-mode: overlay;
  }

  /* back link */
  .umc-login-back {
    position: fixed; top: clamp(20px,4vh,34px); left: clamp(20px,4vw,40px);
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.28em;
    text-transform: uppercase; color: var(--fg-soft); text-decoration: none;
    display: flex; align-items: center; gap: 8px;
    opacity: 0; animation: umc-fadeUp 0.7s var(--ease-out) 0.4s forwards;
    transition: color 0.25s ease;
    background: none; border: none; cursor: pointer; padding: 0;
    z-index: 10;
  }
  .umc-login-back:hover { color: var(--fg); }
  .umc-login-back-arr {
    font-size: 13px; display: inline-block;
    transition: transform 0.25s var(--ease-out);
  }
  .umc-login-back:hover .umc-login-back-arr { transform: translateX(-3px); }

  /* panel */
  .umc-login-panel {
    width: 100%; max-width: 400px;
    display: flex; flex-direction: column; align-items: center;
    opacity: 0; animation: umc-fadeUp 0.85s var(--ease-out) 0.15s forwards;
  }

  /* logo */
  .umc-login-mark { width: 58px; height: 58px; margin-bottom: 32px; }
  .umc-login-mark img {
    width: 100%; height: 100%; object-fit: contain;
    filter: invert(1); opacity: 0.9;
  }

  /* heading */
  .umc-login-hdg {
    font-family: var(--serif); font-style: normal; font-weight: 400;
    font-size: clamp(36px, 6vw, 52px); letter-spacing: -0.02em;
    color: var(--fg); text-align: center; line-height: 1.1;
    margin: 0 0 10px;
  }
  .umc-login-sub {
    font-family: var(--mono); font-size: 10.5px; font-weight: 600;
    letter-spacing: 0.26em; text-transform: uppercase;
    color: var(--fg-soft); text-align: center; margin: 0 0 56px;
  }

  /* inline error / warning (e.g. wrong-role) */
  .umc-login-error {
    width: 100%; max-width: 400px;
    display: flex; align-items: flex-start; gap: 9px;
    margin: -28px 0 28px; padding: 12px 14px;
    border-radius: 12px;
    background: rgba(255,69,58,0.09);
    border: 1px solid rgba(255,69,58,0.38);
    color: #ff6b60;
    font-family: var(--mono); font-size: 10.5px; font-weight: 600;
    letter-spacing: 0.04em; line-height: 1.55; text-transform: uppercase;
  }
  .umc-login-error::before {
    content: "!"; flex-shrink: 0;
    width: 15px; height: 15px; margin-top: 1px;
    display: grid; place-items: center;
    border-radius: 50%; border: 1.4px solid currentColor;
    font-size: 10px; line-height: 1;
  }

  /* auth buttons */
  .umc-login-btns { width: 100%; display: flex; flex-direction: column; gap: 14px; }

  .umc-auth-btn {
    width: 100%;
    background: var(--surface);
    border: 1px solid rgba(230,230,230,0.08);
    border-radius: 18px;
    cursor: pointer;
    font-family: var(--sans); font-size: 15px; font-weight: 600;
    color: var(--fg);
    padding: 20px 26px;
    display: flex; align-items: center; gap: 14px;
    position: relative; overflow: hidden;
    transition:
      transform     0.38s var(--ease-out),
      box-shadow    0.38s var(--ease-out),
      border-color  0.28s ease,
      background    0.32s ease,
      color         0.28s ease;
  }
  .umc-auth-btn-arr {
    margin-left: auto; font-size: 15px;
    color: var(--fg-faint); opacity: 0; transform: translateX(-8px);
    transition: opacity 0.3s ease, transform 0.38s var(--ease-out), color 0.3s ease;
  }
  .umc-auth-btn:hover .umc-auth-btn-arr { opacity: 1; transform: translateX(0); }
  .umc-auth-btn:hover {
    transform: translateY(-4px);
    background: var(--surface-hi);
    border-color: rgba(230,230,230,0.14);
  }
  .umc-auth-btn:active {
    transform: translateY(1px) scale(0.997);
    transition-duration: 0.1s;
    box-shadow: none !important;
  }

  /* Google hover */
  .umc-auth-btn.umc-google:hover {
    border-color: rgba(66,133,244,0.45);
    box-shadow: 0 24px 56px rgba(0,0,0,0.65), 0 0 0 1px rgba(66,133,244,0.18), inset 0 1px 0 rgba(66,133,244,0.06);
  }
  .umc-auth-btn.umc-google:hover .umc-auth-btn-arr { color: #4285F4; }

  /* Phone hover */
  .umc-auth-btn.umc-phone:hover {
    border-color: rgba(52,199,89,0.45);
    box-shadow: 0 24px 56px rgba(0,0,0,0.65), 0 0 0 1px rgba(52,199,89,0.18), inset 0 1px 0 rgba(52,199,89,0.06);
  }
  .umc-auth-btn.umc-phone:hover .umc-auth-btn-arr { color: #34C759; }

  /* Apple hover */
  .umc-auth-btn.umc-apple:hover {
    border-color: rgba(255,255,255,0.22);
    box-shadow: 0 24px 56px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.06);
  }
  .umc-auth-btn.umc-apple:hover .umc-auth-btn-arr { color: var(--fg-soft); }

  /* icon */
  .umc-auth-icon {
    width: 22px; height: 22px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: color 0.28s ease;
  }
  .umc-auth-icon svg { width: 100%; height: 100%; }
  .umc-auth-btn.umc-phone .umc-auth-icon { color: rgba(52,199,89,0.85); }

  .umc-auth-label { flex: 1; text-align: left; transition: color 0.28s ease; }

  /* clicked states */
  .umc-auth-btn.umc-clicked { pointer-events: none; }
  .umc-auth-btn.umc-google.umc-clicked {
    background: #ffffff; color: #1a1a1a;
    border-color: rgba(0,0,0,0.09); transform: scale(0.984);
    box-shadow: 0 4px 20px rgba(0,0,0,0.14);
  }
  .umc-auth-btn.umc-google.umc-clicked .umc-auth-btn-arr {
    color: rgba(26,26,26,0.4); opacity: 1; transform: translateX(0);
  }
  .umc-auth-btn.umc-phone.umc-clicked {
    background: #34C759; color: #04280e;
    border-color: rgba(0,0,0,0.1); transform: scale(0.984);
    box-shadow: 0 4px 28px rgba(52,199,89,0.45);
  }
  .umc-auth-btn.umc-phone.umc-clicked .umc-auth-icon { color: #04280e; }
  .umc-auth-btn.umc-phone.umc-clicked .umc-auth-btn-arr {
    color: #04280e; opacity: 1; transform: translateX(0);
  }
  .umc-auth-btn.umc-apple.umc-clicked {
    background: #000000; color: #f3f3f3;
    border-color: rgba(255,255,255,0.2); transform: scale(0.984);
    box-shadow: 0 4px 28px rgba(0,0,0,0.7);
  }
  .umc-auth-btn.umc-apple.umc-clicked .umc-auth-btn-arr {
    color: rgba(243,243,243,0.45); opacity: 1; transform: translateX(0);
  }

  /* ripple */
  .umc-auth-btn .umc-ripple {
    position: absolute; border-radius: 50%; pointer-events: none;
    transform: scale(0); opacity: 1;
    animation: umc-ripple-out 0.6s var(--ease-out) forwards;
  }
  @keyframes umc-ripple-out { to { transform: scale(1); opacity: 0; } }

  /* footer */
  .umc-login-foot {
    margin-top: 52px;
    font-family: var(--mono); font-size: 9.5px; font-weight: 600;
    letter-spacing: 0.2em; text-transform: uppercase;
    color: var(--fg-faint); text-align: center; line-height: 2.2;
  }
  .umc-login-foot a {
    color: var(--fg-soft); text-decoration: none; transition: color 0.2s ease;
  }
  .umc-login-foot a:hover { color: var(--fg); }

  /* phone OTP overlay */
  .umc-otp-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(11,11,11,0.92); backdrop-filter: blur(12px);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    opacity: 0; animation: umc-fadeUp 0.4s var(--ease-out) forwards;
  }
  .umc-otp-card {
    width: 100%; max-width: 360px;
    background: #161618; border: 1px solid rgba(230,230,230,0.1);
    border-radius: 20px; padding: 36px 32px;
    display: flex; flex-direction: column; gap: 20px;
  }
  .umc-otp-title {
    font-family: var(--serif); font-style: normal; font-size: 28px;
    font-weight: 400; color: #fff; letter-spacing: -0.02em; margin: 0;
  }
  .umc-otp-desc {
    font-family: var(--mono); font-size: 10px; font-weight: 600;
    letter-spacing: 0.22em; text-transform: uppercase;
    color: var(--fg-soft); margin: -8px 0 0;
  }
  .umc-otp-input {
    background: #0b0b0b; border: 1px solid rgba(230,230,230,0.12);
    border-radius: 12px; padding: 16px 18px;
    font-family: var(--mono); font-size: 15px; font-weight: 600;
    color: #fff; letter-spacing: 0.06em; width: 100%;
    transition: border-color 0.25s ease;
    outline: none;
  }
  .umc-otp-input:focus { border-color: rgba(52,199,89,0.5); }
  .umc-otp-input::placeholder { color: var(--fg-faint); }

  /* phone field with fixed +91 prefix */
  .umc-otp-field {
    display: flex; align-items: stretch;
    background: #0b0b0b; border: 1px solid rgba(230,230,230,0.12);
    border-radius: 12px; overflow: hidden;
    transition: border-color 0.25s ease;
  }
  .umc-otp-field:focus-within { border-color: rgba(52,199,89,0.5); }
  .umc-otp-prefix {
    display: flex; align-items: center; padding: 0 14px;
    font-family: var(--mono); font-size: 15px; font-weight: 600;
    color: var(--fg-soft); background: rgba(255,255,255,0.03);
    border-right: 1px solid rgba(230,230,230,0.12);
    user-select: none; pointer-events: none;
  }
  .umc-otp-input-bare {
    background: transparent !important; border: none !important;
    border-radius: 0; flex: 1; min-width: 0;
  }

  .umc-otp-row { display: flex; gap: 10px; }
  .umc-otp-btn {
    flex: 1; padding: 16px; border-radius: 12px; border: none;
    font-family: var(--sans); font-size: 14px; font-weight: 600;
    cursor: pointer; transition: opacity 0.2s ease, transform 0.2s ease;
  }
  .umc-otp-btn:hover { opacity: 0.85; transform: translateY(-1px); }
  .umc-otp-btn:disabled { opacity: 0.38; cursor: not-allowed; }
  .umc-otp-btn:disabled:hover { opacity: 0.38; transform: none; }
  .umc-otp-submit { background: #34C759; color: #04280e; }
  .umc-otp-cancel {
    background: transparent; color: var(--fg-soft);
    border: 1px solid rgba(230,230,230,0.1) !important;
    transition: opacity 0.2s ease, transform 0.2s ease, color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  }
  .umc-otp-cancel:hover {
    opacity: 1; color: #fff;
    background: rgba(255,255,255,0.06);
    border-color: rgba(230,230,230,0.24) !important;
  }

  /* 6-box OTP input — single digit per box, centred */
  .umc-otp-boxes { display: flex; gap: 8px; justify-content: center; }
  .umc-otp-box {
    width: 40px; height: 50px; padding: 0; text-align: center;
    background: #0b0b0b; border: 1px solid rgba(230,230,230,0.12);
    border-radius: 12px;
    font-family: var(--mono); font-size: 20px; font-weight: 600;
    color: #fff; caret-color: #34C759;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    outline: none;
  }
  .umc-otp-box.is-filled { border-color: rgba(52,199,89,0.35); }
  .umc-otp-box:focus {
    border-color: rgba(52,199,89,0.6);
    box-shadow: 0 0 0 3px rgba(52,199,89,0.14);
  }

  /* in-popup error message (matches the marketing-site error tone) */
  .umc-otp-error {
    font-family: var(--mono); font-size: 10px; font-weight: 600;
    letter-spacing: 0.04em; line-height: 1.5; text-transform: uppercase;
    text-align: center; color: #ff6b60;
    background: rgba(255,69,58,0.09);
    border: 1px solid rgba(255,69,58,0.34);
    border-radius: 10px; padding: 11px 12px; margin: -4px 0 0;
  }

  /* loading spinner inside the submit button — stay bright while spinning */
  .umc-otp-submit.is-loading,
  .umc-otp-submit.is-loading:hover {
    opacity: 1 !important; transform: none !important; cursor: default;
  }
  .umc-spinner {
    display: inline-block; width: 16px; height: 16px;
    border: 2px solid rgba(4,40,14,0.3); border-top-color: #04280e;
    border-radius: 50%; animation: umc-spin 0.6s linear infinite;
    vertical-align: middle;
  }
  @keyframes umc-spin { to { transform: rotate(360deg); } }

  #umc-recaptcha { display: none; }

  /* custom cursor */
  .umc-login-root * { cursor: none !important; }
  .umc-cursor {
    position: fixed; top: 0; left: 0;
    background: transparent;
    border: 1.5px solid rgba(255,255,255,0.75);
    mix-blend-mode: difference; pointer-events: none;
    z-index: 99999; border-radius: 999px;
    will-change: transform, width, height, border-radius;
    transition: background 0.22s ease, border-color 0.22s ease;
  }
  .umc-cursor.is-active { background: #fff; border-color: #fff; }
  /* hidden for the whole login-success animation */
  .umc-cursor.is-hidden { display: none; }
  @media (pointer: coarse) {
    .umc-login-root * { cursor: auto !important; }
    .umc-cursor { display: none; }
  }

  @keyframes umc-fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── login success (green) overlay ─────────────────────────────────────── */
  /* Rendered OUTSIDE .umc-login-root, so it can't inherit the root's CSS vars —
     easing + fonts are inlined here. Ports the phone app's green Hero-flight +
     icon→checkmark success animation (lib/Widgets/navigation_animations.dart). */
  .umc-success-panel {
    position: fixed; z-index: 9500;
    background: #22C55E; overflow: hidden;
    cursor: none;
    display: grid; place-items: center;
    box-shadow: 0 18px 44px rgba(34,197,94,0.30);
    will-change: top, left, width, height, border-radius;
    transition:
      top           0.75s cubic-bezier(0.16,1,0.3,1),
      left          0.75s cubic-bezier(0.16,1,0.3,1),
      width         0.75s cubic-bezier(0.16,1,0.3,1),
      height        0.75s cubic-bezier(0.16,1,0.3,1),
      border-radius 0.75s cubic-bezier(0.16,1,0.3,1);
  }
  /* fallback when there's no originating button rect: fade + scale in */
  .umc-success-panel.is-fade {
    inset: 0; border-radius: 0;
    opacity: 0; transform: scale(0.92);
    transition: opacity 0.5s ease, transform 0.6s cubic-bezier(0.16,1,0.3,1);
  }
  .umc-success-panel.is-fade.is-expanded { opacity: 1; transform: scale(1); }

  /* radial highlight, top-center */
  .umc-success-glow {
    position: absolute; inset: 0; z-index: 1; pointer-events: none;
    background: radial-gradient(120% 90% at 50% -8%,
      rgba(255,255,255,0.24), rgba(255,255,255,0.06) 42%, transparent 72%);
  }

  /* shimmer sweep */
  .umc-success-shimmer {
    position: absolute; top: -20%; left: 0; width: 170px; height: 140%;
    z-index: 1; pointer-events: none; opacity: 0;
    background: linear-gradient(90deg,
      rgba(255,255,255,0) 0%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0) 100%);
    transform: rotate(-20deg) translateX(-180%);
  }
  .umc-success-shimmer.is-on {
    animation: umc-success-shimmer 0.85s cubic-bezier(0.16,1,0.3,1) forwards;
  }
  @keyframes umc-success-shimmer {
    0%   { opacity: 0; transform: rotate(-20deg) translateX(-180%); }
    18%  { opacity: 1; }
    82%  { opacity: 1; }
    100% { opacity: 0; transform: rotate(-20deg) translateX(680%); }
  }

  /* checkmark — fades in with an elastic overshoot, then a glow pulse */
  .umc-success-check {
    grid-area: 1 / 1; z-index: 3;
    width: 112px; height: 112px; border-radius: 50%;
    display: grid; place-items: center;
    background: rgba(255,255,255,0.15);
    border: 1.2px solid rgba(255,255,255,0.30);
    box-shadow: 0 0 30px 2px rgba(255,255,255,0.12);
    opacity: 0; transform: scale(0.78);
  }
  .umc-success-check svg { width: 58px; height: 58px; color: #fff; }
  .umc-success-check.is-in {
    animation:
      umc-success-check-in    0.5s  cubic-bezier(0.34,1.56,0.64,1) forwards,
      umc-success-check-pulse 1.15s ease-in-out 0.42s;
  }
  @keyframes umc-success-check-in {
    from { opacity: 0; transform: scale(0.78); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes umc-success-check-pulse {
    0%,100% { box-shadow: 0 0 30px 2px rgba(255,255,255,0.12); }
    50%     { box-shadow: 0 0 48px 7px rgba(255,255,255,0.22); }
  }

  @media (prefers-reduced-motion: reduce) {
    .umc-login-back, .umc-login-panel { animation: none; opacity: 1; }
    .umc-success-panel { transition: none; }
    .umc-success-shimmer.is-on { animation: none; opacity: 0; }
    .umc-success-check.is-in { animation: none; opacity: 1; transform: scale(1); }
  }
`

/* ─── phone OTP modal ────────────────────────────────────────────────────── */
// Maps a Firebase auth error to a short, human-readable reason shown inside the
// phone popup. Falls back to a generic line for anything unmapped.
function firebaseErrCode(err: unknown): string {
  return err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : ''
}
function phoneAuthMessage(err: unknown): string {
  switch (firebaseErrCode(err)) {
    case 'auth/invalid-phone-number':
    case 'auth/missing-phone-number':  return 'That phone number looks invalid. Check it and try again.'
    case 'auth/too-many-requests':     return 'Too many attempts. Please wait a bit, then try again.'
    case 'auth/quota-exceeded':        return 'SMS limit reached. Please try again later.'
    case 'auth/captcha-check-failed':
    case 'auth/invalid-app-credential': return 'Verification failed. Please try again.'
    case 'auth/unauthorized-domain':   return 'This site isn’t authorized for phone sign-in.'
    default:                           return 'We couldn’t send a code to that number. Check it and try again.'
  }
}
function otpAuthMessage(err: unknown): string {
  switch (firebaseErrCode(err)) {
    case 'auth/invalid-verification-code': return 'That code isn’t right. Please re-enter it.'
    case 'auth/code-expired':              return 'That code expired. Request a new one.'
    case 'auth/missing-verification-code': return 'Please enter the 6-digit code.'
    default:                               return 'We couldn’t verify that code. Please try again.'
  }
}

interface OtpModalProps {
  // Return a human-readable error message to show in the popup, or null on success.
  onConfirm: (code: string) => Promise<string | null>
  onCancel: () => void
  step: 'phone' | 'otp'
  onSendOtp: (phone: string) => Promise<string | null>
}

function OtpModal({ onConfirm, onCancel, step, onSendOtp }: OtpModalProps) {
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

/* ─── login success animation ────────────────────────────────────────────── */
/**
 * Fullscreen green success animation: a FLIP morph expands the tapped button
 * into a fullscreen green panel, then an elastic checkmark fades in
 * (shimmer + glow) before it hard-navigates to /member/.
 * Mirrors the phone app's LoginSuccessPage Hero flight.
 */
function SuccessOverlay({ rect }: { rect: DOMRect | null }) {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // A real origin rect drives the morph; without one (or reduced motion) we
  // fall back to a centered fade-in.
  const hasRect = !!rect && !reduced
  const [expanded, setExpanded] = useState(reduced)
  const [checking, setChecking] = useState(reduced)

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(() => window.location.assign('/member/'), 700)
      return () => clearTimeout(t)
    }
    // Paint the collapsed frame first, then flip to expanded so the morph runs.
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setExpanded(true)),
    )
    const toCheck = setTimeout(() => setChecking(true), 780) // after the morph
    const toNav = setTimeout(() => window.location.assign('/member/'), 2700)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(toCheck)
      clearTimeout(toNav)
    }
  }, [reduced])

  const style: React.CSSProperties | undefined = !hasRect
    ? undefined
    : expanded
      ? { top: 0, left: 0, width: '100vw', height: '100vh', borderRadius: 0 }
      : {
          top: rect!.top,
          left: rect!.left,
          width: rect!.width,
          height: rect!.height,
          borderRadius: 18,
        }

  const className = hasRect
    ? 'umc-success-panel'
    : `umc-success-panel is-fade ${expanded ? 'is-expanded' : ''}`

  return (
    <div className={className} style={style} role="status" aria-label="Signed in">
      <div className="umc-success-glow" />
      <div className={`umc-success-shimmer ${checking ? 'is-on' : ''}`} />
      <div className={`umc-success-check ${checking ? 'is-in' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12.5l5 5L20 6.5" />
        </svg>
      </div>
    </div>
  )
}

/* ─── main page ──────────────────────────────────────────────────────────── */
export function LoginPage() {
  const { status, signInWithGoogle, signInWithApple, signInWithPhone, logout, isRegisteredUser, rejectCurrentUser } = useAuth()
  const location = useLocation()

  // Wrong-role / no-portal accounts are bounced back here (?e=wrong-role) with
  // an inline error instead of a separate page.
  const wrongRole = new URLSearchParams(location.search).get('e') === 'wrong-role'
  const [authError, setAuthError] = useState<string | null>(
    wrongRole ? "This account isn't set up for a web portal. Sign in with a doctor account." : null
  )

  // The portal is desktop-only — phone visitors are sent to the app download
  // section on the marketing site instead of the sign-in screen.
  const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 680px)').matches
  useEffect(() => { if (isPhone) window.location.replace('/#download') }, [isPhone])

  // cursor state
  const cursorRef = useRef<HTMLDivElement>(null)
  const mx = useRef(-300); const my = useRef(-300)
  const cx = useRef(-300); const cy = useRef(-300)
  const cw = useRef(18);   const ch = useRef(18); const cr = useRef(999)
  const rafRef = useRef<number>(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const nodesRef = useRef<Array<{ el: HTMLElement; pad: number; r: number; invert: boolean }>>([])

  // OTP state
  const [otpStep, setOtpStep] = useState<'idle' | 'phone' | 'otp'>('idle')
  const confirmRef = useRef<import('firebase/auth').ConfirmationResult | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)
  // True while an OTP just verified and we're checking the account is a registered
  // member — suppresses the success animation so the gate (not the effect) decides.
  const gatingRef = useRef(false)

  // Green success animation: the originating button's rect (for the FLIP morph),
  // captured at click time and replayed once sign-in completes.
  const originRef = useRef<DOMRect | null>(null)
  const [success, setSuccess] = useState<{ rect: DOMRect | null } | null>(null)

  // While the OTP modal is open the cursor ignores the buttons behind it and
  // instead morphs tightly around the modal's own Cancel / Send-code buttons.
  const otpOpenRef = useRef(false)
  const otpNodesRef = useRef<Array<{ el: HTMLElement; pad: number; r: number; invert: boolean }>>([])
  useEffect(() => {
    otpOpenRef.current = otpStep !== 'idle'
    otpNodesRef.current = otpStep === 'idle'
      ? []
      : Array.from(document.querySelectorAll<HTMLElement>('.umc-otp-btn')).map(el => ({ el, pad: 2, r: 16, invert: false }))
  }, [otpStep])

  useEffect(() => {
    if (status !== 'signed-in') return
    // Phone sign-in runs its own existing-member gate in handleOtpConfirm; don't
    // let this effect fire the success animation until that gate has decided.
    if (gatingRef.current) return
    // A wrong-role account that bounced back here is still signed in — sign it
    // out so the visitor stays on /login (with the banner) and can retry.
    if (wrongRole) { logout(); return }
    // Otherwise a successful sign-in plays the green success animation, which
    // then hard-navigates to the real /member/ index (RoleLanding routes onward,
    // so the common path never depends on the 404 SPA fallback).
    setSuccess({ rect: originRef.current })
  }, [status, wrongRole, logout])

  // cursor morph loop
  useEffect(() => {
    const el = cursorRef.current
    if (!el || !window.matchMedia('(pointer: fine)').matches) { el?.remove(); return }
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const damp = (base: number, dt: number) => 1 - Math.pow(1 - base, Math.max(0.5, dt) / 16.667)
    let prevX = mx.current
    let prevY = my.current
    let vel = 0
    const onMove = (e: PointerEvent) => {
      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : null
      const p = events && events.length ? events[events.length - 1] : e
      prevX = mx.current
      prevY = my.current
      mx.current = p.clientX
      my.current = p.clientY
      vel = Math.hypot(mx.current - prevX, my.current - prevY)
    }
    const onLeave = () => { mx.current = -300; my.current = -300 }
    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)

    let prevHit: (typeof nodesRef.current)[0] | null = null
    let cachedHit: (typeof nodesRef.current)[0] | null = null
    let last = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const dt = Math.min(34, now - last || 16.667)
      last = now
      // While the modal is open, only its own buttons are reachable.
      const nodes = otpOpenRef.current ? otpNodesRef.current : nodesRef.current
      let hit: (typeof nodes)[0] | null = cachedHit
      if ((frame++ % 2) === 0 || !hit) {
        hit = null
        for (const item of nodes) {
          const { left, top, right, bottom } = item.el.getBoundingClientRect()
          if (mx.current >= left - item.pad && mx.current <= right  + item.pad &&
              my.current >= top  - item.pad && my.current <= bottom + item.pad) {
            hit = item; break
          }
        }
        cachedHit = hit
      }
      if (hit !== prevHit) {
        el.classList.toggle('is-active', !!(hit?.invert))
        prevHit = hit
      }
      let tx: number, ty: number, ttw: number, tth: number, ttr: number
      if (hit) {
        const { left, top, width, height } = hit.el.getBoundingClientRect()
        tx = left + width / 2; ty = top + height / 2
        ttw = width + hit.pad * 2; tth = height + hit.pad * 2; ttr = hit.r
      } else {
        tx = mx.current; ty = my.current; ttw = 18; tth = 18; ttr = 999
      }
      const ps = hit ? 0.18 : Math.min(0.76, 0.34 + vel / 110)
      cx.current = lerp(cx.current, tx, damp(ps, dt)); cy.current = lerp(cy.current, ty, damp(ps, dt))
      cw.current = lerp(cw.current, ttw, damp(0.18, dt)); ch.current = lerp(ch.current, tth, damp(0.18, dt)); cr.current = lerp(cr.current, ttr, damp(0.18, dt))
      const br = Math.min(cr.current, Math.min(cw.current, ch.current) / 2)
      el.style.cssText = `width:${cw.current}px;height:${ch.current}px;border-radius:${br}px;transform:translate3d(${cx.current - cw.current/2}px,${cy.current - ch.current/2}px,0)`
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  // register cursor hit nodes after mount
  const registerNodes = useCallback((root: HTMLDivElement | null) => {
    (rootRef as React.MutableRefObject<HTMLDivElement | null>).current = root
    if (!root) { nodesRef.current = []; return }
    nodesRef.current = [
      ...Array.from(root.querySelectorAll<HTMLElement>('.umc-login-back')).map(el => ({ el, pad: 14, r: 999, invert: true  })),
      ...Array.from(root.querySelectorAll<HTMLElement>('.umc-auth-btn')).map(el =>   ({ el, pad: -2, r: 16,  invert: false })),
      ...Array.from(root.querySelectorAll<HTMLElement>('.umc-login-foot a')).map(el =>({ el, pad: 6,  r: 999, invert: false })),
    ]
  }, [])

  // ripple
  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget
    const rect = btn.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top  - size / 2
    const r = document.createElement('span')
    r.className = 'umc-ripple'
    r.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;background:rgba(255,255,255,0.07)`
    btn.appendChild(r)
    r.addEventListener('animationend', () => r.remove())
  }

  // clicked state helper
  const markClicked = (btn: HTMLButtonElement, label: HTMLSpanElement) => {
    setAuthError(null)
    btn.classList.add('umc-clicked')
    btn.disabled = true
    setTimeout(() => { label.textContent = 'Redirecting…' }, 380)
  }

  // auth handlers
  const handleGoogle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget
    const label = btn.querySelector<HTMLSpanElement>('.umc-auth-label')!
    originRef.current = btn.getBoundingClientRect()
    markClicked(btn, label)
    try { await signInWithGoogle(wrongRole) }
    catch {
      btn.classList.remove('umc-clicked'); btn.disabled = false; label.textContent = 'Continue with Google'
      setAuthError("Sign-in didn't complete. Please try again.")
    }
  }

  const handleApple = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget
    const label = btn.querySelector<HTMLSpanElement>('.umc-auth-label')!
    originRef.current = btn.getBoundingClientRect()
    markClicked(btn, label)
    try { await signInWithApple(wrongRole) }
    catch {
      btn.classList.remove('umc-clicked'); btn.disabled = false; label.textContent = 'Continue with Apple'
      setAuthError("Sign-in didn't complete. Please try again.")
    }
  }

  const handlePhoneClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    originRef.current = e.currentTarget.getBoundingClientRect()
    setAuthError(null); setOtpStep('phone')
  }

  const handleSendOtp = async (phone: string): Promise<string | null> => {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, 'umc-recaptcha', { size: 'invisible' })
    }
    try {
      confirmRef.current = await signInWithPhone(phone, recaptchaRef.current)
      setOtpStep('otp')
      return null
    } catch (err) {
      console.error('Phone sign-in error:', err)
      // Reset the verifier so the next attempt gets a fresh reCAPTCHA challenge
      // (a consumed/failed one can't be reused on the same hidden container).
      try { recaptchaRef.current?.clear() } catch { /* ignore */ }
      recaptchaRef.current = null
      return phoneAuthMessage(err)
    }
  }

  const handleOtpConfirm = async (code: string): Promise<string | null> => {
    // Set the gate flag BEFORE confirm() so the success effect can't fire in the
    // window between sign-in propagating and the membership check completing.
    gatingRef.current = true
    let cred
    try {
      cred = await confirmRef.current?.confirm(code)
    } catch (err) {
      console.error('OTP confirm error:', err)
      gatingRef.current = false
      return otpAuthMessage(err)   // wrong / expired code — nothing to undo
    }
    // Code was correct → the user is now signed in. The portal is sign-in only,
    // so reject any number that isn't already a registered member.
    try {
      const uid = cred?.user?.uid
      if (!uid || !(await isRegisteredUser(uid))) {
        await rejectCurrentUser()
        return 'No account found for that number. Please sign up in the UMC app first.'
      }
      setOtpStep('idle')
      setSuccess({ rect: originRef.current })
      return null
    } catch (err) {
      console.error('Membership check failed:', err)
      await rejectCurrentUser()   // fail-closed — don't leave them signed in
      return 'Could not verify your account. Please try again.'
    } finally {
      gatingRef.current = false
    }
  }

  // Don't flash the desktop sign-in UI while the phone redirect kicks in.
  if (isPhone) return null

  return (
    <>
      <style>{css}</style>
      <div className="umc-login-root" ref={registerNodes}>
        <button className="umc-login-back" onClick={() => (window.location.href = '/#pillars')}>
          <span className="umc-login-back-arr">←</span>
          <span>Back to site</span>
        </button>

        <div className="umc-login-panel">
          <div className="umc-login-mark">
            <img src={`${import.meta.env.BASE_URL}app_logo.png`} alt="Unified Medical Care" />
          </div>

          <h1 className="umc-login-hdg">Welcome</h1>
          <p className="umc-login-sub">Unified Medical Care · Member Portal</p>

          {authError && (
            <div className="umc-login-error" role="alert">{authError}</div>
          )}

          <div className="umc-login-btns">
            {/* Google */}
            <button
              type="button"
              className="umc-auth-btn umc-google"
              onPointerDown={handlePointerDown}
              onClick={handleGoogle}
            >
              <span className="umc-auth-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </span>
              <span className="umc-auth-label">Continue with Google</span>
              <span className="umc-auth-btn-arr" aria-hidden="true">→</span>
            </button>

            {/* Phone */}
            <button
              type="button"
              className="umc-auth-btn umc-phone"
              onPointerDown={handlePointerDown}
              onClick={handlePhoneClick}
            >
              <span className="umc-auth-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5.5" y="1.5" width="13" height="21" rx="3.5" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M10 5.5h4" stroke="currentColor" strokeWidth="1.6"/>
                  <circle cx="12" cy="18.5" r="1" fill="currentColor"/>
                </svg>
              </span>
              <span className="umc-auth-label">Continue with Phone</span>
              <span className="umc-auth-btn-arr" aria-hidden="true">→</span>
            </button>

            {/* Apple */}
            <button
              type="button"
              className="umc-auth-btn umc-apple"
              onPointerDown={handlePointerDown}
              onClick={handleApple}
            >
              <span className="umc-auth-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              </span>
              <span className="umc-auth-label">Continue with Apple</span>
              <span className="umc-auth-btn-arr" aria-hidden="true">→</span>
            </button>
          </div>

          <p className="umc-login-foot">
            New to UMC? <a href="/#download">Join the beta</a><br />
            By signing in you agree to our{' '}
            <span style={{ whiteSpace: 'nowrap' }}>
              <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a>
            </span>
          </p>
        </div>

        <div className={`umc-cursor ${success ? 'is-hidden' : ''}`} ref={cursorRef} aria-hidden="true" />
      </div>

      {otpStep !== 'idle' && (
        <OtpModal
          key={otpStep}
          step={otpStep}
          onSendOtp={handleSendOtp}
          onConfirm={handleOtpConfirm}
          onCancel={() => setOtpStep('idle')}
        />
      )}

      {success && <SuccessOverlay rect={success.rect} />}
    </>
  )
}
