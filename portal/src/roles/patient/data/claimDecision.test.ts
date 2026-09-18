import { describe, it, expect } from 'vitest'
import { decideAfterPreview, decideNoMatch, browserTimezone, claimErrorMessage } from './claimDecision'

describe('decideAfterPreview', () => {
  it('skips the confirm card for a patient whose users doc already points at a group', () => {
    expect(decideAfterPreview({ found: true, groupId: 'G1', isPrimary: true },
      { role: 'patient', patientGroupID: 'G0' })).toEqual({ kind: 'already-claimed', groupId: 'G0' })
    // even when the preview finds nothing (self-created group is not doctor-created)
    expect(decideAfterPreview({ found: false }, { role: 'patient', patientGroupID: 'G0' }))
      .toEqual({ kind: 'already-claimed', groupId: 'G0' })
  })
  it('carries the doctor name through for a returning patient, when the preview has one', () => {
    expect(decideAfterPreview({ found: true, groupId: 'G0', doctorName: 'Ranganath', isPrimary: true },
      { role: 'patient', patientGroupID: 'G0' })).toEqual({ kind: 'already-claimed', groupId: 'G0', doctorName: 'Ranganath' })
    // the preview often can't see an already-claimed group at all — no doctor name to give
    expect(decideAfterPreview({ found: false }, { role: 'patient', patientGroupID: 'G0' }))
      .toEqual({ kind: 'already-claimed', groupId: 'G0' })
  })
  it('does not treat a non-patient profile with a stray patientGroupID as claimed', () => {
    expect(decideAfterPreview({ found: false }, { role: 'doctor', patientGroupID: 'G0' })).toEqual({ kind: 'no-match' })
  })
  it('offers the confirm card for a found primary record, defaulting names', () => {
    expect(decideAfterPreview({ found: true, groupId: 'G1', patientName: ' Patient B ', doctorName: 'Ranganath', isPrimary: true }, null))
      .toEqual({ kind: 'confirm', groupId: 'G1', patientName: 'Patient B', doctorName: 'Ranganath' })
    expect(decideAfterPreview({ found: true, groupId: 'G1', isPrimary: true }, null))
      .toEqual({ kind: 'confirm', groupId: 'G1', patientName: 'Patient', doctorName: '' })
  })
  it('reports a record claimed by a different account', () => {
    expect(decideAfterPreview({ found: true, groupId: 'G1', isPrimary: false }, null)).toEqual({ kind: 'other-account' })
  })
  it('reports no match when the preview finds nothing or lacks an id', () => {
    expect(decideAfterPreview({ found: false }, null)).toEqual({ kind: 'no-match' })
    expect(decideAfterPreview({ found: true }, null)).toEqual({ kind: 'no-match' })
  })
})

describe('decideNoMatch (mirrors the member portal rule)', () => {
  it('deletes only a fresh orphan (no users doc)', () => {
    expect(decideNoMatch(false)).toBe('delete-orphan')
  })
  it('never deletes an account that has a users doc', () => {
    expect(decideNoMatch(true)).toBe('sign-out-existing')
  })
})

describe('browserTimezone', () => {
  it('passes the browser zone through', () => { expect(browserTimezone('Asia/Kolkata')).toBe('Asia/Kolkata') })
  it('falls back to Asia/Kolkata', () => {
    expect(browserTimezone(undefined)).toBe('Asia/Kolkata')
    expect(browserTimezone('')).toBe('Asia/Kolkata')
  })
})

describe('claimErrorMessage', () => {
  it('maps the server codes with or without the functions/ prefix', () => {
    expect(claimErrorMessage({ code: 'functions/permission-denied' })).toMatch(/not for your phone/)
    expect(claimErrorMessage({ code: 'failed-precondition' })).toMatch(/another account/)
    expect(claimErrorMessage({ code: 'functions/unauthenticated' })).toMatch(/sign in again/)
  })
  it('falls back to a generic retry line', () => {
    expect(claimErrorMessage(new Error('boom'))).toMatch(/try again/)
    expect(claimErrorMessage(undefined)).toMatch(/try again/)
  })
})
