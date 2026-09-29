// NotifyPanel.tsx — the Android steps for un-blocking notifications.
//
// Android is the easy half: Chrome (and the other Android browsers) take web
// push in an ordinary tab, so there is nothing to install — the one thing that
// matters is the patient tapping Allow when the browser asks.
//
// ASKING needs no panel (decision 2026-09-29): it is one line and the Enable
// Reminders button on the page itself (RemindersPage.tsx), whose tap opens the
// browser's box. The three steps that used to brief the patient on that box
// were more to read than the box.
//
// This panel is for afterwards, when the patient (or the browser, after
// repeated dismissals) said no. The page can never ask again; only the site
// settings can undo it, and that does take steps. It ends on a re-check, and
// the page also re-checks by itself when the patient comes back from Settings.
//
// Same card as InstallPanel, every step on screen at once (decision
// 2026-09-19), so both platforms look alike. No Next, no Done and no close
// button: on this screen the steps ARE the next thing to do, and the only
// way on is the action button at the foot.
import { useStrings } from './i18n/useStrings'

export function NotifyPanel({ onRecheck, stillBlocked = false }: {
  // looks at the permission again after the patient changed it
  onRecheck: () => void
  // a re-check found it still blocked
  stillBlocked?: boolean
}) {
  const t = useStrings()

  return (
    <section className="umc-install-card umc-notify-card">
      <div className="umc-install-top">
        <p className="umc-install-label">{t.notify.blockedLabel}</p>
      </div>
      <ol className="umc-install-steps">
        {t.notify.blockedSteps.map((step, i) => (
          <li key={i} className="is-active">
            <span className="umc-install-num" aria-hidden="true">{i + 1}</span>
            <span className="umc-install-body">{step}</span>
          </li>
        ))}
      </ol>
      {stillBlocked && (
        <p className="umc-notify-still" role="alert">{t.notify.stillBlocked}</p>
      )}
      <button type="button" className="umc-btn primary full umc-notify-action" onClick={onRecheck}>
        {t.notify.turnedOn}
      </button>
    </section>
  )
}
