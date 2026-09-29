// The Firestore half of web push: what gets remembered at registration, and
// what sign-out turns off. Firebase itself is replaced by a small in-memory
// stand-in; the browser push APIs by the little this module asks of them.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tokenDocId } from './tokenDocId'

const store = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  failRead: null as unknown,
  failWrite: null as unknown,
  token: 'tok-1' as string | null,
}))

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  getDoc: vi.fn(async (ref: { path: string }) => {
    if (store.failRead) throw store.failRead
    const data = store.docs.get(ref.path)
    return { exists: () => data !== undefined, data: () => data }
  }),
  setDoc: vi.fn(async (ref: { path: string }, data: Record<string, unknown>) => {
    if (store.failWrite) throw store.failWrite
    const next = { ...(store.docs.get(ref.path) || {}) }
    for (const [k, v] of Object.entries(data)) { if (v === '__delete__') delete next[k]; else next[k] = v }
    store.docs.set(ref.path, next)
  }),
  serverTimestamp: () => '__now__',
  deleteField: () => '__delete__',
}))
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => ({})),
  getToken: vi.fn(async () => { if (store.token === null) throw new Error('no token'); return store.token }),
  isSupported: vi.fn(async () => true),
  onMessage: vi.fn(),
}))

const pathOf = async (gid: string, token: string) => `patientGroups/${gid}/webPushTokens/${await tokenDocId(token)}`

// A fresh copy of the module each time: what it holds in memory (the token
// this open registered) is exactly what a new page load would not have.
async function openPage() {
  vi.resetModules()
  return import('./reminderPush')
}

beforeEach(() => {
  store.docs.clear()
  store.failRead = null
  store.failWrite = null
  store.token = 'tok-1'
  localStorage.clear()
  vi.stubEnv('VITE_FB_VAPID_KEY', 'vapid')
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register: vi.fn(async () => ({})), ready: Promise.resolve({}) },
  })
})

describe('deactivatePushToken', () => {
  it("turns off the token this open registered", async () => {
    const push = await openPage()
    await push.registerPushToken('G0', 'android-chrome')
    expect(store.docs.get(await pathOf('G0', 'tok-1'))).toMatchObject({ active: true })

    await push.deactivatePushToken('G0')
    expect(store.docs.get(await pathOf('G0', 'tok-1'))).toMatchObject({ active: false, deactivatedReason: 'web_signout' })
  })

  it('turns off a token an EARLIER open registered, when this open failed before it could', async () => {
    await (await openPage()).registerPushToken('G0', 'android-chrome')

    // next visit: the phone cannot get its token this time
    const push = await openPage()
    store.token = null
    await expect(push.registerPushToken('G0', 'android-chrome')).rejects.toMatchObject({ reason: 'no-token' })

    await push.deactivatePushToken('G0')
    expect(store.docs.get(await pathOf('G0', 'tok-1'))).toMatchObject({ active: false, deactivatedReason: 'web_signout' })
  })

  it('turns it off when this open got the token but could not save it', async () => {
    await (await openPage()).registerPushToken('G0', 'android-chrome')

    const push = await openPage()
    store.failWrite = new Error('offline')
    await expect(push.registerPushToken('G0', 'android-chrome')).rejects.toMatchObject({ reason: 'write-failed' })
    store.failWrite = null

    await push.deactivatePushToken('G0')
    expect(store.docs.get(await pathOf('G0', 'tok-1'))).toMatchObject({ active: false, deactivatedReason: 'web_signout' })
  })

  it('finds the earlier token even when the page never learned which record this is', async () => {
    await (await openPage()).registerPushToken('G0', 'android-chrome')
    await (await openPage()).deactivatePushToken(null)
    expect(store.docs.get(await pathOf('G0', 'tok-1'))).toMatchObject({ active: false, deactivatedReason: 'web_signout' })
  })

  it("leaves the app's takeover in place — never rewrites app_login as web_signout", async () => {
    const push = await openPage()
    await push.registerPushToken('G0', 'android-chrome')
    const path = await pathOf('G0', 'tok-1')
    store.docs.set(path, { ...store.docs.get(path), active: false, deactivatedReason: 'app_login' })

    await push.deactivatePushToken('G0')
    expect(store.docs.get(path)).toMatchObject({ active: false, deactivatedReason: 'app_login' })
  })

  it('does nothing, and asks the server nothing, for a browser that never registered', async () => {
    const { getDoc, setDoc } = await import('firebase/firestore')
    vi.mocked(getDoc).mockClear(); vi.mocked(setDoc).mockClear()
    await (await openPage()).deactivatePushToken('G0')
    expect(getDoc).not.toHaveBeenCalled()
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('forgets the token once it is off, so the next person on this phone starts clean', async () => {
    const push = await openPage()
    await push.registerPushToken('G0', 'android-chrome')
    await push.deactivatePushToken('G0')

    const { setDoc } = await import('firebase/firestore')
    vi.mocked(setDoc).mockClear()
    await (await openPage()).deactivatePushToken('G9')
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('throws when the token could not be turned off, and still remembers it for the retry', async () => {
    const push = await openPage()
    await push.registerPushToken('G0', 'android-chrome')
    store.failWrite = new Error('offline')
    await expect(push.deactivatePushToken('G0')).rejects.toThrow('offline')

    store.failWrite = null
    await push.deactivatePushToken('G0')
    expect(store.docs.get(await pathOf('G0', 'tok-1'))).toMatchObject({ active: false })
  })

  it('does not hold sign-out up over a record this account may no longer touch', async () => {
    const push = await openPage()
    await push.registerPushToken('G0', 'android-chrome')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    store.failRead = { code: 'permission-denied' }
    await expect(push.deactivatePushToken('G0')).resolves.toBeUndefined()
  })
})
