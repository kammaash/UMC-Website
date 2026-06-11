import type { AppointmentStatus, Appointment } from '../data/types'

/* Status → {label, color} — mirrors appointment_status.dart list labels + colors. */
export const STATUS_META: Record<AppointmentStatus, { label: string; color: string }> = {
  awaiting_doctor_confirmation: { label: 'Awaiting Confirmation', color: '#FFA726' }, // orange.400
  confirmed:                    { label: 'Awaiting Payment',       color: '#42A5F5' }, // blue.400
  active:                       { label: 'Paid',                   color: '#42A5F5' },
  arrived:                      { label: 'Arrived',                color: '#4CAF50' }, // green.500
  completed:                    { label: 'Completed',              color: '#BDBDBD' }, // grey.400
  cancelled_by_patient:         { label: 'Cancelled',              color: '#E57373' }, // red.300
  cancelled_by_doctor:          { label: 'Cancelled',              color: '#E57373' },
  patient_no_show:              { label: 'No Show',                color: '#FFA726' },
  expired:                      { label: 'Expired',                color: '#9E9E9E' }, // grey.500
}

export function statusMeta(s: string) {
  return STATUS_META[s as AppointmentStatus] ?? { label: s, color: '#9E9E9E' }
}

/* Which lifecycle actions are available for an appointment, per the detail-screen spec. */
export type ApptActionKey = 'confirm' | 'reject' | 'cancel' | 'markDone' | 'noShow' | 'dismiss'

export function availableActions(a: Appointment): ApptActionKey[] {
  switch (a.status) {
    case 'awaiting_doctor_confirmation': return ['confirm', 'reject']
    case 'confirmed': return ['cancel']
    case 'active':    return ['cancel']
    case 'arrived':
      // dual-confirm: if doctor already confirmed and waiting on patient, no action
      if (a.doctorConfirmedDone && !a.patientConfirmedDone) return []
      return ['markDone', 'noShow']
    case 'cancelled_by_patient':
    case 'cancelled_by_doctor':
    case 'patient_no_show':
    case 'expired':
      return a.dismissedByDoctor ? [] : ['dismiss']
    default: return []
  }
}

export const ACTION_LABEL: Record<ApptActionKey, string> = {
  confirm: 'Accept', reject: 'Reject', cancel: 'Cancel Appointment',
  markDone: 'Mark Consultation Done', noShow: 'Patient No Show', dismiss: 'Dismiss',
}
export const ACTION_COLOR: Record<ApptActionKey, string> = {
  confirm: '#43A047', reject: '#EF5350', cancel: '#E53935',
  markDone: '#43A047', noShow: '#FFA726', dismiss: '#757575',
}

/* ── Date / time formatting ────────────────────────────────────── */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** 'YYYY-MM-DD' → 'Jan 15' (or 'Today' when it matches todayISO). */
export function formatDate(iso: string, todayISO?: string): string {
  if (!iso) return ''
  if (todayISO && iso === todayISO) return 'Today'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${MONTHS[m - 1]} ${d}`
}

/** 'HH:MM' (24h) → 'h:MM AM/PM'. */
export function formatTime(slot: string): string {
  if (!slot) return ''
  const [hStr, mStr] = slot.split(':')
  let h = Number(hStr)
  const m = mStr ?? '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

/** Local YYYY-MM-DD for "today". */
export function todayISO(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Firestore Timestamp | null → 'Jan 15, 2025 · 2:30 PM'. */
export function formatTimestamp(ts: { toDate: () => Date } | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return ''
  const d = ts.toDate()
  let h = d.getHours()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${h}:${mm} ${ampm}`
}

/** order id → '#XXXXXXXX' (last 8 chars, upper). */
export function shortOrderId(id: string): string {
  return '#' + (id || '').slice(-8).toUpperCase()
}
