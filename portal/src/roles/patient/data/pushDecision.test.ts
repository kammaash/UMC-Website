import { describe, it, expect } from 'vitest'
import { registerAction, needsTurningOff, signOutTargets } from './pushDecision'

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

describe('needsTurningOff (sign-out)', () => {
  it('turns off a token that is on', () => {
    expect(needsTurningOff({ active: true })).toBe(true)
  })
  it('treats a doc with no active field as on — the sender only skips an explicit false', () => {
    expect(needsTurningOff({})).toBe(true)
  })
  it('leaves alone a token that is already off, whoever turned it off', () => {
    // 'app_login' above all: overwriting it with web_signout would make the
    // next sign-in here switch web push back on beside the app's own.
    expect(needsTurningOff({ active: false, deactivatedReason: 'app_login' })).toBe(false)
    expect(needsTurningOff({ active: false, deactivatedReason: 'web_signout' })).toBe(false)
    expect(needsTurningOff({ active: false })).toBe(false)
  })
  it('has nothing to do when this browser has no token doc', () => {
    expect(needsTurningOff(null)).toBe(false)
  })
})

describe('signOutTargets', () => {
  it("is this open's token when it registered one", () => {
    expect(signOutTargets('G0', 'aaa', null)).toEqual([{ gid: 'G0', id: 'aaa' }])
  })
  it('is the token an EARLIER open registered when this one never got that far', () => {
    expect(signOutTargets('G0', null, { gid: 'G0', id: 'aaa' })).toEqual([{ gid: 'G0', id: 'aaa' }])
  })
  it('names a token once when both say the same', () => {
    expect(signOutTargets('G0', 'aaa', { gid: 'G0', id: 'aaa' })).toEqual([{ gid: 'G0', id: 'aaa' }])
  })
  it('names both when the token changed since the earlier open', () => {
    expect(signOutTargets('G0', 'bbb', { gid: 'G0', id: 'aaa' }))
      .toEqual([{ gid: 'G0', id: 'bbb' }, { gid: 'G0', id: 'aaa' }])
  })
  it('still finds the earlier token when the page never learned which record this is', () => {
    expect(signOutTargets(null, null, { gid: 'G0', id: 'aaa' })).toEqual([{ gid: 'G0', id: 'aaa' }])
    // a token with no record to look under cannot be addressed
    expect(signOutTargets(null, 'bbb', null)).toEqual([])
  })
  it('is empty for a browser that never registered', () => {
    expect(signOutTargets('G0', null, null)).toEqual([])
  })
})
