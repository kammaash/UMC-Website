import { describe, it, expect } from 'vitest'
import { mapAppointment, mapCreatedPatient, mapNote, mapFinanceSummary, mapPenalty } from './mappers'

describe('mapAppointment', () => {
  it('maps fields and the doc id', () => {
    const a = mapAppointment('appt1', {
      doctorUID: 'd1', patientUID: 'p1', status: 'confirmed',
      date: '2026-06-20', timeSlot: '09:30', fee: 500, escrowHeld: true,
    })
    expect(a.id).toBe('appt1')
    expect(a.status).toBe('confirmed')
    expect(a.fee).toBe(500)
    expect(a.escrowHeld).toBe(true)
  })
  it('applies safe defaults for missing fields', () => {
    const a = mapAppointment('x', {})
    expect(a.patientConfirmedDone).toBe(false)
    expect(a.cancelReason).toBeNull()
    expect(a.paymentAmount).toBeNull()
    expect(a.fee).toBe(0)
  })
})

describe('mapCreatedPatient', () => {
  it('uses doc id as patientGroupID and defaults numbers to null', () => {
    const p = mapCreatedPatient('pg1', { name: 'Asha' })
    expect(p.id).toBe('pg1')
    expect(p.name).toBe('Asha')
    expect(p.age).toBeNull()
  })
})

describe('mapNote', () => {
  it('maps the three text fields', () => {
    const n = mapNote('n1', { diagnosis: 'HTN', notes: 'bp high', followUp: '2w' })
    expect(n).toMatchObject({ id: 'n1', diagnosis: 'HTN', notes: 'bp high', followUp: '2w' })
  })
})

describe('mapFinanceSummary', () => {
  it('defaults totals to 0 and byMonth to empty', () => {
    const f = mapFinanceSummary('summary', {})
    expect(f.totalRevenue).toBe(0)
    expect(f.byMonth).toEqual({})
  })
  it('preserves byMonth nested values', () => {
    const f = mapFinanceSummary('summary', { byMonth: { '2026_06': { revenue: 1200 } } })
    expect(f.byMonth['2026_06'].revenue).toBe(1200)
  })
})

describe('mapPenalty', () => {
  it('maps penalty fields', () => {
    const p = mapPenalty('pen1', { orderId: 'o1', penaltyAmount: 500, umcFee: 0, status: 'calculated' })
    expect(p).toMatchObject({ id: 'pen1', orderId: 'o1', penaltyAmount: 500, status: 'calculated' })
  })
})
