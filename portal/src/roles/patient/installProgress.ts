// installProgress.ts — has this browser been through the install steps once?
//
// Set when the patient taps Done on the last step. Until then the welcome
// screen holds "Continue with phone" back (decision 2026-09-18): on Apple,
// sign-in belongs in the installed app, and the steps are how they get there.
// localStorage, not sessionStorage — once is enough, not once per visit.
// Storage can throw (private modes, blocked site data); that reads as
// "not yet", and a write that fails still leaves this view's state set.
const KEY = 'umc-install-done'

export function readSetupDone(): boolean {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

export function writeSetupDone(): void {
  try { localStorage.setItem(KEY, '1') } catch { /* this view's state still holds */ }
}
