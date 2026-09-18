// greetingMorphTiming.ts — durations for the claimed screen's name morph
// (decision 2026-09-19): the greeting's full name travels from the heading
// up into the brand row, rests a moment, then swaps for the account avatar.
// Split out so tests can zero them (RemindersPage.test.tsx mocks this module
// the same way it already does setupTiming.ts).
// How long "You're set up, <name>" stays in the heading before the name
// moves to the corner — a fixed clock from when the claimed screen appears,
// the same on every device and whatever push is doing (decision 2026-09-18;
// it used to wait for push to settle, with a fallback timer).
export const GREETING_HOLD_MS = 8000
export const MORPH_MS = 560          // the name's flight from heading to corner
export const CORNER_HOLD_MS = 2400   // how long the name rests in the corner before swapping for the avatar
export const SWAP_MS = 350           // the corner: name swipes out, avatar swipes in
export const PEEK_HOLD_MS = 2000     // a tapped avatar's name-peek auto-hides after this long
