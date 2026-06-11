import { describe, it, expect } from 'vitest'
import { slotLockId } from './ids'

describe('slotLockId', () => {
  it('joins doctorUID, date, timeSlot with underscores', () => {
    expect(slotLockId('d1', '2026-06-20', '09:30')).toBe('d1_2026-06-20_09:30')
  })
})
