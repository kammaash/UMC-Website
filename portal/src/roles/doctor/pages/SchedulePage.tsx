/*
 * Doctor → Schedule.
 *
 * WEB ADAPTATION: the Flutter app (doctor_appointments_screen.dart) renders a
 * month calendar grid with per-day selection. For the web portal we adapt this
 * to a clean *agenda list* — a segmented filter (Upcoming / Awaiting / Today /
 * Past·Cancelled) over a vertical stack of appointment cards. Card layout,
 * status→color, status→actions, and copy stay faithful to the Flutter detail
 * screen + appointment_status_actions.dart; only the date-navigation surface
 * differs (list/filter instead of a calendar grid).
 *
 * Data + writes go exclusively through the doctor data layer — never firebase.
 * Lists are driven by onSnapshot (useDoctorAppointments), so actions reflect
 * live with no manual refresh.
 */
import { useMemo, useState } from 'react'
import {
  Page, PageHeader, Card, Button, Badge, EmptyState, Loading, Money, Modal,
} from '../../../shared/design/primitives'
import { Icon } from '../../../shared/design/icons'
import {
  statusMeta, availableActions, ACTION_LABEL, ACTION_COLOR,
  formatDate, formatTime, todayISO, type ApptActionKey,
} from './format'
import type { Appointment } from '../data/types'
import { useDoctorAppointments } from '../data/useAppointments'
import {
  confirmAppointment, markDoneByDoctor, rejectAppointment,
  cancelAppointment, markNoShow, dismissAppointment,
} from '../data/appointmentActions'

/* ── Tabs ──────────────────────────────────────────────────────── */
type TabKey = 'upcoming' | 'awaiting' | 'today' | 'past'
const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'awaiting', label: 'Awaiting' },
  { key: 'today', label: 'Today' },
  { key: 'past', label: 'Past/Cancelled' },
]

const UPCOMING_STATUSES = new Set(['confirmed', 'active', 'arrived'])
const PAST_STATUSES = new Set([
  'completed', 'cancelled_by_patient', 'cancelled_by_doctor', 'patient_no_show', 'expired',
])

/** asc by (date, timeSlot) */
function byDateTimeAsc(a: Appointment, b: Appointment): number {
  return (a.date + a.timeSlot).localeCompare(b.date + b.timeSlot)
}

function filterForTab(all: Appointment[], tab: TabKey, today: string): Appointment[] {
  switch (tab) {
    case 'upcoming':
      return all
        .filter((a) => UPCOMING_STATUSES.has(a.status) && a.date >= today)
        .sort(byDateTimeAsc)
    case 'awaiting':
      return all
        .filter((a) => a.status === 'awaiting_doctor_confirmation')
        .sort(byDateTimeAsc)
    case 'today':
      return all.filter((a) => a.date === today).sort(byDateTimeAsc)
    case 'past':
      return all
        .filter((a) => PAST_STATUSES.has(a.status))
        .sort((a, b) => -byDateTimeAsc(a, b)) // desc
  }
}

/* destructive actions get a confirm modal */
const DESTRUCTIVE: Record<string, { title: string; subtitle: string }> = {
  reject: { title: 'Reject this appointment?', subtitle: 'The patient will be notified and any held payment refunded.' },
  cancel: { title: 'Cancel this appointment?', subtitle: 'The patient will be notified and any held payment refunded.' },
  noShow: { title: 'Mark patient as no-show?', subtitle: 'This records the patient did not attend the consultation.' },
}

type ApptRef = Pick<Appointment, 'id' | 'doctorUID' | 'patientUID' | 'date' | 'timeSlot'>
function refOf(a: Appointment): ApptRef {
  return { id: a.id, doctorUID: a.doctorUID, patientUID: a.patientUID, date: a.date, timeSlot: a.timeSlot }
}

/* ── Page ──────────────────────────────────────────────────────── */
export function SchedulePage() {
  const { data: appointments, loading } = useDoctorAppointments()
  const today = todayISO()

  const [tab, setTab] = useState<TabKey>('upcoming')
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [detail, setDetail] = useState<Appointment | null>(null)
  const [confirm, setConfirm] = useState<{ appt: Appointment; action: ApptActionKey } | null>(null)

  const list = useMemo(() => filterForTab(appointments, tab, today), [appointments, tab, today])

  // keep the open detail modal in sync with live snapshot data
  const detailLive = detail ? appointments.find((a) => a.id === detail.id) ?? detail : null

  function setBusyFor(id: string, on: boolean) {
    setBusy((prev) => {
      const next = new Set(prev)
      if (on) next.add(id); else next.delete(id)
      return next
    })
  }

  async function run(a: Appointment, action: ApptActionKey) {
    const ref = refOf(a)
    setBusyFor(a.id, true)
    try {
      switch (action) {
        case 'confirm': await confirmAppointment(a.id); break
        case 'reject': await rejectAppointment(ref); break
        case 'cancel': await cancelAppointment(ref); break
        case 'markDone': await markDoneByDoctor(ref); break
        case 'noShow': await markNoShow(ref); break
        case 'dismiss': await dismissAppointment(a.id); break
      }
    } catch (err) {
      console.error(`appointment action "${action}" failed`, err)
    } finally {
      setBusyFor(a.id, false)
    }
  }

  /** route an action through the confirm modal if destructive, else run it */
  function trigger(a: Appointment, action: ApptActionKey) {
    if (action in DESTRUCTIVE) setConfirm({ appt: a, action })
    else void run(a, action)
  }

  function ActionButtons({ a }: { a: Appointment }) {
    const actions = availableActions(a)
    if (actions.length === 0) return null
    const isBusy = busy.has(a.id)
    return (
      <div className="umc-flex" style={{ flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
        {actions.map((k) => (
          <Button
            key={k}
            sm
            variant={k === 'dismiss' ? 'outline' : 'tonal'}
            accent={ACTION_COLOR[k]}
            loading={isBusy}
            disabled={isBusy}
            onClick={(e) => { e.stopPropagation(); trigger(a, k) }}
          >
            {ACTION_LABEL[k]}
          </Button>
        ))}
      </div>
    )
  }

  function ApptCard({ a }: { a: Appointment }) {
    const meta = statusMeta(a.status)
    return (
      <Card pressable onClick={() => setDetail(a)}>
        <div className="umc-flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
            {a.patientName || 'Patient'}
          </span>
          <Badge label={meta.label} accent={meta.color} dot />
        </div>

        <div
          className="umc-flex"
          style={{ flexWrap: 'wrap', gap: 8, marginTop: 8, fontSize: 13, color: 'var(--ink-soft)' }}
        >
          <span style={{ fontFamily: 'var(--mono)' }}>{formatDate(a.date, today)}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ fontFamily: 'var(--mono)' }}>{formatTime(a.timeSlot)}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <Money value={a.fee} />
          {a.clinicName && <><span style={{ opacity: 0.5 }}>·</span><span>{a.clinicName}</span></>}
        </div>

        {a.reasonForVisit && (
          <p style={{ margin: '8px 0 0', fontSize: 13, fontStyle: 'italic', color: 'var(--ink-faint)' }}>
            Reason: {a.reasonForVisit}
          </p>
        )}

        <ActionButtons a={a} />
      </Card>
    )
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Appointments"
        title="Schedule"
        subtitle="Your consultations across all dates."
      />

      <div className="umc-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`umc-tab${tab === t.key ? ' on' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : list.length === 0 ? (
        <EmptyState icon={<Icon name="calendar" size={64} />} title="No appointments here" />
      ) : (
        <div className="umc-stack">
          {list.map((a) => <ApptCard key={a.id} a={a} />)}
        </div>
      )}

      {/* ── Detail modal ── */}
      {detailLive && (
        <Modal
          title={detailLive.patientName || 'Appointment'}
          subtitle={`${formatDate(detailLive.date, today)} · ${formatTime(detailLive.timeSlot)}`}
          onClose={() => setDetail(null)}
        >
          <div className="umc-stack" style={{ gap: 10 }}>
            <div className="umc-flex" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-soft)' }}>Status</span>
              <Badge label={statusMeta(detailLive.status).label} accent={statusMeta(detailLive.status).color} dot />
            </div>
            <hr className="umc-divider" />
            <DetailLine label="Patient" value={detailLive.patientName || '—'} />
            <DetailLine label="Date" value={formatDate(detailLive.date, today)} mono />
            <DetailLine label="Time" value={formatTime(detailLive.timeSlot)} mono />
            <DetailLine label="Fee" value={<Money value={detailLive.fee} />} />
            <DetailLine label="Clinic" value={detailLive.clinicName || '—'} />
            {detailLive.reasonForVisit && (
              <DetailLine label="Reason" value={detailLive.reasonForVisit} />
            )}
          </div>
          <div style={{ marginTop: 4 }}>
            <ActionButtons a={detailLive} />
          </div>
        </Modal>
      )}

      {/* ── Destructive confirm modal ── */}
      {confirm && (
        <Modal
          title={DESTRUCTIVE[confirm.action].title}
          subtitle={DESTRUCTIVE[confirm.action].subtitle}
          onClose={() => setConfirm(null)}
        >
          <div className="umc-flex" style={{ justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Keep</Button>
            <Button
              variant="solid"
              accent={ACTION_COLOR[confirm.action]}
              loading={busy.has(confirm.appt.id)}
              onClick={() => {
                const { appt, action } = confirm
                setConfirm(null)
                void run(appt, action)
              }}
            >
              {ACTION_LABEL[confirm.action]}
            </Button>
          </div>
        </Modal>
      )}
    </Page>
  )
}

function DetailLine({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="umc-flex" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-soft)' }}>{label}</span>
      <span style={{ fontFamily: mono ? 'var(--mono)' : 'var(--serif)', fontSize: 14, color: 'var(--ink)', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  )
}
