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
import { useStrings } from './i18n/useStrings'

// TabletTile._getTextColor: only taken/taken_late/missed get a colour
// (green/orange/red) — pending/due/upcoming are all just the ink colour.
// A finished course is dimmed, as the app dims it (drawer.dart, grey.400).
const STATUS_ACCENT: Record<DoseStatus, string> = {
  upcoming: 'var(--ink)', due: 'var(--ink)', taken: 'var(--success-600)', taken_late: 'var(--warning-700)', missed: 'var(--error)',
  completed: 'var(--ink-faint)',
}

export function TodayDoses({ gid, uid, highlightLogId }: { gid: string; uid: string; highlightLogId: string | null }) {
  const t = useStrings()
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

  // A finished course is on the list but is not a dose: it is not counted.
  const toTake = doses.filter((d) => d.status !== 'completed')

  return (
    <section className="umc-rem-today" aria-label={t.doses.sectionLabel}>
      <div className="umc-rem-today-head">
        <h2 className="umc-rem-today-title">{t.doses.today(dateLabel)}</h2>
        {!loading && toTake.length > 0 && (
          <p className="umc-rem-today-count">
            {t.doses.takenCount(toTake.filter((d) => d.status === 'taken' || d.status === 'taken_late').length, toTake.length)}
          </p>
        )}
      </div>

      {error ? (
        <p className="umc-rem-error" role="alert"><Icon name="warning" size={18} />{t.doses.loadError}</p>
      ) : loading ? (
        <div className="umc-rem-loading" style={{ flex: 'none', padding: '18px 0' }}><span className="umc-spin" aria-hidden="true" />{t.doses.loading}</div>
      ) : doses.length === 0 ? (
        <div className="umc-empty" style={{ padding: '32px 20px' }}>
          <span className="umc-empty-ico"><Icon name="medication" size={56} /></span>
          <p className="umc-empty-t">{t.doses.emptyTitle}</p>
          <p className="umc-empty-s">{t.doses.emptySub}</p>
        </div>
      ) : (
        <ul className="umc-rem-doses">
          {doses.map((d) => {
            const over = d.status === 'completed'
            const done = d.status === 'taken' || d.status === 'taken_late'
            const hl = d.logId === highlightLogId
            const busyHere = busy === d.logId
            // a finished course says so where a dose gives its time
            const sub = [d.dosage, over ? t.doses.status.completed : d.scheduledTime].filter(Boolean).join(' • ')
            return (
              <li key={d.logId} ref={hl ? highlightRef : undefined}>
                <button
                  type="button"
                  className={`umc-rem-dose is-${d.status}${hl ? ' is-highlight' : ''}`}
                  style={{ ['--accent' as string]: STATUS_ACCENT[d.status] }}
                  disabled={over || done || busyHere}
                  onClick={() => { if (!over) void take(d) }}
                  aria-label={over ? t.doses.ariaOver(d.medicationName, t.doses.status.completed)
                    : done ? t.doses.ariaDone(d.medicationName, d.scheduledTime, t.doses.status[d.status])
                    : t.doses.ariaMark(d.medicationName, d.scheduledTime)}
                >
                  <div className="umc-rem-dose-name">
                    {d.medicationName}
                    {busyHere && <span className="umc-spin" aria-hidden="true" />}
                  </div>
                  {sub && (
                    <div className="umc-rem-dose-sub">
                      {sub}
                      {!over && !d.reminderEnabled && <span className="umc-rem-dose-noremind"> · {t.doses.noReminder}</span>}
                    </div>
                  )}
                  {failed === d.logId && <div className="umc-rem-dose-err" role="alert">{t.doses.saveFailed}</div>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
