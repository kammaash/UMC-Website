import { describe, it, expect } from 'vitest'
import {
  parseScheduledMinutes, getDayAbbreviation, parseLateWindow, doseLogId, localParts,
  buildTodayDoses, isTakenLate, type TabletDoc,
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
})
