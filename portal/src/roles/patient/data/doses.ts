// doses.ts — pure: today's doses for a patient group, mirroring the server's
// functions/medicationTimeHelpers.js so the page, the web sender and the
// missed sweep agree on WHICH doses exist and WHAT their log id is.
// (The list here is the whole day, not just the send window: every tablet
// scheduled today, with its status from medicationLogs.)
//
// Mirrored byte-for-byte: parseScheduledTime semantics ("h:mm AM/PM", 12 AM →
// 0, 12 PM → 12), getDayAbbreviation (Su..Sa), parseLateWindow (first
// integer in "15 Min"), doseLogId (`${tabletId}_${yyyy-MM-dd}_${time ':'→'-'
// ' '→'_'}`). Times are resolved in the GROUP's timezone (claimGroup wrote the
// browser's zone at claim), so a phone that travels still sees the day the
// sender sends for.

export interface TabletDoc {
  id: string
  medication?: { name?: string; dosage?: string; strength?: string; form?: string } | null
  schedule?: { times?: unknown; daysOfWeek?: unknown; reminderEnabled?: unknown } | null
  caregiverSettings?: { lateWindow?: string } | null
}
export interface LogDoc {
  id: string
  status?: string
  takenAt?: { toMillis?: () => number } | null
}
export type DoseStatus = 'upcoming' | 'due' | 'taken' | 'taken_late' | 'missed'
export interface Dose {
  tabletId: string
  medicationName: string
  dosage: string            // free text shown under the name, '' when none
  scheduledTime: string     // as stored, e.g. "8:00 AM"
  scheduledMinutes: number  // minutes from local midnight
  date: string              // yyyy-MM-dd in the group zone
  logId: string
  reminderEnabled: boolean
  lateWindowMinutes: number | null
  status: DoseStatus
}

export function parseScheduledMinutes(timeStr: unknown): number | null {
  if (typeof timeStr !== 'string') return null
  const parts = timeStr.trim().split(' ')
  const hm = parts[0].split(':')
  let hour = parseInt(hm[0], 10)
  const minute = parseInt(hm[1], 10)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  const isPM = parts[1] === 'PM'
  if (isPM && hour !== 12) hour += 12
  if (!isPM && hour === 12) hour = 0
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return hour * 60 + minute
}

export function getDayAbbreviation(dayIndex: number): string {
  return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][dayIndex]
}

export function parseLateWindow(lateWindowStr: unknown): number | null {
  if (!lateWindowStr || typeof lateWindowStr !== 'string') return null
  const m = /\d+/.exec(lateWindowStr)
  return m ? parseInt(m[0], 10) : null
}

export function doseLogId(tabletId: string, dateStr: string, scheduledTime: string): string {
  return `${tabletId}_${dateStr}_${scheduledTime.replace(/:/g, '-').replace(/ /g, '_')}`
}

// "Now" expressed in a zone: calendar date, weekday index (0 = Sunday) and
// minutes since that day's midnight. Falls back to the browser zone when the
// group's zone is unknown or invalid.
export interface LocalParts { dateStr: string; weekday: number; minutes: number; zone: string }
export function localParts(now: Date, zone: string | null | undefined): LocalParts {
  const tryZone = (tz: string | undefined): LocalParts | null => {
    try {
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short',
      })
      const p: Record<string, string> = {}
      for (const part of fmt.formatToParts(now)) if (part.type !== 'literal') p[part.type] = part.value
      const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday)
      const hour = Number(p.hour) % 24 // some engines print "24" for midnight under h23
      if (!p.year || weekday < 0) return null
      return {
        dateStr: `${p.year}-${p.month}-${p.day}`,
        weekday,
        minutes: hour * 60 + Number(p.minute),
        // Keep the caller's spelling (ICU canonicalises Asia/Kolkata → Asia/Calcutta).
        zone: tz || fmt.resolvedOptions().timeZone,
      }
    } catch { return null }
  }
  return tryZone((zone || '').trim() || undefined) || tryZone(undefined) || {
    dateStr: now.toISOString().slice(0, 10), weekday: now.getUTCDay(),
    minutes: now.getUTCHours() * 60 + now.getUTCMinutes(), zone: 'UTC',
  }
}

const TAKEN = new Set(['taken', 'taken_late', 'taken_on_time'])

export function buildTodayDoses(tablets: TabletDoc[], logs: LogDoc[], local: LocalParts): Dose[] {
  const byId = new Map(logs.map((l) => [l.id, l]))
  const currentDay = getDayAbbreviation(local.weekday)
  const out: Dose[] = []
  const seen = new Set<string>()
  for (const t of tablets) {
    const schedule = t.schedule
    const medication = t.medication
    if (!schedule || !medication) continue
    const days = Array.isArray(schedule.daysOfWeek) ? (schedule.daysOfWeek as unknown[]) : []
    if (!days.includes('All') && !days.includes(currentDay)) continue
    const times = Array.isArray(schedule.times) ? (schedule.times as unknown[]) : []
    for (const scheduledTime of times) {
      if (typeof scheduledTime !== 'string') continue
      const scheduledMinutes = parseScheduledMinutes(scheduledTime)
      if (scheduledMinutes === null) continue
      const logId = doseLogId(t.id, local.dateStr, scheduledTime)
      if (seen.has(logId)) continue
      seen.add(logId)
      const log = byId.get(logId)
      const logStatus = String(log?.status || '')
      const status: DoseStatus =
        logStatus === 'taken_late' ? 'taken_late'
        : TAKEN.has(logStatus) ? 'taken'
        : logStatus === 'missed' ? 'missed'
        : scheduledMinutes > local.minutes ? 'upcoming'
        : 'due'
      out.push({
        tabletId: t.id,
        medicationName: String(medication.name || 'Medication'),
        dosage: [medication.strength, medication.dosage].map((s) => (s || '').toString().trim()).filter(Boolean).join(' · '),
        scheduledTime,
        scheduledMinutes,
        date: local.dateStr,
        logId,
        reminderEnabled: schedule.reminderEnabled === true,
        lateWindowMinutes: parseLateWindow(t.caregiverSettings?.lateWindow),
        status,
      })
    }
  }
  return out.sort((a, b) => a.scheduledMinutes - b.scheduledMinutes || a.medicationName.localeCompare(b.medicationName))
}

// Same classification as the app (markAsTaken) and markDoseFromPush: late
// only when a late window is set and now is past scheduled + window.
export function isTakenLate(dose: Pick<Dose, 'scheduledMinutes' | 'lateWindowMinutes'>, nowMinutes: number): boolean {
  if (!dose.lateWindowMinutes) return false
  return nowMinutes > dose.scheduledMinutes + dose.lateWindowMinutes
}

export function headingDate(now: Date, zone: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: zone }).format(now)
  } catch { return now.toDateString() }
}
