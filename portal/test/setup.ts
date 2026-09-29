import '@testing-library/jest-dom'
import { beforeEach, vi } from 'vitest'
import { setLang } from '../src/roles/patient/i18n/langStore'

vi.mock('../src/shared/lib/firebase', () => ({
  auth: {},
  db: {},
  functions: {},
  app: {},
}))

// Node 25+ defines its own global `localStorage`, which shadows jsdom's. Without
// --localstorage-file it is either undefined or (Node 25.2+) an object with no
// methods at all, so `localStorage.clear()` throws. Give the tests an in-memory
// one whenever the environment's is unusable. (sessionStorage is unaffected.)
const hasStorage = (s: unknown): s is Storage =>
  typeof s === 'object' && s !== null && typeof (s as Storage).getItem === 'function'
if (!hasStorage(globalThis.localStorage)) {
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

// The reminders page opens in Telugu (i18n/lang.ts). The tests that were
// written against its English wording keep reading English; the ones about
// the language itself clear storage and call initLang() to start as a new
// patient would.
beforeEach(() => { setLang('en') })
