import { describe, it, expect } from 'vitest'
import { formatPatientName } from './formatName'

describe('formatPatientName', () => {
  it('capitalises just the first letter of the first and last word', () => {
    expect(formatPatientName('patient b')).toBe('Patient B')
    expect(formatPatientName('PATIENT B')).toBe('Patient B')
    expect(formatPatientName('pAtIent B')).toBe('Patient B')
  })
  it('lowercases everything else, including any middle name', () => {
    expect(formatPatientName('MUHAMMAD ABDUL RAHMAN KHAN')).toBe('Muhammad abdul rahman Khan')
  })
  it('a single word is both first and last — capitalised once', () => {
    expect(formatPatientName('patient')).toBe('Patient')
  })
  it('collapses stray whitespace between and around words', () => {
    expect(formatPatientName('  patient   b  ')).toBe('Patient B')
  })
  it('tolerates empty/blank input', () => {
    expect(formatPatientName('')).toBe('')
    expect(formatPatientName('   ')).toBe('')
  })
})
