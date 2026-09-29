// The auth provider's own behaviour: what it reports while, and after, it
// reads users/{uid} — above all when that read fails. Firebase is replaced
// by the two calls the provider makes.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const fb = vi.hoisted(() => ({
  listener: null as null | ((u: unknown) => unknown),
  currentUser: null as unknown,
  getDoc: vi.fn(),
}))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, cb: (u: unknown) => unknown) => { fb.listener = cb; return () => { fb.listener = null } },
  signInWithPopup: vi.fn(), GoogleAuthProvider: vi.fn(), OAuthProvider: vi.fn(),
  signInWithPhoneNumber: vi.fn(), signOut: vi.fn(), deleteUser: vi.fn(),
}))
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  getDoc: (ref: unknown) => fb.getDoc(ref),
}))
vi.mock('../lib/firebase', () => ({
  auth: { get currentUser() { return fb.currentUser } },
  db: {}, functions: {}, app: {},
}))

import { AuthProvider, useAuth } from './AuthContext'
import { PROFILE_READ_TIMEOUT_MS } from './profileRead'

const found = (data: Record<string, unknown>) => ({ exists: () => true, data: () => data })
const missing = { exists: () => false, data: () => undefined }

function Probe() {
  const { status, profile, user, retryProfile } = useAuth()
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="role">{profile?.role ?? 'none'}</p>
      <p data-testid="uid">{(user as { uid?: string } | null)?.uid ?? 'none'}</p>
      <button onClick={retryProfile}>retry</button>
    </div>
  )
}
const status = () => screen.getByTestId('status').textContent
function signIn(uid: string) {
  const u = { uid }
  fb.currentUser = u
  return act(async () => { await fb.listener?.(u) })
}
function signOut() {
  fb.currentUser = null
  return act(async () => { await fb.listener?.(null) })
}

beforeEach(() => {
  fb.getDoc.mockReset()
  fb.currentUser = null
  vi.spyOn(console, 'error').mockImplementation(() => {})
  render(<AuthProvider><Probe /></AuthProvider>)
})

describe('AuthProvider', () => {
  it('is "unknown" until Firebase has said who, if anyone, is signed in', () => {
    expect(status()).toBe('unknown')
  })
  it('signed out', async () => {
    await signOut()
    expect(status()).toBe('signed-out')
  })
  it('signed in, with the profile from users/{uid}', async () => {
    fb.getDoc.mockResolvedValue(found({ role: 'patient' }))
    await signIn('u1')
    expect(status()).toBe('signed-in')
    expect(screen.getByTestId('role')).toHaveTextContent('patient')
    expect(fb.getDoc).toHaveBeenCalledWith({ path: 'users/u1' })
  })
  it('signed in with no profile when there is no users doc', async () => {
    fb.getDoc.mockResolvedValue(missing)
    await signIn('u1')
    expect(status()).toBe('signed-in')
    expect(screen.getByTestId('role')).toHaveTextContent('none')
  })

  // The bug (2026-09-30): a failed read rejected inside the listener, nothing
  // caught it, and status stayed "unknown" — every page showed "Loading…"
  // with no way on, for as long as it stayed open.
  it('reports "error" when the profile cannot be read — never left at "unknown"', async () => {
    fb.getDoc.mockRejectedValue(new Error('client is offline'))
    await signIn('u1')
    expect(status()).toBe('error')
    // still knows WHO is signed in: sign-out must stay possible
    expect(screen.getByTestId('uid')).toHaveTextContent('u1')
    // and does not pass a failed read off as "this account has no profile"
    expect(status()).not.toBe('signed-in')
  })
  it('gives up on a read that never answers, instead of waiting for ever', async () => {
    vi.useFakeTimers()
    try {
      fb.getDoc.mockReturnValue(new Promise(() => {}))   // never settles
      const u = { uid: 'u1' }
      fb.currentUser = u
      act(() => { void fb.listener?.(u) })
      await act(async () => { await vi.advanceTimersByTimeAsync(PROFILE_READ_TIMEOUT_MS - 1) })
      expect(status()).toBe('unknown')
      await act(async () => { await vi.advanceTimersByTimeAsync(1) })
      expect(status()).toBe('error')
    } finally { vi.useRealTimers() }
  })
  it('retryProfile reads again, and shows loading while it does', async () => {
    fb.getDoc.mockRejectedValueOnce(new Error('client is offline'))
    await signIn('u1')
    expect(status()).toBe('error')

    let finish: (v: unknown) => void = () => {}
    fb.getDoc.mockReturnValueOnce(new Promise((res) => { finish = res }))
    await userEvent.click(screen.getByText('retry'))
    expect(status()).toBe('unknown')

    await act(async () => { finish(found({ role: 'patient' })) })
    expect(status()).toBe('signed-in')
    expect(screen.getByTestId('role')).toHaveTextContent('patient')
  })
  it('retryProfile that fails again goes back to "error"', async () => {
    fb.getDoc.mockRejectedValue(new Error('client is offline'))
    await signIn('u1')
    await userEvent.click(screen.getByText('retry'))
    await waitFor(() => expect(status()).toBe('error'))
    expect(fb.getDoc).toHaveBeenCalledTimes(2)
  })
  it('retryProfile does nothing when nobody is signed in', async () => {
    await signOut()
    await userEvent.click(screen.getByText('retry'))
    expect(status()).toBe('signed-out')
    expect(fb.getDoc).not.toHaveBeenCalled()
  })

  it('a read that finishes after sign-out changes nothing', async () => {
    let finish: (v: unknown) => void = () => {}
    fb.getDoc.mockReturnValueOnce(new Promise((res) => { finish = res }))
    const u = { uid: 'u1' }
    fb.currentUser = u
    act(() => { void fb.listener?.(u) })
    await signOut()
    await act(async () => { finish(found({ role: 'patient' })) })
    expect(status()).toBe('signed-out')
    expect(screen.getByTestId('role')).toHaveTextContent('none')
  })
  it('a read that FAILS after sign-out changes nothing either', async () => {
    let fail: (e: unknown) => void = () => {}
    fb.getDoc.mockReturnValueOnce(new Promise((_res, rej) => { fail = rej }))
    const u = { uid: 'u1' }
    fb.currentUser = u
    act(() => { void fb.listener?.(u) })
    await signOut()
    await act(async () => { fail(new Error('offline')) })
    expect(status()).toBe('signed-out')
  })
  it("an earlier account's read that finishes late does not overwrite the current one", async () => {
    let finishFirst: (v: unknown) => void = () => {}
    fb.getDoc.mockReturnValueOnce(new Promise((res) => { finishFirst = res }))
    const a = { uid: 'a' }
    fb.currentUser = a
    act(() => { void fb.listener?.(a) })

    fb.getDoc.mockResolvedValueOnce(found({ role: 'patient' }))
    await signIn('b')
    expect(screen.getByTestId('role')).toHaveTextContent('patient')

    await act(async () => { finishFirst(found({ role: 'doctor' })) })
    expect(screen.getByTestId('uid')).toHaveTextContent('b')
    expect(screen.getByTestId('role')).toHaveTextContent('patient')
  })
})
