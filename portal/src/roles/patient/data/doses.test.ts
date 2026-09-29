import { describe, it, expect } from 'vitest'
import {
  parseScheduledMinutes, getDayAbbreviation, parseLateWindow, doseLogId, localParts,
  buildTodayDoses, isTakenLate, courseEnded, type TabletDoc,
} from './doses'

describe('server-mirrored helpers', () => {
  it('parseScheduledMinutes follows parseScheduledTimeWithTimezone semantics', () => {
    expect(parseScheduledMinutes('8:00 AM')).toBe(480)
    expect(parseScheduledMinutes('12:00 AM')).toBe(0)
    expect(parseScheduledMinutes('12:30 PM')).toBe(750)
    expect(parseScheduledMinutes('11:52 AM')).toBe(712)
    expect(parseScheduledMinutes('10:00 PM')).toBe(1320)
    expect(parseScheduledMinutes('garbage')).toBeNull()
    expect(parseScheduledMinutes(undefined)).toBeNull()
  })
  it('getDayAbbreviation is Su..Sa', () => {
    expect(getDayAbbreviation(0)).toBe('Su'); expect(getDayAbbreviation(3)).toBe('We'); expect(getDayAbbreviation(6)).toBe('Sa')
  })
  it('parseLateWindow takes the first integer of "15 Min"', () => {
    expect(parseLateWindow('15 Min')).toBe(15); expect(parseLateWindow('60 Min')).toBe(60)
    expect(parseLateWindow(undefined)).toBeNull(); expect(parseLateWindow('none')).toBeNull()
  })
  it('doseLogId is byte-identical to the app/server format', () => {
    expect(doseLogId('abc', '2026-09-17', '8:00 AM')).toBe('abc_2026-09-17_8-00_AM')
    expect(doseLogId('DhJrrahhJK6lGz0NpR53', '2026-09-17', '12:00 PM')).toBe('DhJrrahhJK6lGz0NpR53_2026-09-17_12-00_PM')
  })
})

describe('localParts', () => {
  // 2026-09-17 20:30 UTC = 2026-09-18 02:00 IST (Friday) = 2026-09-17 Thursday in UTC
  const now = new Date('2026-09-17T20:30:00Z')
  it('resolves date, weekday and minutes in the group zone', () => {
    const ist = localParts(now, 'Asia/Kolkata')
    expect(ist).toMatchObject({ dateStr: '2026-09-18', weekday: 5, minutes: 120, zone: 'Asia/Kolkata' })
    const utc = localParts(now, 'UTC')
    expect(utc).toMatchObject({ dateStr: '2026-09-17', weekday: 4, minutes: 1230 })
  })
  it('handles midnight without printing hour 24', () => {
    expect(localParts(new Date('2026-09-17T18:30:00Z'), 'Asia/Kolkata').minutes).toBe(0)
  })
  it('falls back to the browser zone on an invalid zone', () => {
    expect(localParts(now, 'Not/AZone').dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

const tablets: TabletDoc[] = [
  { id: 't1', medication: { name: 'Metformin 500 mg' }, schedule: { times: ['8:00 AM', '2:00 PM'], daysOfWeek: ['All'], reminderEnabled: true }, caregiverSettings: { lateWindow: '15 Min' } },
  { id: 't2', medication: { name: 'Vitamin D' }, schedule: { times: ['9:00 AM'], daysOfWeek: ['Mo', 'We'], reminderEnabled: false } },
  { id: 't3', medication: { name: 'Broken' }, schedule: { times: 'not-an-array', daysOfWeek: ['All'] } },
  { id: 't4', medication: null, schedule: { times: ['8:00 AM'], daysOfWeek: ['All'] } },
]
const wed = { dateStr: '2026-09-16', weekday: 3, minutes: 600, zone: 'Asia/Kolkata' } // Wednesday 10:00

describe('buildTodayDoses', () => {
  it('lists every dose scheduled today (All or the weekday), sorted by time, skipping malformed docs', () => {
    const doses = buildTodayDoses(tablets, [], wed)
    expect(doses.map((d) => `${d.scheduledTime} ${d.medicationName}`)).toEqual([
      '8:00 AM Metformin 500 mg', '9:00 AM Vitamin D', '2:00 PM Metformin 500 mg',
    ])
    expect(doses[0].logId).toBe('t1_2026-09-16_8-00_AM')
    expect(doses[0].lateWindowMinutes).toBe(15)
    expect(doses[1].reminderEnabled).toBe(false)
  })
  it('excludes a weekday-specific tablet on another day', () => {
    const thu = { ...wed, weekday: 4, dateStr: '2026-09-17' }
    expect(buildTodayDoses(tablets, [], thu).map((d) => d.medicationName)).toEqual(['Metformin 500 mg', 'Metformin 500 mg'])
  })
  it('derives status from the log, else from the clock', () => {
    const logs = [
      { id: 't1_2026-09-16_8-00_AM', status: 'taken_late' },
      { id: 't2_2026-09-16_9-00_AM', status: 'missed' },
    ]
    const [m8, v9, m14] = buildTodayDoses(tablets, logs, wed)
    expect(m8.status).toBe('taken_late')
    expect(v9.status).toBe('missed')
    expect(m14.status).toBe('upcoming')       // 2 PM > 10:00
    const [d8] = buildTodayDoses(tablets, [], wed)
    expect(d8.status).toBe('due')             // 8 AM < 10:00, no log
    expect(buildTodayDoses(tablets, [{ id: 't1_2026-09-16_8-00_AM', status: 'taken_on_time' }], wed)[0].status).toBe('taken')
  })
})

describe('isTakenLate', () => {
  it('is late only past scheduled + window, and never without a window', () => {
    expect(isTakenLate({ scheduledMinutes: 480, lateWindowMinutes: 15 }, 495)).toBe(false)
    expect(isTakenLate({ scheduledMinutes: 480, lateWindowMinutes: 15 }, 496)).toBe(true)
    expect(isTakenLate({ scheduledMinutes: 480, lateWindowMinutes: null }, 900)).toBe(false)
  })
  it('a 0-minute window still counts as configured — late the instant the scheduled minute passes', () => {
    expect(isTakenLate({ scheduledMinutes: 480, lateWindowMinutes: 0 }, 480)).toBe(false)
    expect(isTakenLate({ scheduledMinutes: 480, lateWindowMinutes: 0 }, 481)).toBe(true)
  })
})

// ── courseEnded ──────────────────────────────────────────────────────────
// The same cases, with the same dates, as the server's
// functions/medicationTimeHelpers.test.js — the page, the sender and the app
// must agree on the day a course stops. Day 1 is the calendar day the
// prescription was written, in the group's zone; the course is over from the
// day after the last dosing day.
const IST = 'Asia/Kolkata'
const stamp = (iso: string) => ({ toMillis: () => new Date(iso).getTime() })
const writtenAt = stamp('2026-09-01T09:00:00+05:30')
const at = (iso: string) => localParts(new Date(iso), IST)
const course = (durationDays: unknown, extra: Partial<TabletDoc> = {}): TabletDoc => ({
  id: 'tab1', createdAt: writtenAt,
  medication: { name: 'Dolo 650' },
  schedule: { reminderEnabled: true, daysOfWeek: ['All'], times: ['9:00 AM'], durationDays },
  ...extra,
})

describe('courseEnded (mirrors the server and the app)', () => {
  it('a 14-day course is live through day 14 and over on day 15', () => {
    expect(courseEnded(course(14), at('2026-09-14T23:59:00+05:30'))).toBe(false)
    expect(courseEnded(course(14), at('2026-09-15T00:00:00+05:30'))).toBe(true)
  })
  it('day 1 is judged in the group zone, not UTC', () => {
    // Written 1 Sep 01:30 IST = 31 Aug 20:00 UTC. A 1-day course ends at
    // 2 Sep 00:00 IST, not 1 Sep 00:00 IST.
    const t = course(1, { createdAt: stamp('2026-09-01T01:30:00+05:30') })
    expect(courseEnded(t, at('2026-09-01T23:00:00+05:30'))).toBe(false)
    expect(courseEnded(t, at('2026-09-02T00:01:00+05:30'))).toBe(true)
  })
  it('an indefinite course never ends', () => {
    const far = at('2030-01-01T09:00:00+05:30')
    expect(courseEnded(course(undefined), far)).toBe(false)
    expect(courseEnded(course(0), far)).toBe(false)
    expect(courseEnded(course(-3), far)).toBe(false)
    expect(courseEnded(course('soon'), far)).toBe(false)
    expect(courseEnded(course(5, { createdAt: undefined }), far)).toBe(false)
    expect(courseEnded(course(5, { createdAt: null }), far)).toBe(false)
    expect(courseEnded({ id: 'x' }, far)).toBe(false)
  })
  it('accepts a Date or a toDate() timestamp too', () => {
    const d = new Date('2026-09-01T09:00:00+05:30')
    expect(courseEnded(course(2, { createdAt: d }), at('2026-09-03T00:00:00+05:30'))).toBe(true)
    expect(courseEnded(course(2, { createdAt: { toDate: () => d } }), at('2026-09-02T12:00:00+05:30'))).toBe(false)
  })
  it('counts across a month end and a year end', () => {
    const t = course(10, { createdAt: stamp('2026-12-25T10:00:00+05:30') })
    expect(courseEnded(t, at('2027-01-03T23:59:00+05:30'))).toBe(false)
    expect(courseEnded(t, at('2027-01-04T00:00:00+05:30'))).toBe(true)
  })
})

describe('buildTodayDoses — a finished course', () => {
  const today = at('2026-09-10T10:00:00+05:30')
  it('has no doses today: it is listed once, as completed, however many times a day it was taken', () => {
    const ended = course(3, { schedule: { reminderEnabled: true, daysOfWeek: ['All'], times: ['9:00 AM', '9:00 PM'], durationDays: 3 } })
    const out = buildTodayDoses([ended], [], today)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ tabletId: 'tab1', medicationName: 'Dolo 650', status: 'completed', scheduledTime: '' })
  })
  it('sorts after the doses still to take, and leaves a live course alone', () => {
    const live = course(30, { id: 'tab2', medication: { name: 'Metformin' }, schedule: { reminderEnabled: true, daysOfWeek: ['All'], times: ['9:00 PM'], durationDays: 30 } })
    const out = buildTodayDoses([course(3), live], [], today)
    expect(out.map((d) => [d.tabletId, d.status])).toEqual([['tab2', 'upcoming'], ['tab1', 'completed']])
  })
  it('is listed even on a weekday the course was never scheduled for', () => {
    // 10 Sep 2026 is a Thursday
    const ended = course(3, { schedule: { reminderEnabled: true, daysOfWeek: ['Mo'], times: ['9:00 AM'], durationDays: 3 } })
    expect(buildTodayDoses([ended], [], today).map((d) => d.status)).toEqual(['completed'])
  })
  it('never carries a log id a dose could be written under', () => {
    const [done] = buildTodayDoses([course(3)], [], today)
    expect(done.logId).not.toBe(doseLogId('tab1', '2026-09-10', '9:00 AM'))
    expect(done.logId).toBe('tab1_completed')
  })
})
