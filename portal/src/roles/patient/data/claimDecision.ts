// claimDecision.ts — pure decisions for the reminders page's claim step.
// No Firebase here; the page feeds these the facts and acts on the verdict.
//
// Server contract (tablet_reminder functions/index.js):
//   previewGroupClaim()  → { found:false } | { found:true, groupId, patientName, doctorName, isPrimary }
//     (no args: finds the doctor-created group by the OTP-proven phone; fails OPEN to found:false)
//   claimGroup({ groupId, timezone }) → { ok:true, groupId, fullName }
//     errors: failed-precondition (already on another account / record gone),
//             permission-denied (record is not for this phone)

export interface ClaimPreview {
  found: boolean
  groupId?: string
  patientName?: string
  doctorName?: string
  isPrimary?: boolean
}

export type AfterPreview =
  | { kind: 'already-claimed'; groupId: string; doctorName?: string }   // returning patient: users doc already points at a group
  | { kind: 'confirm'; groupId: string; patientName: string; doctorName: string }
  | { kind: 'other-account' }                      // group found but claimed by a different uid
  | { kind: 'no-match' }

// The users/{uid} doc is what claimGroup writes on success, so a patient who
// already carries patientGroupID has been through this before (here or in the
// app) and must not see the confirm card again.
export function decideAfterPreview(
  preview: ClaimPreview,
  profile: { role?: string; patientGroupID?: string } | null,
): AfterPreview {
  const gid = (profile?.patientGroupID || '').trim()
  if (profile?.role === 'patient' && gid) {
    // The preview often can't see an already-claimed group at all (found:false),
    // so a doctor name here is best-effort — only given when the preview has one.
    const doctorName = (preview.doctorName || '').trim()
    return { kind: 'already-claimed', groupId: gid, ...(doctorName ? { doctorName } : {}) }
  }
  if (!preview.found || !preview.groupId) return { kind: 'no-match' }
  if (preview.isPrimary === false) return { kind: 'other-account' }
  return {
    kind: 'confirm',
    groupId: preview.groupId,
    patientName: (preview.patientName || '').trim() || 'Patient',
    doctorName: (preview.doctorName || '').trim(),
  }
}

// No claimable record for this phone. Two very different people land here
// (decision 2026-09-17, mirrors the member portal's rule exactly):
//  (a) no users/{uid} doc → the OTP just minted an orphan Auth account; delete it.
//  (b) a users doc exists → an existing UMC account (an app patient whose group
//      is already claimed, or a provider); NEVER delete — plain sign-out.
export type NoMatchAction = 'delete-orphan' | 'sign-out-existing'
export function decideNoMatch(usersDocExists: boolean): NoMatchAction {
  return usersDocExists ? 'sign-out-existing' : 'delete-orphan'
}

// IANA zone for claimGroup. The site is India-only, so a browser that cannot
// report a zone gets Asia/Kolkata rather than leaving the group on whatever
// default the doctor's app wrote (older groups carry America/New_York).
export function browserTimezone(resolved: string | undefined): string {
  const z = (resolved || '').trim()
  return z || 'Asia/Kolkata'
}

function errCode(err: unknown): string {
  return err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : ''
}
// claimGroup failure → why, for the page to word in the patient's language
// (i18n/strings.ts claim.errors). Codes arrive as "functions/<code>" from the
// web SDK.
export type ClaimErrorReason = 'failed-precondition' | 'permission-denied' | 'unauthenticated' | 'generic'
export function claimErrorReason(err: unknown): ClaimErrorReason {
  switch (errCode(err).replace(/^functions\//, '')) {
    case 'failed-precondition': return 'failed-precondition'
    case 'permission-denied':   return 'permission-denied'
    case 'unauthenticated':     return 'unauthenticated'
    default:                    return 'generic'
  }
}
