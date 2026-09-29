// LangSwitch.tsx — the language drop-down.
//
// Top right of the brand row until the patient is signed in to their record;
// from then on that corner belongs to the status light and the avatar, and
// the switch lives in the account sheet instead (`inSheet`).
//
// A real <select>, so the phone shows its own picker — big rows, no tiny
// custom menu to aim at. Each language is written in its own script: a reader
// must be able to recognise theirs whatever the page is currently showing.
import { LANGS, type Lang } from './i18n/lang'
import { setLang, useLang } from './i18n/langStore'
import { useStrings } from './i18n/useStrings'
import { Icon } from '../../shared/design/icons'

export function LangSwitch({ inSheet = false }: { inSheet?: boolean }) {
  const lang = useLang()
  const t = useStrings()
  return (
    <label className={`umc-lang${inSheet ? ' is-sheet' : ''}`}>
      <span className="umc-sr-only">{t.language}</span>
      <select
        className="umc-lang-select"
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
      >
        {LANGS.map((l) => <option key={l.code} value={l.code} lang={l.code}>{l.label}</option>)}
      </select>
      <span className="umc-lang-caret" aria-hidden="true"><Icon name="chevronDown" size={14} /></span>
    </label>
  )
}
