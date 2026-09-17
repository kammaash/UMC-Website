import { describe, it, expect, beforeAll } from 'vitest'
import { webcrypto } from 'node:crypto'
import { tokenDocId } from './tokenDocId'

beforeAll(() => {
  // jsdom exposes no crypto.subtle; the browser does. Use Node's WebCrypto.
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
})

describe('tokenDocId', () => {
  it('is the SHA-256 hex of the token (FIPS 180-4 vector; matches the server helper)', async () => {
    expect(await tokenDocId('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
  it('is stable and 64 hex chars for a realistic token', async () => {
    const t = 'dZk3:APA91bF-fake-token_for-tests'
    const a = await tokenDocId(t)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await tokenDocId(t)).toBe(a)
  })
})
