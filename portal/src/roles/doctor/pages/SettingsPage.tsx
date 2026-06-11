import { useEffect, useState } from 'react'
import { Page, PageHeader, SectionHeading, Card, Button, Field, Loading } from '../../../shared/design/primitives'
import { Icon } from '../../../shared/design/icons'
import { useConsultationSettings } from '../data/useConsultationSettings'
import { saveConsultationSettings, type SaveSettingsInput } from '../data/settingsActions'

/* Working days persist as full names in Firestore (mirrors the phone app's
 * ConsultationService convention); chips show 2-letter abbreviations. */
const DAYS: { abbr: string; full: string }[] = [
  { abbr: 'Mo', full: 'Monday' },
  { abbr: 'Tu', full: 'Tuesday' },
  { abbr: 'We', full: 'Wednesday' },
  { abbr: 'Th', full: 'Thursday' },
  { abbr: 'Fr', full: 'Friday' },
  { abbr: 'Sa', full: 'Saturday' },
  { abbr: 'Su', full: 'Sunday' },
]
const ALL_FULL = DAYS.map((d) => d.full)
const SLOT_DURATIONS = [15, 30, 45, 60]

export function SettingsPage() {
  const { data, loading } = useConsultationSettings()

  // Local form state, seeded from the loaded settings doc.
  const [accepting, setAccepting] = useState(true)
  const [clinicName, setClinicName] = useState('')
  const [clinicAddress, setClinicAddress] = useState('')
  const [fee, setFee] = useState('')
  const [slotDuration, setSlotDuration] = useState(30)
  const [workingDays, setWorkingDays] = useState<string[]>([])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')

  const [seeded, setSeeded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  // Seed the form once loading finishes (data may be null if no doc exists yet).
  useEffect(() => {
    if (loading || seeded) return
    if (data) {
      setAccepting(data.isAcceptingAppointments)
      setClinicName(data.clinicName)
      setClinicAddress(data.clinicAddress)
      setFee(data.fee ? String(data.fee) : '')
      setSlotDuration(data.slotDuration || 30)
      setWorkingDays(data.workingDays ?? [])
      if (data.startTime) setStartTime(data.startTime)
      if (data.endTime) setEndTime(data.endTime)
    }
    setSeeded(true)
  }, [loading, data, seeded])

  const toggleDay = (full: string) => {
    setWorkingDays((prev) =>
      prev.includes(full) ? prev.filter((d) => d !== full) : [...prev, full],
    )
  }
  const allOn = workingDays.length === DAYS.length
  const toggleAll = () => setWorkingDays(allOn ? [] : [...ALL_FULL])

  const feeNum = Number(fee)
  const canSave =
    clinicName.trim() !== '' &&
    clinicAddress.trim() !== '' &&
    feeNum > 0 &&
    workingDays.length >= 1

  async function handleSave() {
    if (!canSave || saving) return
    setSaving(true)
    setMessage(null)
    try {
      // Persist working days as full names, ordered Mon→Sun for consistency.
      const orderedDays = ALL_FULL.filter((d) => workingDays.includes(d))
      const input: SaveSettingsInput = {
        fee: Number(feeNum),
        slotDuration: Number(slotDuration),
        workingDays: orderedDays,
        startTime,
        endTime,
        clinicName: clinicName.trim(),
        clinicAddress: clinicAddress.trim(),
        isAcceptingAppointments: accepting,
        // Map/location picking is out of web scope — clinicLatitude/Longitude
        // left undefined so the action skips writing clinicLocation.
      }
      await saveConsultationSettings(input)
      setMessage({ ok: true, text: 'Settings saved' })
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Error saving settings' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <Page>
      <PageHeader eyebrow="Your Clinic" title="Consultation Settings" subtitle="Manage your availability, clinic details and schedule." />

      <div className="umc-stack" style={{ gap: 20, maxWidth: 760 }}>
        {/* 1. Availability */}
        <Card section>
          <SectionHeading>Availability</SectionHeading>
          <p className="umc-subtitle" style={{ marginTop: 6 }}>
            Control whether patients can book with you right now.
          </p>
          <div className="umc-flex" style={{ justifyContent: 'space-between', marginTop: 14 }}>
            <div>
              <div className="umc-row-lab" style={{ fontWeight: 600 }}>Accepting Appointments</div>
              <p className="umc-subtitle" style={{ marginTop: 4 }}>
                {accepting
                  ? 'Patients can currently book consultations with you.'
                  : 'Appointments are paused. Toggle to start accepting bookings.'}
              </p>
            </div>
            <div className="umc-flex" style={{ gap: 10 }}>
              <span className="umc-row-val">{accepting ? 'Yes' : 'No'}</span>
              <button
                type="button"
                aria-label="Toggle accepting appointments"
                className={`umc-switch${accepting ? ' on' : ''}`}
                onClick={() => setAccepting((v) => !v)}
              />
            </div>
          </div>
        </Card>

        {/* 2. Clinic Details */}
        <Card section>
          <SectionHeading>Clinic Details</SectionHeading>
          <p className="umc-subtitle" style={{ marginTop: 6 }}>
            Shown to patients when they book and view appointments.
          </p>
          <div className="umc-stack" style={{ marginTop: 14 }}>
            <Field label="Clinic Name" error={clinicName.trim() === ''}>
              <input
                className="umc-input"
                placeholder="e.g. Apollo Clinic"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
              />
            </Field>
            {/* Map / location picking is out of web scope — address is free text only. */}
            <Field label="Clinic Address" error={clinicAddress.trim() === ''}>
              <textarea
                className="umc-textarea"
                placeholder="Clinic address"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
              />
            </Field>
          </div>
        </Card>

        {/* 3. Consultation Settings */}
        <Card section>
          <SectionHeading>Consultation Settings</SectionHeading>
          <p className="umc-subtitle" style={{ marginTop: 6 }}>
            Set your fee and how long each appointment slot lasts.
          </p>
          <div className="umc-grid c2" style={{ marginTop: 14 }}>
            <Field label="Doctor Fee" error={!(feeNum > 0)}>
              <input
                className="umc-input"
                type="number"
                min={0}
                placeholder="500"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
            </Field>
            <Field label="Slot Duration">
              <select
                className="umc-select"
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
              >
                {SLOT_DURATIONS.map((n) => (
                  <option key={n} value={n}>{n} minutes</option>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        {/* 4. Schedule */}
        <Card section>
          <SectionHeading>Schedule</SectionHeading>
          <p className="umc-subtitle" style={{ marginTop: 6 }}>
            Choose the days and hours when you take consultations.
          </p>

          <Field label="Working Days" error={workingDays.length === 0}>
            <div className="umc-flex" style={{ flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className={`umc-chip${allOn ? ' on' : ''}`}
                onClick={toggleAll}
              >
                All
              </button>
              {DAYS.map((d) => {
                const on = workingDays.includes(d.full)
                return (
                  <button
                    key={d.full}
                    type="button"
                    className={`umc-chip${on ? ' on' : ''}`}
                    onClick={() => toggleDay(d.full)}
                  >
                    {d.abbr}
                  </button>
                )
              })}
            </div>
          </Field>

          <div className="umc-grid c2" style={{ marginTop: 16 }}>
            <Field label="Start Time">
              <input
                className="umc-input"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </Field>
            <Field label="End Time">
              <input
                className="umc-input"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </Field>
          </div>
        </Card>

        {/* 5. Save */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Button
            pill
            loading={saving}
            disabled={!canSave}
            icon={<Icon name="check" size={18} />}
            onClick={handleSave}
          >
            Save Changes
          </Button>
          {!canSave && (
            <span className="umc-subtitle">Complete required fields</span>
          )}
          {message && (
            <span
              className="umc-flex"
              style={{ gap: 6, color: message.ok ? 'var(--success-600)' : 'var(--error-400)', fontWeight: 600 }}
            >
              <Icon name={message.ok ? 'checkCircle' : 'warning'} size={18} />
              {message.text}
            </span>
          )}
        </div>
      </div>
    </Page>
  )
}
