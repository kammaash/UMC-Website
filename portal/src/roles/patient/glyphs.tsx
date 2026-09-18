// glyphs.tsx — a button's symbol, inline in an install step's text.
import { GLYPH_PATHS, type GlyphName } from './glyphPaths'

// Inline, in the step text. The word for the button is always next to it, so
// it is hidden from screen readers rather than read out twice.
export function Glyph({ name }: { name: GlyphName }) {
  return (
    <span className="umc-glyph" data-glyph={name} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {GLYPH_PATHS[name].map((d) => <path key={d} d={d} />)}
      </svg>
    </span>
  )
}
