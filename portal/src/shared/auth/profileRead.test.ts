import { describe, it, expect, vi, afterEach } from 'vitest'
import { withTimeout, PROFILE_READ_TIMEOUT_MS } from './profileRead'

afterEach(() => { vi.useRealTimers() })

describe('withTimeout', () => {
  it('passes the answer through when it arrives in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok')
  })
  it('passes a failure through as it is', async () => {
    await expect(withTimeout(Promise.reject(new Error('offline')), 1000)).rejects.toThrow('offline')
  })
  it('fails by itself when no answer comes', async () => {
    vi.useFakeTimers()
    const waiting = withTimeout(new Promise(() => {}), 1000)
    const outcome = expect(waiting).rejects.toThrow(/timed out/)
    await vi.advanceTimersByTimeAsync(1000)
    await outcome
  })
  it('leaves no timer behind once answered', async () => {
    vi.useFakeTimers()
    await withTimeout(Promise.resolve('ok'), 1000)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('waits long enough for a slow mobile connection', () => {
    expect(PROFILE_READ_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000)
  })
})
