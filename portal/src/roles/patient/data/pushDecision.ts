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
