// TodayDoses.tsx — the day's medicines for a claimed patient, with "Taken".
// A notification tap arrives with ?dose=<logId>; that row is highlighted and
// scrolled into view (iPhone shows no notification buttons, so this is how
// an iPhone patient marks a dose).
import { useEffect, useRef, useState } from 'react'
import { useTodayDoses } from './data/useTodayDoses'
import { markDoseTaken } from './data/reminderDoses'
import type { Dose, DoseStatus } from './data/doses'
import { Icon } from '../../shared/design/icons'

const STATUS_LABEL: Record<DoseStatus, string> = {
  upcoming: 'Upcoming', due: 'Due', taken: 'Taken', taken_late: 'Taken late', missed: 'Missed',
}
// app status colours (tokens.css): grey upcoming, orange due, green taken, red missed
const STATUS_ACCENT: Record<DoseStatus, string> = {
  upcoming: 'var(--ink-faint)', due: 'var(--warning-700)', taken: 'var(--success-600)', taken_late: 'var(--success-600)', missed: 'var(--error)',
}

export function TodayDoses({ gid, uid, highlightLogId }: { gid: string; uid: string; highlightLogId: string | null }) {
  const { loading, error, doses, dateLabel, nowMinutes } = useTodayDoses(gid)
  const [busy, setBusy] = useState<string | null>(null)       // logId being written
  const [failed, setFailed] = useState<string | null>(null)   // logId whose write failed
  const highlightRef = useRef<HTMLLIElement | null>(null)
  const scrolled = useRef(false)

  useEffect(() => {
    if (scrolled.current || !highlightRef.current) return
    scrolled.current = true
    highlightRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [doses])

  const take = async (dose: Dose) => {
    setBusy(dose.logId); setFailed(null)
    try { await markDoseTaken(gid, uid, dose, nowMinutes) }
    catch (err) { console.error('markDoseTaken failed:', err); setFailed(dose.logId) }
    finally { setBusy(null) }
  }

  return (
    <section className="umc-rem-today" aria-label="Today's medicines">
      <div className="umc-rem-today-head">
        <h2 className="umc-rem-today-title">Today · {dateLabel}</h2>
        {!loading && doses.length > 0 && (
          <p className="umc-rem-today-count">
            {doses.filter((d) => d.status === 'taken' || d.status === 'taken_late').length} of {doses.length} taken
          </p>
        )}
      </div>

      {error ? (
        <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />Couldn't load your medicines. Check your connection and reopen this page.</p>
      ) : loading ? (
        <div className="umc-rem-loading" style={{ flex: 'none', padding: '18px 0' }}><span className="umc-spin" aria-hidden="true" />Loading your medicines…</div>
      ) : doses.length === 0 ? (
        <div className="umc-empty" style={{ padding: '32px 20px' }}>
          <span className="umc-empty-ico"><Icon name="medication" size={56} /></span>
          <p className="umc-empty-t">No medicines are scheduled for today</p>
          <p className="umc-empty-s">When your doctor adds one, it appears here.</p>
        </div>
      ) : (
        <ul className="umc-rem-doses">
          {doses.map((d) => {
            const done = d.status === 'taken' || d.status === 'taken_late'
            const hl = d.logId === highlightLogId
            return (
              <li
                key={d.logId}
                ref={hl ? highlightRef : undefined}
                className={`umc-rem-dose is-${d.status}${hl ? ' is-highlight' : ''}`}
              >
                <div className="umc-rem-dose-time">{d.scheduledTime}</div>
                <div className="umc-rem-dose-body">
                  <div className="umc-rem-dose-name">{d.medicationName}</div>
                  {d.dosage && <div className="umc-rem-dose-sub">{d.dosage}</div>}
                  <div className="umc-rem-dose-status">
                    <span className="umc-badge sm" style={{ ['--accent' as string]: STATUS_ACCENT[d.status] }}>{STATUS_LABEL[d.status]}</span>
                    {!d.reminderEnabled && <span className="umc-badge sm" style={{ ['--accent' as string]: 'var(--ink-faint)' }}>No reminder</span>}
                  </div>
                  {failed === d.logId && <div className="umc-rem-dose-err" role="alert">Couldn't save. Try again.</div>}
                </div>
                {done ? (
                  <div className="umc-rem-dose-check" aria-label="Taken">
                    <Icon name="check" size={22} />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="umc-btn sm tonal"
                    style={{ ['--accent' as string]: 'var(--success-600)' }}
                    disabled={busy === d.logId}
                    onClick={() => take(d)}
                    aria-label={`Mark ${d.medicationName} at ${d.scheduledTime} as taken`}
                  >
                    {busy === d.logId ? <span className="umc-spin" aria-hidden="true" /> : <><Icon name="check" size={18} />Taken</>}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
