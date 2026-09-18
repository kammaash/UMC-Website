import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('../src/shared/lib/firebase', () => ({
  auth: {},
  db: {},
  functions: {},
  app: {},
}))

// Node 25+ defines its own global `localStorage`, which is undefined unless
// Node is started with --localstorage-file, and it shadows jsdom's. Give the
// tests an in-memory one whenever the environment doesn't provide it.
// (sessionStorage is unaffected.)
if (typeof globalThis.localStorage === 'undefined') {
  const items = new Map<string, string>()
  const memory: Storage = {
    get length() { return items.size },
    key: (i) => [...items.keys()][i] ?? null,
    getItem: (k) => items.get(k) ?? null,
    setItem: (k, v) => { items.set(k, String(v)) },
    removeItem: (k) => { items.delete(k) },
    clear: () => { items.clear() },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: memory, configurable: true, writable: true })
}
