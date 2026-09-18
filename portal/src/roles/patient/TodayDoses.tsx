// TodayDoses.tsx — the day's medicines for a claimed patient. The tile IS
// the button (TabletTile in the app): tap it to mark taken; tapping again
// does nothing once taken, same as the app blocking "untaking". Status is
// the tile's own text colour + a strikethrough — no separate badge, exactly
// how the app's TabletTile._getTextColor / _shouldStrikethrough read.
import { useEffect, useRef, useState } from 'react'
import { useTodayDoses } from './data/useTodayDoses'
import { markDoseTaken } from './data/reminderDoses'
import type { Dose, DoseStatus } from './data/doses'
import { Icon } from '../../shared/design/icons'

const STATUS_LABEL: Record<DoseStatus, string> = {
  upcoming: 'Upcoming', due: 'Due', taken: 'Taken', taken_late: 'Taken late', missed: 'Missed',
}
// TabletTile._getTextColor: only taken/taken_late/missed get a colour
// (green/orange/red) — pending/due/upcoming are all just the ink colour.
const STATUS_ACCENT: Record<DoseStatus, string> = {
  upcoming: 'var(--ink)', due: 'var(--ink)', taken: 'var(--success-600)', taken_late: 'var(--warning-700)', missed: 'var(--error)',
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
            const busyHere = busy === d.logId
            const sub = [d.dosage, d.scheduledTime].filter(Boolean).join(' • ')
            return (
              <li key={d.logId} ref={hl ? highlightRef : undefined}>
                <button
                  type="button"
                  className={`umc-rem-dose is-${d.status}${hl ? ' is-highlight' : ''}`}
                  style={{ ['--accent' as string]: STATUS_ACCENT[d.status] }}
                  disabled={done || busyHere}
                  onClick={() => take(d)}
                  aria-label={done ? `${d.medicationName} at ${d.scheduledTime}, ${STATUS_LABEL[d.status]}` : `Mark ${d.medicationName} at ${d.scheduledTime} as taken`}
                >
                  <div className="umc-rem-dose-name">
                    {d.medicationName}
                    {busyHere && <span className="umc-spin" aria-hidden="true" />}
                  </div>
                  {sub && (
                    <div className="umc-rem-dose-sub">
                      {sub}
                      {!d.reminderEnabled && <span className="umc-rem-dose-noremind"> · No reminder</span>}
                    </div>
                  )}
                  {failed === d.logId && <div className="umc-rem-dose-err" role="alert">Couldn't save. Try again.</div>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
