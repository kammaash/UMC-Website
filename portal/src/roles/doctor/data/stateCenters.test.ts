import { describe, it, expect } from 'vitest'
import { stateCenter } from './stateCenters'

describe('stateCenter', () => {
  it('returns the centroid for a known state', () => {
    expect(stateCenter('Karnataka')).toEqual({ lat: 15.3173, lng: 75.7139 })
  })
  it('returns undefined for an unknown / empty state', () => {
    expect(stateCenter('Atlantis')).toBeUndefined()
    expect(stateCenter('')).toBeUndefined()
    expect(stateCenter(null)).toBeUndefined()
    expect(stateCenter(undefined)).toBeUndefined()
  })
})
