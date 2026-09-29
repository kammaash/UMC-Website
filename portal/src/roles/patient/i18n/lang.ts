// lang.ts — pure: which language the reminders page opens in.
//
// Decision 2026-09-29: Telugu by default. The QR a doctor shows is the bare
// address, so most patients arrive with no language at all; only the WhatsApp
// invite carries ?lang= (tablet_reminder reminders_link.dart). The phone's own
// language is deliberately not consulted — it is English on most phones here,
// whatever the owner reads.
//
// Order: the patient's own earlier pick on this phone, then the link's
// ?lang=, then Telugu. Hindi is not on the page yet; ?lang=hi falls through
// to the default until it is.
export type Lang = 'te' | 'en'

export const DEFAULT_LANG: Lang = 'te'

// Each label in its own script. `locale` is what Intl formats dates with.
export const LANGS: ReadonlyArray<{ code: Lang; label: string; locale: string }> = [
  { code: 'te', label: 'తెలుగు', locale: 'te-IN' },
  { code: 'en', label: 'English', locale: 'en-IN' },
]

// null for anything the page has no words for.
export function asLang(raw: string | null | undefined): Lang | null {
  const code = (raw || '').trim().toLowerCase()
  return LANGS.some((l) => l.code === code) ? (code as Lang) : null
}

export function resolveLang({ saved, query }: { saved: string | null; query: string | null }): Lang {
  return asLang(saved) ?? asLang(query) ?? DEFAULT_LANG
}

export function localeOf(lang: Lang): string {
  return LANGS.find((l) => l.code === lang)?.locale ?? 'en-IN'
}
