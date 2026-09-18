// greetingMorphTiming.ts — durations for the claimed screen's name morph
// (decision 2026-09-19): the greeting's full name travels from the heading
// up into the brand row, rests a moment, then swaps for the account avatar.
// Split out so tests can zero them (RemindersPage.test.tsx mocks this module
// the same way it already does setupTiming.ts).
export const MORPH_MS = 560          // the name's flight from heading to corner
export const CORNER_HOLD_MS = 2400   // how long the name rests in the corner before swapping for the avatar
export const SWAP_MS = 350           // the corner: name swipes out, avatar swipes in
export const PEEK_HOLD_MS = 2000     // a tapped avatar's name-peek auto-hides after this long
// If push never settles (denied/gated/erroring), the avatar still has to
// become reachable eventually — account details can't depend on push working.
export const SETTLE_FALLBACK_MS = 5000
