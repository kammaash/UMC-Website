import { useState } from 'react'
import {
  Page, PageHeader, SectionHeading, Card, Button, Badge, Stat,
  EmptyState, Loading, Money,
} from '../../../shared/design/primitives'
import { Icon } from '../../../shared/design/icons'
import { statusMeta, formatDate, formatTime, todayISO } from './format'
import { useDoctorAppointments } from '../data/useAppointments'
import { useFinanceSummary } from '../data/useFinance'
import { confirmAppointment, rejectAppointment } from '../data/appointmentActions'
import { useAuth } from '../../../shared/auth/AuthContext'
import type { Appointment, AppointmentStatus } from '../data/types'
import type { ReactNode } from 'react'

/* Statuses that count as a "live" appointment for today's summary tiles. */
const ACTIVE_STATUSES: AppointmentStatus[] = [
  'awaiting_doctor_confirmation', 'confirmed', 'active', 'arrived',
]

/* Hero priority — mirrors DoctorActiveAppointmentBanner: lower = higher priority. */
const HERO_PRIORITY: Record<string, number> = {
  arrived: 0,
  awaiting_doctor_confirmation: 1,
  active: 2,
  confirmed: 3,
}

function firstName(full?: string | null): string {
  if (!full) return ''
  return full.trim().split(/\s+/)[0] ?? ''
}

export function HomePage() {
  const appts = useDoctorAppointments()
  const finance = useFinanceSummary()
  const { profile } = useAuth()

  const today = todayISO()
  const todays = appts.data.filter((a) => a.date === today)

  // Summary metrics (today only).
  const liveToday = todays.filter((a) => ACTIVE_STATUSES.includes(a.status))
  const apptCount = liveToday.length
  const potential = liveToday.reduce((sum, a) => sum + (a.fee ?? 0), 0)
  const awaitingCount = todays.filter(
    (a) => a.status === 'awaiting_doctor_confirmation',
  ).length

  // Hero: highest-priority today appointment, then earliest timeSlot.
  const heroCandidates = todays
    .filter((a) => a.status in HERO_PRIORITY)
    .sort((a, b) => {
      const pa = HERO_PRIORITY[a.status]
      const pb = HERO_PRIORITY[b.status]
      if (pa !== pb) return pa - pb
      return (a.timeSlot || '').localeCompare(b.timeSlot || '')
    })
  const hero = heroCandidates[0]

  // Schedule: all of today's appts, sorted by time.
  const schedule = [...todays].sort((a, b) =>
    (a.timeSlot || '').localeCompare(b.timeSlot || ''),
  )

  // UserProfile is typed minimally (just `role`); the users/{uid} doc also
  // carries fullName at runtime (see DoctorProfile), so read it via a cast.
  const fullName = (profile as { fullName?: string } | null)?.fullName
  const name = firstName(fullName)

  return (
    <Page>
      <PageHeader
        eyebrow="Today at a glance"
        title={name ? `Welcome, ${name}` : 'Welcome back'}
      />

      {/* ── Summary tiles ─────────────────────────────────────────── */}
      <Card className="umc-grid c3">
        <Stat
          icon={<Icon name="eventAvailable" />}
          value={appts.loading ? '—' : apptCount}
          label="Appointments"
          accent="#42A5F5"
        />
        <Stat
          icon={<Icon name="payments" />}
          value={appts.loading ? '—' : <Money value={potential} />}
          label="Potential"
          accent="#4CAF50"
        />
        <Stat
          icon={<Icon name="factCheck" />}
          value={appts.loading ? '—' : awaitingCount}
          label="Awaiting"
          accent="#FFA726"
        />
      </Card>

      {/* Subtle lifetime-revenue line. */}
      {!finance.loading && finance.data && (
        <p
          style={{
            fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-faint)',
            margin: '10px 2px 0', letterSpacing: '.01em',
          }}
        >
          Lifetime revenue{' '}
          <span style={{ fontFamily: 'var(--serif)', color: 'var(--ink-soft)' }}>
            <Money value={finance.data.totalRevenue} />
          </span>
        </p>
      )}

      {/* ── Active appointment hero ───────────────────────────────── */}
      {appts.loading ? (
        <Loading />
      ) : hero ? (
        <HeroCard key={hero.id} appt={hero} />
      ) : (
        <EmptyState
          icon={<Icon name="eventAvailable" size={64} />}
          title="Nothing on today"
          subtitle="New bookings and arrivals will appear here."
        />
      )}

      {/* ── Today's schedule ──────────────────────────────────────── */}
      <SectionHeading>Today's schedule</SectionHeading>
      {appts.loading ? (
        <Loading />
      ) : schedule.length === 0 ? (
        <EmptyState
          icon={<Icon name="schedule" size={64} />}
          title="No appointments today"
          subtitle="Confirmed and upcoming visits show up here."
        />
      ) : (
        <div className="umc-stack">
          {schedule.map((a) => {
            const meta = statusMeta(a.status)
            return (
              <Card key={a.id} flat style={{ padding: 16 }}>
                <div className="umc-flex" style={{ justifyContent: 'space-between' }}>
                  <div className="umc-flex" style={{ minWidth: 0, gap: 16 }}>
                    <span
                      style={{
                        fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
                        color: 'var(--ink-soft)', whiteSpace: 'nowrap',
                      }}
                    >
                      {formatTime(a.timeSlot)}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {a.patientName}
                      </div>
                      {a.reasonForVisit && (
                        <div
                          style={{
                            fontFamily: 'var(--sans)', fontSize: 12.5,
                            color: 'var(--ink-faint)', marginTop: 2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {a.reasonForVisit}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge label={meta.label} accent={meta.color} sm />
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </Page>
  )
}

/* ── Hero card for the most actionable appointment ───────────────── */
function HeroCard({ appt }: { appt: Appointment }) {
  const [busy, setBusy] = useState(false)
  const meta = statusMeta(appt.status)
  const isAwaiting = appt.status === 'awaiting_doctor_confirmation'

  const accept = async () => {
    setBusy(true)
    try { await confirmAppointment(appt.id) } finally { setBusy(false) }
  }
  const reject = async () => {
    setBusy(true)
    try {
      await rejectAppointment({
        id: appt.id, doctorUID: appt.doctorUID, patientUID: appt.patientUID,
        date: appt.date, timeSlot: appt.timeSlot,
      })
    } finally { setBusy(false) }
  }

  return (
    <Card
      style={{
        boxShadow: `var(--neo-raised), 0 10px 24px ${meta.color}1f`,
        borderColor: `color-mix(in srgb, ${meta.color} 22%, var(--line))`,
      }}
    >
      <div className="umc-flex" style={{ alignItems: 'flex-start', gap: 14 }}>
        <span
          style={{
            width: 52, height: 52, flexShrink: 0, borderRadius: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `color-mix(in srgb, ${meta.color} 16%, var(--card))`,
            color: meta.color,
          }}
        >
          <Icon name={appt.status === 'arrived' ? 'hospital' : 'person'} size={24} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 700,
              letterSpacing: '.04em', color: meta.color, margin: 0,
            }}
          >
            {meta.label}
          </p>
          <h3
            style={{
              fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 400,
              color: 'var(--ink)', margin: '6px 0 0',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {appt.patientName}
          </h3>
        </div>
        <Badge label={meta.label} accent={meta.color} dot />
      </div>

      {/* Metadata chips */}
      <div
        className="umc-flex"
        style={{ flexWrap: 'wrap', gap: 10, marginTop: 18 }}
      >
        <MetaChip icon="calendar" label={formatDate(appt.date, todayISO())} accent={meta.color} />
        <MetaChip icon="schedule" label={formatTime(appt.timeSlot)} />
        <MetaChip icon="rupee" label={<Money value={appt.fee} />} />
      </div>

      {isAwaiting && (
        <div className="umc-flex" style={{ gap: 12, marginTop: 18 }}>
          <Button
            variant="tonal" accent="#43A047" full
            icon={<Icon name="check" size={18} />}
            loading={busy} disabled={busy} onClick={accept}
          >
            Accept
          </Button>
          <Button
            variant="outline" accent="#EF5350" full
            icon={<Icon name="close" size={18} />}
            loading={busy} disabled={busy} onClick={reject}
          >
            Reject
          </Button>
        </div>
      )}
    </Card>
  )
}

function MetaChip({ icon, label, accent }: { icon: string; label: ReactNode; accent?: string }) {
  const color = accent ?? 'var(--ink-soft)'
  return (
    <span
      className="umc-flex"
      style={{
        gap: 8, padding: '8px 12px', borderRadius: 'var(--r-md)',
        background: 'var(--surface-sunken, #f3f3f3)',
        fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, color,
      }}
    >
      <Icon name={icon} size={15} color={color} />
      {label}
    </span>
  )
}
