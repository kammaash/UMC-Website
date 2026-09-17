import { describe, it, expect } from 'vitest'
import { formatIndianPhone } from './phoneFormat'

describe('formatIndianPhone', () => {
  it('groups an Indian E.164 number as +91 XXXXX XXXXX', () => {
    expect(formatIndianPhone('+917799440022')).toBe('+91 77994 40022')
  })
  it('leaves other shapes untouched', () => {
    expect(formatIndianPhone('+14155550123')).toBe('+14155550123')
    expect(formatIndianPhone('+91779944002')).toBe('+91779944002')
  })
  it('tolerates null/undefined', () => {
    expect(formatIndianPhone(null)).toBe('')
    expect(formatIndianPhone(undefined)).toBe('')
  })
})
