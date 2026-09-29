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
//   piece 5 — today's doses + "Taken" (TodayDoses.tsx; ?dose=<logId> highlights)
//   piece 7 — Telugu by default, English on the switch (i18n/; 2026-09-29)       ← here
//
// No wording lives in this file: state holds the REASON for a message (a
// key), and the render looks the words up, so a language switch re-words
// whatever is already on screen.
//
// Not a member-portal page: no role guard, no users/{uid} requirement, no
// desktop-only redirect, and it must work with no App Check token at all.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { OtpModal } from '../../shared/auth/PhoneOtp'
import { phoneAuthReason, otpAuthReason } from '../../shared/auth/phoneAuthErrors'
import { sendOtp, confirmOtp, resetOtp, signOutReminders } from './data/reminderAuth'
import { previewClaim, claimGroup, usersDocExists, deleteOrphanAccount, signOutExisting, syncPatientName } from './data/reminderClaim'
import { decideAfterPreview, decideNoMatch, claimErrorReason, type ClaimErrorReason } from './data/claimDecision'
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
import { LangSwitch } from './LangSwitch'
import { useLang } from './i18n/langStore'
import { useStrings } from './i18n/useStrings'
import type { NoticeKey, PushErrorReason } from './i18n/strings'
import './RemindersPage.css'

type OtpStep = 'idle' | 'phone' | 'otp'

// What the signed-in half of the page is doing.
type ClaimState =
  | { kind: 'looking' }
  | { kind: 'claiming'; groupId: string; patientName: string; doctorName: string }
  // returning: signed in to a record this account had already claimed — the
  // heading says "Welcome back" instead of "You're set up".
  | { kind: 'claimed'; groupId: string; fullName: string; doctorName?: string; returning: boolean }
  | { kind: 'error'; reason: ClaimErrorReason | 'lookup-failed' }

// The push half of the "claimed" screen.
type PushState =
  | { kind: 'checking' }
  | { kind: 'gate'; gate: 'ios-add-to-home' | 'ios-too-old' | 'unsupported' }
  | { kind: 'prompt' }        // permission not asked yet → "Enable Reminders" button (needs a tap)
  | { kind: 'denied'; stillBlocked?: boolean }  // permission refused in the browser; stillBlocked after a re-check
  | { kind: 'registering' }
  | { kind: 'enabled' }
  | { kind: 'app-owns' }      // the UMC app took reminders over on this phone — web push stays off
  | { kind: 'error'; reason: PushErrorReason }

function pushErrorReason(err: unknown): PushErrorReason {
  const reason = err instanceof PushSetupError ? err.reason : ''
  return reason === 'vapid-missing' || reason === 'no-token' || reason === 'write-failed' ? reason : 'generic'
}

// Shown instead of the welcome screen — not alongside it — when the phone
// number just signed in with matches no patient record at all. Fixed overlay,
// same technique as OtpModal, so "Continue with phone" and the rest of the
// welcome copy underneath are fully hidden, not just captioned.
// `nonPatient`: the number already has a UMC account in the app, just not a
// patient one (a doctor, pharmacy…) — asking their doctor to register them
// would be the wrong advice, so that line says so instead (decision 2026-09-19).
function UnregisteredOverlay({ nonPatient, onDismiss }: { nonPatient: boolean; onDismiss: () => void }) {
  const t = useStrings()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])
  return (
    <div className="umc-unreg-overlay" onClick={(e) => e.target === e.currentTarget && onDismiss()}>
      <div className="umc-unreg-body" role="dialog" aria-modal="true" aria-labelledby="umc-unreg-hdg">
        <h1 id="umc-unreg-hdg" className="umc-unreg-hdg">{t.unregistered.heading}</h1>
        <p className="umc-unreg-lead">{t.unregistered.lead}</p>
        <p className="umc-unreg-sub">
          {nonPatient ? t.unregistered.nonPatient : t.unregistered.askDoctor}
        </p>
        <div className="umc-unreg-soon">
          <span className="umc-unreg-soon-badge">{t.unregistered.soonBadge}</span>
          <img className="umc-unreg-soon-logo" src="/member/app_logo.png" alt="" />
          <p>{t.unregistered.soonText}</p>
        </div>
        <button type="button" className="umc-unreg-btn" autoFocus onClick={onDismiss}>{t.unregistered.understood}</button>
      </div>
    </div>
  )
}

export function RemindersPage() {
  const { status, user, profile, retryProfile } = useAuth()
  const lang = useLang()
  const t = useStrings()
  const [otpStep, setOtpStep] = useState<OtpStep>('idle')
  // Shown on the welcome screen after a sign-out we initiated (existing
  // account / declined match) or a failed sign-out.
  const [notice, setNotice] = useState<NoticeKey | null>(null)
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
  const [signOutError, setSignOutError] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  // Both "settled" states: reminders are handled, here or by the app.
  const settled = push.kind === 'enabled' || push.kind === 'app-owns'
  // Push has landed somewhere definite, good or bad — what the header's
  // status light waits for before it shows (it has nothing to say during
  // 'checking'/'registering'/'prompt').
  const pushResolved = settled || push.kind === 'denied' || push.kind === 'gate' || push.kind === 'error'
  // The name → avatar sequence runs on its own fixed clock (GREETING_HOLD_MS
  // after the claimed screen appears), independent of push.
  // Destructured, not kept as one object: the hook returns two refs beside
  // plain state, and the react-hooks/refs rule would otherwise treat every
  // field of that object as a ref read during render.
  const {
    nameRef: morphNameRef, cornerRef: morphCornerRef,
    phase: morphPhase, peeking: morphPeeking, overlay: morphOverlay, flying: morphFlying,
    handleAvatarClick, handlePointerEnter, handlePointerLeave,
  } = useGreetingMorph(claim.kind === 'claimed', claim.kind === 'claimed' ? claim.fullName : '')
  // The corner label is just the capitalised first initial — same font/colour
  // the name had in the heading (var(--serif) / var(--ink)), just shrunk.
  const nameInitial = claim.kind === 'claimed' ? (claim.fullName.trim().charAt(0).toUpperCase() || '?') : ''
  // The "the UMC app owns reminders here" note collapses out of the way once
  // the corner has settled — the header's status light carries the ongoing
  // signal. ('enabled' has no banner at all any more.) Denied/gated/erroring
  // states stay put; those still need the patient's attention.
  const setupTucked = settled && (morphPhase === 'corner' || morphPhase === 'avatar')

  useEffect(() => { installPwaHead() }, [])
  // The tab's title and the document's language follow the switch; the
  // language is handed back when the page is left, since the member portal
  // shares this document and is English.
  useEffect(() => {
    const before = document.documentElement.lang
    document.title = t.docTitle
    document.documentElement.lang = lang
    return () => { document.documentElement.lang = before }
  }, [lang, t])

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
      else setNotice('existing-account')
      await signOutExisting().catch((e) => console.error('sign-out failed:', e))
    }
  }

  // Signed out: forget the last patient entirely, so nothing of theirs (the
  // header's avatar and status light, the finished name animation) is left
  // behind on the sign-in screen or carried into the next sign-in. Adjusted
  // during render (React's reset-on-prop-change pattern) rather than in an
  // effect, so the stale claim never reaches a paint.
  const signedIn = status === 'signed-in' && !!user
  const [wasSignedIn, setWasSignedIn] = useState(signedIn)
  if (wasSignedIn !== signedIn) {
    setWasSignedIn(signedIn)
    if (!signedIn) setClaim({ kind: 'looking' })
  }

  // ── the lookup: runs as soon as a session exists ─────────────────────────
  useEffect(() => {
    if (status !== 'signed-in' || !user) { lookedUpFor.current = null; return }
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
        if (!cancelled) setClaim({ kind: 'error', reason: 'lookup-failed' })
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
        case 'confirm': {
          // The OTP already proves ownership of the doctor's phone number, so
          // claim immediately instead of asking "Yes, that's me" a second time.
          setClaim({ kind: 'claiming', groupId: verdict.groupId, patientName: verdict.patientName, doctorName: verdict.doctorName })
          try {
            const res = await claimGroup(verdict.groupId)
            if (cancelled) return
            setClaim({ kind: 'claimed', groupId: res.groupId, fullName: res.fullName, doctorName: verdict.doctorName, returning: false })
            syncPatientName(uid, profile?.fullName, res.fullName).catch((e) => console.error('name sync failed:', e))
          } catch (err) {
            console.error('claimGroup failed:', err)
            if (!cancelled) setClaim({ kind: 'error', reason: claimErrorReason(err) })
          }
          return
        }
        case 'other-account':
          setNotice('other-account')
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
  // The registration under way, if any. Sign-out waits for it: one that
  // finished a moment AFTER sign-out had turned the token off would switch it
  // straight back on, on a phone nobody is signed in to.
  const registering = useRef<Promise<unknown> | null>(null)
  const register = async (gid: string, celebrate = true) => {
    setPush({ kind: 'registering' })
    const attempt = registerPushToken(gid, platform.tokenPlatform)
    registering.current = attempt
    try {
      const action = await attempt
      const enabled = action !== 'app-owns'
      setPush({ kind: enabled ? 'enabled' : 'app-owns' })
      if (enabled && celebrate) setCelebrating(true)
    }
    catch (err) { console.error('push registration failed:', err); setPush({ kind: 'error', reason: pushErrorReason(err) }) }
    finally { if (registering.current === attempt) registering.current = null }
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
      // Not asked yet: the page never asks by itself (decision 2026-09-29).
      // A box that opens unannounced, some time after the patient's last
      // tap, is easy to dismiss or Block — and Block sends them into the
      // phone's Settings to undo. Chrome may also show an un-tapped request
      // quietly, or not at all. The Enable Reminders button asks instead,
      // from the patient's own tap (handleAllow). The Add to Home Screen
      // sheet that used to follow is gone as well: nothing here needs it on
      // Android, and it was a second unexplained box.
      else setPush({ kind: 'prompt' })
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimedGid])

  // Enable Reminders — the one place the browser's permission box is opened,
  // on every platform, and always from this tap.
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
    catch (err) { console.error('Phone sign-in error:', err); return t.otp.sendErrors[phoneAuthReason(err)] }
  }
  const handleConfirm = async (code: string): Promise<string | null> => {
    try { await confirmOtp(code); setOtpStep('idle'); setNotice(null); return null }
    catch (err) { console.error('OTP confirm error:', err); return t.otp.codeErrors[otpAuthReason(err)] }
  }
  const handleCancel = () => { resetOtp(); setOtpStep('idle') }

  const handleRetry = () => { lookedUpFor.current = null; setNotice(null); setRetryKey((k) => k + 1) }

  // The account itself could not be read (status 'error'). Nearly always the
  // connection, so the moment the phone is back online the page tries again
  // without being asked; Try again is there for everything else.
  useEffect(() => {
    if (status !== 'error') return
    window.addEventListener('online', retryProfile)
    return () => window.removeEventListener('online', retryProfile)
    // retryProfile is a new function on every render of the provider; the
    // listener is re-made only when the status changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Sign-out must turn this browser's push token off FIRST: the rule on
  // webPushTokens is `uid == patient_uid`, so once the session is gone the
  // patient can no longer stop their own reminders — and this phone would keep
  // buzzing with their doses even after someone else signs in on it.
  // Decision 2026-09-18: if that write fails, refuse to sign out and let them
  // retry, rather than leaving a live token behind on a phone being handed on.
  // Decision 2026-09-29: on EVERY sign-out, not only when this visit had got
  // as far as "reminders are on". A token an earlier visit left on is just
  // as live when today's registration failed, was blocked, or never ran —
  // and the data layer, not this screen, knows whether there is one.
  const handleSignOut = async () => {
    if (signingOut) return
    setNotice(null); setSignOutError(false)
    setSigningOut(true)
    try {
      await registering.current?.catch(() => {})
      await deactivatePushToken(claimedGid)
    } catch (err) {
      console.error('push token deactivation failed:', err)
      setSigningOut(false)
      setSignOutError(true)
      return
    }
    setSigningOut(false)
    try { await signOutReminders() }
    catch (err) { console.error('Sign-out error:', err); setNotice('sign-out-failed') }
  }

  // ── render ───────────────────────────────────────────────────────────────
  let body
  if (status === 'unknown') {
    body = <div className="umc-rem-loading"><span className="umc-spin" aria-hidden="true" />{t.loading}</div>
  } else if (status === 'error') {
    // Somebody is signed in, but their account could not be read. Not the
    // welcome screen (they are not signed out) and not the dashboard (nothing
    // is known about them): say so, and offer a retry and a way out.
    body = (
      <main className="umc-rem-main">
        <h1 className="umc-rem-hdg">{t.claim.errorHeading}</h1>
        <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />{t.claim.errors['account-failed']}</p>
        {signOutError && <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />{t.dash.signOutBlocked}</p>}
        <button type="button" className="umc-btn primary full" onClick={retryProfile}>{t.claim.tryAgain}</button>
        <button type="button" className="umc-btn ghost full" disabled={signingOut} onClick={handleSignOut}>
          {signingOut ? <><span className="umc-spin" aria-hidden="true" />{t.account.turningOff}</> : t.claim.signOut}
        </button>
      </main>
    )
  } else if (status === 'signed-out' || !user) {
    body = (
      <main className="umc-rem-main">
        <h1 className="umc-rem-hdg">{t.landing.heading}</h1>
        <p className="umc-rem-lead">{t.landing.lead}</p>
        {notice && <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />{t.notices[notice]}</p>}
        {platform.gate === 'ios-add-to-home' && install && <InstallPanel beforeSignIn autoOpen={onApplePhone} os={install} browser={platform.browser} safariVersion={platform.safariVersion} onDone={handleSetupDone} />}
        {platform.gate === 'ios-too-old' && (
          <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />{t.landing.iosTooOld}</p>
        )}
        <button
          type="button"
          className="umc-btn primary full big"
          disabled={signInHeld}
          aria-describedby={signInHeld ? 'umc-rem-held' : undefined}
          onClick={() => { setNotice(null); setOtpStep('phone') }}
        >
          <Icon name="phone" size={20} />
          {t.landing.continueWithPhone}
          <span className="umc-rem-btn-arrow"><Icon name="chevronRight" size={20} /></span>
        </button>
        {signInHeld && <p className="umc-rem-note umc-rem-held" id="umc-rem-held">{t.landing.held}</p>}
        <p className="umc-rem-note" hidden={signInHeld}>
          {platform.gate === 'ios-add-to-home'
            ? install === 'mac' ? t.landing.noteDock : t.landing.noteHomeScreen
            : t.landing.noteSms}
        </p>
      </main>
    )
  } else if (claim.kind === 'looking') {
    body = <div className="umc-rem-loading"><span className="umc-spin" aria-hidden="true" />{t.claim.looking}</div>
  } else if (claim.kind === 'claiming') {
    body = <div className="umc-rem-loading"><span className="umc-spin" aria-hidden="true" />{t.claim.claiming}</div>
  } else if (claim.kind === 'claimed') {
    body = (
      <main className="umc-rem-main umc-rem-dash">
        <h1 className="umc-rem-hdg">
          {morphPhase === 'inline' || morphPhase === 'morphing' ? (
            <>{claim.returning ? t.dash.welcomeBack : t.dash.setUp}{claim.fullName ? ', ' : ''}<span ref={morphNameRef} style={morphPhase === 'morphing' ? { visibility: 'hidden' } : undefined}>{formatPatientName(claim.fullName)}</span></>
          ) : t.dash.reminders}
        </h1>
        {/* The number itself lives in Account details now (decision
            2026-09-19) — this screen doesn't need to repeat it. */}
        {push.kind === 'checking' || push.kind === 'registering' ? (
          <p className="umc-rem-lead">{push.kind === 'registering' ? t.dash.registering : t.dash.checking}</p>
        ) : push.kind === 'enabled' && celebrating ? (
          <AllSetCard line={t.dash.allSetLine} onFinished={() => setCelebrating(false)} />
        ) : push.kind === 'enabled' ? (
          // No banner (decision 2026-09-18): the green status light in the
          // header is the whole confirmation. This line is visually hidden
          // and only exists so a screen reader still announces the change,
          // since the light itself is aria-hidden.
          <p className="umc-sr-only" role="status">{t.dash.remindersOn}.</p>
        ) : push.kind === 'app-owns' ? (
          <div className={`umc-rem-setup-collapse${setupTucked ? ' is-tucked' : ''}`}>
            <div className="umc-rem-ok" role="status">
              <Icon name="checkCircle" size={22} />
              <span>{t.dash.appOwns}</span>
            </div>
          </div>
        ) : push.kind === 'denied' && platform.os === 'android' ? (
          reveal('blocked', <NotifyPanel onRecheck={() => void recheck(true)} stillBlocked={push.stillBlocked} />)
        ) : push.kind === 'prompt' ? (
          <>
            <p className="umc-rem-lead">{t.dash.lastStepTap}</p>
            <button type="button" className="umc-btn primary full big umc-install-ring" onClick={handleAllow}>
              <span className="umc-install-ring-bell" aria-hidden="true"><Glyph name="phone-vibrate" /></span>
              {t.dash.enable}
              <span className="umc-rem-btn-arrow"><Icon name="chevronRight" size={20} /></span>
            </button>
          </>
        ) : push.kind === 'denied' ? (
          <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />{t.dash.blocked}</p>
        ) : push.kind === 'gate' && push.gate === 'ios-add-to-home' ? (
          <>
            <p className="umc-rem-lead">
              {install === 'mac' ? t.dash.onlyFromDock : t.dash.onlyFromHomeScreen(install === 'ipad' ? 'iPad' : 'iPhone')}
            </p>
            {install && <InstallPanel beforeSignIn={false} autoOpen={onApplePhone} os={install} browser={platform.browser} safariVersion={platform.safariVersion} />}
          </>
        ) : push.kind === 'gate' && push.gate === 'ios-too-old' ? (
          <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />{t.dash.iosTooOld}</p>
        ) : push.kind === 'gate' ? (
          <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />{t.dash.unsupported}</p>
        ) : (
          <>
            <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />{t.dash.pushErrors[push.reason]}</p>
            <button type="button" className="umc-btn primary full" onClick={() => register(claim.groupId)}>{t.claim.tryAgain}</button>
          </>
        )}
        <TodayDoses gid={claim.groupId} uid={user.uid} highlightLogId={highlightLogId} />
      </main>
    )
  } else {
    body = (
      <main className="umc-rem-main">
        <h1 className="umc-rem-hdg">{t.claim.errorHeading}</h1>
        <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />{t.claim.errors[claim.reason]}</p>
        {signOutError && <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />{t.dash.signOutBlocked}</p>}
        <button type="button" className="umc-btn primary full" onClick={handleRetry}>{t.claim.tryAgain}</button>
        <button type="button" className="umc-btn ghost full" disabled={signingOut} onClick={handleSignOut}>
          {signingOut ? <><span className="umc-spin" aria-hidden="true" />{t.account.turningOff}</> : t.claim.signOut}
        </button>
      </main>
    )
  }

  return (
    <div className={`umc-rem-root${unregistered ? ' is-blurred' : ''}`} lang={lang}>
      <div className="umc-rem-brand">
        <img src="/member/app_logo.png" alt="" />
        <span>Unified Medical Care</span>
        {/* Until the patient is on their own dashboard the right corner is
            free, and the language switch has it (decision 2026-09-29). Once
            claimed, the corner is the status light's and the avatar's; the
            switch moves into the account sheet. */}
        {claim.kind !== 'claimed' && (
          <div className="umc-rem-brand-right"><LangSwitch /></div>
        )}
        {claim.kind === 'claimed' && (
          <div className="umc-rem-brand-right">
            {/* Live status, independent of the "Reminders are on" banner
                above (which collapses once it's been seen) — this stays up
                for as long as the claimed screen does, so the patient can
                glance at it later and know without reading anything.
                Steps aside (morphPeeking) when the peeked initial slides
                out from behind the avatar into this same spot, so the two
                are never on top of each other. */}
            {pushResolved && (
              <span
                className={`umc-rem-status ${settled ? 'is-on' : 'is-off'}${morphPeeking ? ' is-peeked' : ''}`}
                aria-hidden="true"
                title={settled ? t.dash.remindersOn : t.dash.remindersOff}
              >
                <Glyph name="phone-vibrate" />
              </span>
            )}
            <div className="umc-rem-corner" ref={morphCornerRef}>
              {morphPhase === 'corner' && (
                <span className="umc-rem-corner-name">{nameInitial}</span>
              )}
              {morphPhase === 'avatar' && (
                <>
                  {/* Peeked: the full name, not the initial the resting
                      corner label uses — this is a deliberate look-up, so
                      it should say who it means, not make the patient
                      infer it from one letter. */}
                  <span className={`umc-rem-corner-name is-tuck${morphPeeking ? ' is-peek' : ''}`}>{formatPatientName(claim.fullName)}</span>
                  <button
                    type="button"
                    className="umc-rem-account-btn is-shown"
                    aria-label={t.dash.accountDetails}
                    onClick={() => { handleAvatarClick(); setAccountOpen(true) }}
                    onMouseEnter={handlePointerEnter}
                    onMouseLeave={handlePointerLeave}
                  >
                    <AccountAvatar photoUrl={profile?.profilePhotoUrl} name={claim.fullName} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {morphOverlay && (
        <span
          className={`umc-rem-morph-clone${morphFlying ? ' is-flying' : ''}`}
          aria-hidden="true"
          style={{
            top: morphOverlay.fromTop, left: morphOverlay.fromLeft,
            fontSize: morphOverlay.fontSize, fontFamily: morphOverlay.fontFamily, fontWeight: morphOverlay.fontWeight,
            color: morphOverlay.color,
            ['--dx' as string]: `${morphOverlay.dx}px`, ['--dy' as string]: `${morphOverlay.dy}px`, ['--s' as string]: morphOverlay.scale,
          }}
        >
          {morphOverlay.text}
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
          labels={t.otp}
        />
      )}
      {unregistered && <UnregisteredOverlay nonPatient={unregistered === 'non-patient'} onDismiss={() => setUnregistered(null)} />}
      {user && claim.kind === 'claimed' && accountOpen && (
        <AccountSheet
          fullName={formatPatientName(claim.fullName)}
          phone={formatIndianPhone(user.phoneNumber)}
          doctorName={claim.doctorName}
          signingOut={signingOut}
          signOutError={signOutError ? t.dash.signOutBlocked : null}
          onSignOut={handleSignOut}
          onClose={() => setAccountOpen(false)}
        />
      )}
    </div>
  )
}
