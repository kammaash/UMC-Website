// langStore.ts — the page's current language, held outside React so every
// piece of the page (and the sheet, the modal, the panels) reads the same one
// without a provider wrapped around them.
//
// Remembered per phone in localStorage: the choice has to survive the next
// visit and every notification tap, whose links carry no language. A language
// that arrived on the link (?lang=, the WhatsApp invite) is remembered the
// same way, for the same reason. Storage can throw (private modes, blocked
// site data) — the choice then simply lasts for this view.
import { useSyncExternalStore } from 'react'
import { asLang, resolveLang, type Lang } from './lang'

const KEY = 'umc-lang'

function readSaved(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}
function writeSaved(lang: Lang): void {
  try { localStorage.setItem(KEY, lang) } catch { /* this view's state still holds */ }
}
function readQuery(): string | null {
  try { return new URLSearchParams(window.location.search).get('lang') } catch { return null }
}

const listeners = new Set<() => void>()
let current: Lang = resolve()

function resolve(): Lang {
  const saved = readSaved()
  const query = readQuery()
  // A language the link asked for is kept; the bare default is not, so a
  // later change of default still reaches everyone who never chose.
  const fromLink = asLang(query)
  if (!asLang(saved) && fromLink) writeSaved(fromLink)
  return resolveLang({ saved, query })
}

// Works the language out again from storage and the address. The page calls
// nothing but this module's own first read; tests use it to start afresh.
export function initLang(): Lang {
  current = resolve()
  listeners.forEach((l) => l())
  return current
}

export function getLang(): Lang { return current }

export function setLang(lang: Lang): void {
  writeSaved(lang)
  if (lang === current) return
  current = lang
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang)
}
