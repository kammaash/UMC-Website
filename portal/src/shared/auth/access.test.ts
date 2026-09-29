import { describe, it, expect } from 'vitest'
import { resolveRoleAccess } from './access'

describe('resolveRoleAccess', () => {
  it('returns "loading" while auth state is unknown', () => {
    expect(resolveRoleAccess('doctor', { status: 'unknown', profile: null })).toBe('loading')
  })
  // A failed profile read is not "no profile": treating it as one would send
  // a doctor with a bad connection to the wrong-role page.
  it('keeps waiting when the profile could not be read', () => {
    expect(resolveRoleAccess('doctor', { status: 'error', profile: null })).toBe('loading')
  })
  it('returns "unauthenticated" when signed out', () => {
    expect(resolveRoleAccess('doctor', { status: 'signed-out', profile: null })).toBe('unauthenticated')
  })
  it('returns "no-profile" when signed in but no users doc', () => {
    expect(resolveRoleAccess('doctor', { status: 'signed-in', profile: null })).toBe('no-profile')
  })
  it('returns "wrong-role" when the role does not match', () => {
    expect(resolveRoleAccess('doctor', { status: 'signed-in', profile: { role: 'pharmacy' } })).toBe('wrong-role')
  })
  it('returns "allow" when the role matches', () => {
    expect(resolveRoleAccess('doctor', { status: 'signed-in', profile: { role: 'doctor' } })).toBe('allow')
  })
})
