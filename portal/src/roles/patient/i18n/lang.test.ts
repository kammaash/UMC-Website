import { describe, it, expect } from 'vitest'
import { resolveLang, DEFAULT_LANG, LANGS } from './lang'

describe('resolveLang', () => {
  it('opens in Telugu when nothing says otherwise (a QR scan carries no language)', () => {
    expect(DEFAULT_LANG).toBe('te')
    expect(resolveLang({ saved: null, query: null })).toBe('te')
  })
  it("takes the WhatsApp invite's ?lang= over the default", () => {
    expect(resolveLang({ saved: null, query: 'en' })).toBe('en')
    expect(resolveLang({ saved: null, query: 'te' })).toBe('te')
  })
  it("keeps the patient's own earlier pick over the link's language", () => {
    expect(resolveLang({ saved: 'en', query: 'te' })).toBe('en')
    expect(resolveLang({ saved: 'te', query: 'en' })).toBe('te')
  })
  it('ignores a language the page does not have yet, and anything malformed', () => {
    expect(resolveLang({ saved: null, query: 'hi' })).toBe('te')
    expect(resolveLang({ saved: 'fr', query: null })).toBe('te')
    expect(resolveLang({ saved: '', query: ' EN ' })).toBe('en')
  })
  it('offers Telugu first, then English', () => {
    expect(LANGS.map((l) => l.code)).toEqual(['te', 'en'])
    // each in its own script, so a reader recognises theirs on any page
    expect(LANGS.map((l) => l.label)).toEqual(['తెలుగు', 'English'])
  })
})
