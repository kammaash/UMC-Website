import { describe, it, expect } from 'vitest'
import { registerAction } from './pushDecision'

describe('registerAction', () => {
  it('registers when this browser has no token doc yet', () => {
    expect(registerAction(null)).toBe('register')
  })

  it('registers (refreshing lastSeenAt) when the token is already active', () => {
    expect(registerAction({ active: true })).toBe('register')
  })

  it('re-activates a token the sender killed — it simply kills it again if it is really dead', () => {
    expect(registerAction({ active: false, deactivatedReason: 'unregistered' })).toBe('register')
  })

  it('leaves the token off once the app has taken reminders over', () => {
    expect(registerAction({ active: false, deactivatedReason: 'app_login' })).toBe('app-owns')
  })

  it('re-activates after a web sign-out — this is the patient coming back', () => {
    expect(registerAction({ active: false, deactivatedReason: 'web_signout' })).toBe('register')
  })

  it('ignores app_login on a token that is still active (the app never took over)', () => {
    expect(registerAction({ active: true, deactivatedReason: 'app_login' })).toBe('register')
  })
})
