// useStrings.ts — the page's words in the current language.
import { useLang } from './langStore'
import { en } from './en'
import { te } from './te'
import type { Lang } from './lang'
import type { Strings } from './strings'

const STRINGS: Record<Lang, Strings> = { te, en }

export function stringsFor(lang: Lang): Strings { return STRINGS[lang] }

export function useStrings(): Strings { return STRINGS[useLang()] }
