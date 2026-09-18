// NotifyPanel.tsx — the Android steps for letting this phone ring.
//
// Android is the easy half: Chrome (and the other Android browsers) take web
// push in an ordinary tab, so there is nothing to install — the one thing that
// matters is the patient tapping Allow when the browser asks. That ask can only
// come from a tap on the page, so the steps brief them on what is about to pop
// up and END on the button that makes it happen ("Enable Reminders").
//
// Two sets of steps:
//   ask     — permission not asked yet. Android 13+ may ask twice: first the
//             site prompt ("…wants to show notifications"), then — if the
//             browser itself has never been allowed — the system's "Allow
//             Chrome to send you notifications?". Both need Allow.
//   blocked — the patient (or the browser, after repeated dismissals) said no.
//             The page can never ask again; only the site settings can undo
//             it. Ends on a re-check, and the page also re-checks by itself
//             when the patient comes back from Settings.
//
// Same card as InstallPanel, every step on screen at once (decision
// 2026-09-19), so both platforms look alike. No Next, no Done and no close
// button: on this screen the steps ARE the next thing to do, and the only
// way on is the action button at the foot. Once reminders are confirmed on,
// the page swaps this card for "You're all set!" (AllSet.tsx).
import type { ReactNode } from 'react'
import { Glyph } from './glyphs'

export type NotifyMode = 'ask' | 'blocked'

function stepsFor(mode: NotifyMode): { label: string; steps: ReactNode[] } {
  if (mode === 'ask') {
    return {
      label: 'Let this phone ring for your medicines',
      steps: [
        <>When you tap <strong>Enable Reminders</strong> <Glyph name="phone-vibrate" /> below, a box will pop up asking if this site can send you notifications.</>,
        <>Tap <strong>Allow</strong> in that box. Not <em>Block</em> — that stops every reminder.</>,
        <>Your phone may ask once more whether your browser can send notifications. Tap <strong>Allow</strong> there too.</>,
      ],
    }
  }
  return {
    label: 'Notifications are blocked for this site',
    steps: [
      <>Tap the small button <Glyph name="tune" /> just left of the web address, <strong>unifiedmedicalcare.com</strong>. (It may be a lock 🔒.)</>,
      <>Tap <strong>Permissions</strong> if you see it, then switch <strong>Notifications</strong> on <Glyph name="toggle" /></>,
      <>Still blocked? Open your phone's <strong>Settings</strong> → <strong>Apps</strong> → your browser (e.g. <strong>Chrome</strong>) → <strong>Notifications</strong>, and switch them on.</>,
      <>Come back to this page and tap <strong>I've turned them on</strong>.</>,
    ],
  }
}

export function NotifyPanel({ mode, onAllow, onRecheck, stillBlocked = false }: {
  mode: NotifyMode
  // 'ask': opens the browser's notifications prompt (must be this tap)
  onAllow: () => void
  // 'blocked': looks at the permission again after the patient changed it
  onRecheck: () => void
  // 'blocked': a re-check found it still blocked
  stillBlocked?: boolean
}) {
  const { label, steps } = stepsFor(mode)

  return (
    <section className="umc-install-card umc-notify-card">
      <div className="umc-install-top">
        <p className="umc-install-label">{label}</p>
      </div>
      <ol className="umc-install-steps">
        {steps.map((step, i) => (
          <li key={i} className="is-active">
            <span className="umc-install-num" aria-hidden="true">{i + 1}</span>
            <span className="umc-install-body">{step}</span>
          </li>
        ))}
      </ol>
      {stillBlocked && (
        <p className="umc-notify-still" role="alert">Still blocked. Check the steps above, then try again.</p>
      )}
      {/* The real action sits under the steps, full width — the same big
          button the patient was told to look for. */}
      {mode === 'ask' && (
        <button type="button" className="umc-btn primary full big umc-install-ring umc-notify-action" onClick={onAllow}>
          <span className="umc-install-ring-bell" aria-hidden="true"><Glyph name="phone-vibrate" /></span>
          Enable Reminders
        </button>
      )}
      {mode === 'blocked' && (
        <button type="button" className="umc-btn primary full umc-notify-action" onClick={onRecheck}>
          I've turned them on
        </button>
      )}
    </section>
  )
}
