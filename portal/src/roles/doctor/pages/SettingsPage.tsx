import { useEffect, useState } from 'react'
import { Page, PageHeader, Section, StatusToggleTile, Button, Field, Loading } from '../../../shared/design/primitives'
import { Icon } from '../../../shared/design/icons'
import { useConsultationSettings } from '../data/useConsultationSettings'
import { useDoctorProfile } from '../data/useDoctorProfile'
import { saveConsultationSettings, type SaveSettingsInput } from '../data/settingsActions'
import { ClinicLocationPicker } from '../components/ClinicLocationPicker'

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
  const { data: doctorProfile } = useDoctorProfile() // for the picker's region fallback

  // Local form state, seeded from the loaded settings doc.
  const [accepting, setAccepting] = useState(true)
  const [clinicName, setClinicName] = useState('')
  const [clinicAddress, setClinicAddress] = useState('')
  const [clinicLat, setClinicLat] = useState<number | null>(null)
  const [clinicLng, setClinicLng] = useState<number | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
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
      setClinicLat(data.clinicLocation ? data.clinicLocation.latitude : null)
      setClinicLng(data.clinicLocation ? data.clinicLocation.longitude : null)
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
        clinicLatitude: clinicLat,
        clinicLongitude: clinicLng,
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
        <Section
          title="Availability"
          subtitle="Control whether patients can book with you right now."
        >
          <StatusToggleTile
            label="Accepting Appointments"
            value={accepting}
            onToggle={() => setAccepting((v) => !v)}
            activeDescription="Patients can currently book consultations with you."
            inactiveDescription="Appointments are paused. Toggle to start accepting bookings."
            activeLabel="Yes"
            inactiveLabel="No"
            activeIcon={<Icon name="eventAvailable" size={24} />}
            inactiveIcon={<Icon name="eventBusy" size={24} />}
            accent="#43A047"
          />
        </Section>

        {/* 2. Clinic Details */}
        <Section
          title="Clinic Details"
          subtitle="Shown to patients when they book and view appointments."
        >
          <div className="umc-stack">
            <Field label="Clinic Name" error={clinicName.trim() === ''}>
              <input
                className="umc-input"
                placeholder="e.g. Apollo Clinic"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
              />
            </Field>
            {/* Address is set by picking a location on the map (picker-only). */}
            <Field label="Clinic Address" error={clinicAddress.trim() === ''}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div
                  style={{
                    flex: 1, minWidth: 220, minHeight: 44, padding: '12px 14px',
                    borderRadius: 'var(--r-sm)', background: 'var(--surface-sunken)',
                    color: clinicAddress.trim() === '' ? 'var(--ink-faint)' : 'var(--ink)',
                    fontSize: 14, lineHeight: 1.5,
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}
                >
                  <span>{clinicAddress.trim() === '' ? 'No location set yet' : clinicAddress}</span>
                  {clinicLat != null && clinicLng != null && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--success-600)' }}>
                      <Icon name="location" size={13} /> Location set
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  sm
                  icon={<Icon name="location" size={16} />}
                  onClick={() => setPickerOpen(true)}
                >
                  {clinicAddress.trim() === '' ? 'Set clinic location' : 'Change location'}
                </Button>
              </div>
            </Field>
          </div>
        </Section>

        {/* 3. Consultation Settings */}
        <Section
          title="Consultation Settings"
          subtitle="Set your fee and how long each appointment slot lasts."
        >
          <div className="umc-grid c2">
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
        </Section>

        {/* 4. Schedule */}
        <Section
          title="Schedule"
          subtitle="Choose the days and hours when you take consultations."
        >
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
        </Section>

        {/* 5. Save — multi-state pill, mirrors the app's SaveChangesTile */}
        <div className="umc-save">
          <Button
            pill
            loading={saving}
            disabled={!canSave}
            icon={<Icon name="check" size={18} />}
            onClick={handleSave}
          >
            {saving ? 'Saving Changes' : 'Save Changes'}
          </Button>
          {!canSave && !saving && (
            <span className="umc-save-hint">Complete required fields to save</span>
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

      {pickerOpen && (
        <ClinicLocationPicker
          initialAddress={clinicAddress}
          initialLat={clinicLat}
          initialLng={clinicLng}
          fallbackState={doctorProfile?.stateOfRegistration ?? null}
          onClose={() => setPickerOpen(false)}
          onConfirm={(r) => {
            setClinicAddress(r.address)
            setClinicLat(Number.isNaN(r.lat) ? null : r.lat)
            setClinicLng(Number.isNaN(r.lng) ? null : r.lng)
            setPickerOpen(false)
          }}
        />
      )}
    </Page>
  )
}
