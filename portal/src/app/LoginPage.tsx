import { useEffect, useRef, useCallback, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { RecaptchaVerifier } from 'firebase/auth'
import { auth } from '../shared/lib/firebase'
import { useAuth } from '../shared/auth/AuthContext'

/* ─── inline styles ─────────────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

  .umc-login-root {
    --serif:      'DM Serif Display', Georgia, serif;
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
    font-family: var(--serif); font-style: italic; font-weight: 400;
    font-size: clamp(36px, 6vw, 52px); letter-spacing: -0.02em;
    color: var(--fg); text-align: center; line-height: 1.1;
    margin: 0 0 10px;
  }
  .umc-login-sub {
    font-family: var(--mono); font-size: 10.5px; font-weight: 600;
    letter-spacing: 0.26em; text-transform: uppercase;
    color: var(--fg-soft); text-align: center; margin: 0 0 56px;
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
    font-family: var(--serif); font-style: italic; font-size: 28px;
    font-weight: 400; color: var(--fg); letter-spacing: -0.02em; margin: 0;
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
    color: var(--fg); letter-spacing: 0.06em; width: 100%;
    transition: border-color 0.25s ease;
    outline: none;
  }
  .umc-otp-input:focus { border-color: rgba(52,199,89,0.5); }
  .umc-otp-input::placeholder { color: var(--fg-faint); }
  .umc-otp-row { display: flex; gap: 10px; }
  .umc-otp-btn {
    flex: 1; padding: 16px; border-radius: 12px; border: none;
    font-family: var(--sans); font-size: 14px; font-weight: 600;
    cursor: pointer; transition: opacity 0.2s ease, transform 0.2s ease;
  }
  .umc-otp-btn:hover { opacity: 0.85; transform: translateY(-1px); }
  .umc-otp-submit { background: #34C759; color: #04280e; }
  .umc-otp-cancel {
    background: transparent; color: var(--fg-soft);
    border: 1px solid rgba(230,230,230,0.1) !important;
  }
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
  @media (pointer: coarse) {
    .umc-login-root * { cursor: auto !important; }
    .umc-cursor { display: none; }
  }

  @keyframes umc-fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .umc-login-back, .umc-login-panel { animation: none; opacity: 1; }
  }
`

/* ─── phone OTP modal ────────────────────────────────────────────────────── */
interface OtpModalProps {
  onConfirm: (code: string) => void
  onCancel: () => void
  step: 'phone' | 'otp'
  onSendOtp: (phone: string) => void
}

function OtpModal({ onConfirm, onCancel, step, onSendOtp }: OtpModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="umc-otp-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="umc-otp-card">
        <h2 className="umc-otp-title">{step === 'phone' ? 'Your number.' : 'Check your phone.'}</h2>
        <p className="umc-otp-desc">
          {step === 'phone' ? 'Enter your mobile number' : 'Enter the 6-digit code'}
        </p>
        <input
          ref={inputRef}
          className="umc-otp-input"
          type={step === 'phone' ? 'tel' : 'text'}
          inputMode={step === 'phone' ? 'tel' : 'numeric'}
          placeholder={step === 'phone' ? '+1 234 567 8900' : '000000'}
          maxLength={step === 'phone' ? 16 : 6}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = inputRef.current?.value ?? ''
              if (!val) return
              step === 'phone' ? onSendOtp(val) : onConfirm(val)
            }
          }}
        />
        <div className="umc-otp-row">
          <button className="umc-otp-btn umc-otp-cancel" onClick={onCancel}>Cancel</button>
          <button
            className="umc-otp-btn umc-otp-submit"
            onClick={() => {
              const val = inputRef.current?.value ?? ''
              if (!val) return
              step === 'phone' ? onSendOtp(val) : onConfirm(val)
            }}
          >
            {step === 'phone' ? 'Send code →' : 'Verify →'}
          </button>
        </div>
      </div>
      <div id="umc-recaptcha" />
    </div>
  )
}

/* ─── main page ──────────────────────────────────────────────────────────── */
export function LoginPage() {
  const { status, signInWithGoogle, signInWithApple, signInWithPhone } = useAuth()
  const navigate = useNavigate()

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

  useEffect(() => {
    if (status === 'signed-in') navigate('/', { replace: true })
  }, [status, navigate])

  // cursor morph loop
  useEffect(() => {
    const el = cursorRef.current
    if (!el || !window.matchMedia('(pointer: fine)').matches) { el?.remove(); return }
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const onMove = (e: MouseEvent) => { mx.current = e.clientX; my.current = e.clientY }
    const onLeave = () => { mx.current = -300; my.current = -300 }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)

    let prevHit: (typeof nodesRef.current)[0] | null = null
    const tick = () => {
      const nodes = nodesRef.current
      let hit: (typeof nodes)[0] | null = null
      for (const item of nodes) {
        const { left, top, right, bottom } = item.el.getBoundingClientRect()
        if (mx.current >= left - item.pad && mx.current <= right  + item.pad &&
            my.current >= top  - item.pad && my.current <= bottom + item.pad) {
          hit = item; break
        }
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
      const ps = hit ? 0.12 : 0.20
      cx.current = lerp(cx.current, tx, ps); cy.current = lerp(cy.current, ty, ps)
      cw.current = lerp(cw.current, ttw, 0.14); ch.current = lerp(ch.current, tth, 0.14); cr.current = lerp(cr.current, ttr, 0.14)
      const br = Math.min(cr.current, Math.min(cw.current, ch.current) / 2)
      el.style.cssText = `width:${cw.current}px;height:${ch.current}px;border-radius:${br}px;transform:translate(${cx.current - cw.current/2}px,${cy.current - ch.current/2}px)`
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  // register cursor hit nodes after mount
  const registerNodes = useCallback((root: HTMLDivElement | null) => {
    (rootRef as React.MutableRefObject<HTMLDivElement | null>).current = root
    if (!root) { nodesRef.current = []; return }
    nodesRef.current = [
      ...Array.from(root.querySelectorAll<HTMLElement>('.umc-login-back')).map(el => ({ el, pad: 14, r: 999, invert: true  })),
      ...Array.from(root.querySelectorAll<HTMLElement>('.umc-auth-btn')).map(el =>   ({ el, pad: 12, r: 18,  invert: false })),
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
    btn.classList.add('umc-clicked')
    btn.disabled = true
    setTimeout(() => { label.textContent = 'Redirecting…' }, 380)
  }

  // auth handlers
  const handleGoogle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget
    const label = btn.querySelector<HTMLSpanElement>('.umc-auth-label')!
    markClicked(btn, label)
    try { await signInWithGoogle() } catch { btn.classList.remove('umc-clicked'); btn.disabled = false; label.textContent = 'Continue with Google' }
  }

  const handleApple = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget
    const label = btn.querySelector<HTMLSpanElement>('.umc-auth-label')!
    markClicked(btn, label)
    try { await signInWithApple() } catch { btn.classList.remove('umc-clicked'); btn.disabled = false; label.textContent = 'Continue with Apple' }
  }

  const handlePhoneClick = () => setOtpStep('phone')

  const handleSendOtp = async (phone: string) => {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, 'umc-recaptcha', { size: 'invisible' })
    }
    try {
      confirmRef.current = await signInWithPhone(phone, recaptchaRef.current)
      setOtpStep('otp')
    } catch (err) {
      console.error('Phone sign-in error:', err)
      setOtpStep('idle')
    }
  }

  const handleOtpConfirm = async (code: string) => {
    try {
      await confirmRef.current?.confirm(code)
      setOtpStep('idle')
    } catch (err) {
      console.error('OTP confirm error:', err)
    }
  }

  return (
    <>
      <style>{css}</style>
      <div className="umc-login-root" ref={registerNodes}>
        <button className="umc-login-back" onClick={() => (window.location.href = '/')}>
          <span className="umc-login-back-arr">←</span>
          <span>Back to site</span>
        </button>

        <div className="umc-login-panel">
          <div className="umc-login-mark">
            <img src="/app_logo.png" alt="Unified Medical Care" />
          </div>

          <h1 className="umc-login-hdg">Welcome.</h1>
          <p className="umc-login-sub">Unified Medical Care · Member Portal</p>

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

        <div className="umc-cursor" ref={cursorRef} aria-hidden="true" />
      </div>

      {otpStep !== 'idle' && (
        <OtpModal
          step={otpStep}
          onSendOtp={handleSendOtp}
          onConfirm={handleOtpConfirm}
          onCancel={() => setOtpStep('idle')}
        />
      )}
    </>
  )
}
