// glyphPaths.ts — simple line drawings of the browser buttons the install
// steps ask a patient to tap: the inline symbols in the step text (glyphs.tsx)
// and the one pencilled in at the end of the sketch line (SketchLine.tsx).
//
// Our own generic shapes on a 24×24 grid, not Apple's SF Symbols (whose
// licence does not cover use on a website). Stroke-only, so the pencil line
// can draw them in.
export type GlyphName = 'share' | 'more' | 'add-home' | 'toggle' | 'install' | 'tune' | 'phone-vibrate'

export const GLYPH_PATHS: Record<GlyphName, string[]> = {
  // a box open at the top with an arrow rising out of it
  share: ['M8.5 9.5 H6.5 V20.5 H17.5 V9.5 H15.5', 'M12 14.5 V3.5', 'M8.5 7 L12 3.5 L15.5 7'],
  // three dots in a circle
  more: ['M12 3 A9 9 0 1 1 11.99 3', 'M7.8 12 h0.01', 'M12 12 h0.01', 'M16.2 12 h0.01'],
  // a plus in a rounded square
  'add-home': ['M7 3.5 H17 Q20.5 3.5 20.5 7 V17 Q20.5 20.5 17 20.5 H7 Q3.5 20.5 3.5 17 V7 Q3.5 3.5 7 3.5 Z', 'M12 8 V16', 'M8 12 H16'],
  // a switch, on
  toggle: ['M8 6.5 H16 A5.5 5.5 0 0 1 16 17.5 H8 A5.5 5.5 0 0 1 8 6.5 Z', 'M16 9 A3 3 0 1 1 15.99 9'],
  // a screen with an arrow down into it
  install: ['M4 5.5 H20 V16.5 H4 Z', 'M9 20.5 H15', 'M12 7.5 V13.5', 'M9.5 11 L12 13.5 L14.5 11'],
  // two sliders — the site-settings button beside the address on Android Chrome
  tune: ['M4 8 H7', 'M11 8 H20', 'M11 8 A2 2 0 1 1 10.99 8', 'M4 16 H13', 'M17 16 H20', 'M17 16 A2 2 0 1 1 16.99 16'],
  // a phone, buzzing — a rounded outline with a motion arc either side. Our
  // stand-in for the 🔔 emoji: "Ring my reminders" turns the phone on, not a
  // bell, and it's what the status badge in the header points to as well.
  'phone-vibrate': [
    'M9 3.5 H15 Q17 3.5 17 5.5 V18.5 Q17 20.5 15 20.5 H9 Q7 20.5 7 18.5 V5.5 Q7 3.5 9 3.5 Z',
    'M10.5 18 H13.5',
    'M4.5 8 A5 5 0 0 0 4.5 16',
    'M19.5 8 A5 5 0 0 1 19.5 16',
  ],
}
