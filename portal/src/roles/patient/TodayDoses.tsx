// TodayDoses.tsx — the day's medicines for a claimed patient, with "Taken".
// A notification tap arrives with ?dose=<logId>; that row is highlighted and
// scrolled into view (iPhone shows no notification buttons, so this is how
// an iPhone patient marks a dose).
import { useEffect, useRef, useState } from 'react'
import { useTodayDoses } from './data/useTodayDoses'
import { markDoseTaken } from './data/reminderDoses'
import type { Dose, DoseStatus } from './data/doses'

const STATUS_LABEL: Record<DoseStatus, string> = {
  upcoming: 'Upcoming', due: 'Due', taken: 'Taken', taken_late: 'Taken late', missed: 'Missed',
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
        <p className="umc-rem-card-label">Today · {dateLabel}</p>
        {!loading && doses.length > 0 && (
          <p className="umc-rem-today-count">
            {doses.filter((d) => d.status === 'taken' || d.status === 'taken_late').length} of {doses.length} taken
          </p>
        )}
      </div>

      {error ? (
        <p className="umc-rem-error" role="alert">Couldn't load your medicines. Check your connection and reopen this page.</p>
      ) : loading ? (
        <p className="umc-rem-lead">Loading your medicines…</p>
      ) : doses.length === 0 ? (
        <p className="umc-rem-lead">No medicines are scheduled for today. When your doctor adds one, it appears here.</p>
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
                    <span className={`umc-rem-pill is-${d.status}`}>{STATUS_LABEL[d.status]}</span>
                    {!d.reminderEnabled && <span className="umc-rem-pill is-muted">No reminder</span>}
                  </div>
                  {failed === d.logId && <div className="umc-rem-dose-err" role="alert">Couldn't save. Try again.</div>}
                </div>
                {done ? (
                  <div className="umc-rem-dose-check" aria-label="Taken">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="umc-rem-dose-btn"
                    disabled={busy === d.logId}
                    onClick={() => take(d)}
                    aria-label={`Mark ${d.medicationName} at ${d.scheduledTime} as taken`}
                  >
                    {busy === d.logId ? <span className="umc-rem-spinner" aria-hidden="true" /> : 'Taken'}
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
