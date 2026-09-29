// pushDecision.ts — pure decisions about this browser's web push token.
// No Firebase here; reminderPush.ts feeds these the facts and acts on them.
//
// Who writes `active:false` on patientGroups/{gid}/webPushTokens/{hash}, and
// what re-opening the page should do about it:
//   the sender  — the token bounced (unregistered/invalid). Re-activate: the
//                 page has a live token right now, and the sender just kills
//                 it again if it really is dead.
//   the app     — deactivatedReason 'app_login': the patient signed into the
//                 UMC app, which now owns reminders on this phone. LEAVE IT
//                 OFF (decision 2026-09-18). Two channels would mean two
//                 notifications per dose. The page itself stays fully usable —
//                 today's list and "Taken" never depended on push.
//   this page   — 'web_signout' (see deactivatePushToken). Re-activate: a
//                 sign-in on this browser is the patient coming back.
export interface ExistingToken {
  active?: unknown
  deactivatedReason?: unknown
}
export type RegisterAction = 'register' | 'app-owns'

export function registerAction(existing: ExistingToken | null): RegisterAction {
  if (!existing) return 'register'
  return existing.active === false && existing.deactivatedReason === 'app_login' ? 'app-owns' : 'register'
}

// ── sign-out ─────────────────────────────────────────────────────────────
// Which token docs sign-out has to look at, and whether each needs turning
// off. Decided from what is KNOWN about this browser's tokens, never from
// what the page happened to be showing (decision 2026-09-29): a token left
// on by an earlier visit pushes this patient's doses to the phone just the
// same, whether or not today's visit got as far as "reminders are on".
export interface TokenRef { gid: string; id: string }

// `currentId`: the token this page load registered, if it got that far.
// `remembered`: the last one this browser registered on ANY visit.
// `gid` is null when the page never learned which record this is (the lookup
// failed); the remembered token carries its own.
export function signOutTargets(gid: string | null, currentId: string | null, remembered: TokenRef | null): TokenRef[] {
  const targets: TokenRef[] = []
  if (gid && currentId) targets.push({ gid, id: currentId })
  if (remembered && !targets.some((t) => t.gid === remembered.gid && t.id === remembered.id)) targets.push(remembered)
  return targets
}

// Only a token that is on. One that is already off is left exactly as it is
// — 'app_login' above all: rewriting that as 'web_signout' would make the
// next sign-in here switch web push back on beside the app's own reminders.
export function needsTurningOff(existing: ExistingToken | null): boolean {
  return existing !== null && existing.active !== false
}
