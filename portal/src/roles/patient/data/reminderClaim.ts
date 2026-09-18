// reminderClaim.ts — the claim step's Firebase actions (pages import only
// data/ modules). Decisions live in claimDecision.ts; this file just talks to
// the backend.
import { deleteUser, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../../../shared/lib/firebase'
import { callable } from '../../../shared/data/callable'
import { browserTimezone, type ClaimPreview } from './claimDecision'

// Neither callable is App-Check-armed (the Phase C trio stays unarmed by
// decision), so this works with no attestation token at all.
const previewGroupClaim = callable<Record<string, never>, ClaimPreview>('previewGroupClaim')
const claimGroupFn = callable<{ groupId: string; timezone: string }, { ok: boolean; groupId: string; fullName: string }>('claimGroup')

// No arguments: the server finds the doctor-created group by the OTP-proven
// phone on the auth token. Fails open to { found:false } server-side.
export function previewClaim(): Promise<ClaimPreview> {
  return previewGroupClaim({})
}

export function claimGroup(groupId: string) {
  const tz = browserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  return claimGroupFn({ groupId, timezone: tz })
}

export async function usersDocExists(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists()
}

// (a) of the no-match rule: the OTP just created an orphan Auth account.
// deleteUser also signs out; if it cannot (requires-recent-login won't
// happen right after a fresh verify, but be safe) fall back to sign-out so
// the visitor is never left signed in as a phantom.
export async function deleteOrphanAccount(): Promise<void> {
  const u = auth.currentUser
  if (!u) return
  try { await deleteUser(u) } catch { await signOut(auth) }
}

export async function signOutExisting(): Promise<void> {
  await signOut(auth)
}

// claimGroup only writes { role:'patient', patientGroupID } — never the
// patient's name — so users/{uid}.fullName is set here, best-effort, from
// whatever name the doctor's record carries. Only writes when it's missing
// or stale; never overwrites a name that already matches. A permission-denied
// here means the Firestore rule for a patient's own users/{uid} write needs
// widening in tablet_reminder — this fails silently rather than blocking claim.
export async function syncPatientName(uid: string, currentFullName: string | undefined, patientName: string): Promise<void> {
  const name = (patientName || '').trim()
  if (!name || (currentFullName || '').trim() === name) return
  await setDoc(doc(db, 'users', uid), { fullName: name }, { merge: true })
}
