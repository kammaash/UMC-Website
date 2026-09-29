// 'error': somebody IS signed in, but their users/{uid} profile could not be
// read (no connection, a rules refusal). Not the same as signed-in with no
// profile — that is a fact about the account, this is a failure to find out.
export type AuthStatus = 'unknown' | 'signed-out' | 'signed-in' | 'error'
// patientGroupID: written by claimGroup (server) for role patient; the reminders
// page uses it to skip the confirm card on a return visit.
// profilePhotoUrl: same Firestore field the app writes (users/{uid}, a
// Firebase Storage download URL) — reused as-is, never a new field.
export interface UserProfile { role: string; fullName?: string; patientGroupID?: string; profilePhotoUrl?: string }
export interface AccessInput {
  status: AuthStatus
  profile: UserProfile | null
}
export type Access = 'loading' | 'unauthenticated' | 'no-profile' | 'wrong-role' | 'allow'

export function resolveRoleAccess(role: string, { status, profile }: AccessInput): Access {
  // A profile that could not be read keeps waiting: passing it off as
  // "no profile" would bounce a doctor on a bad connection to wrong-role.
  if (status === 'unknown' || status === 'error') return 'loading'
  if (status === 'signed-out') return 'unauthenticated'
  if (!profile) return 'no-profile'
  return profile.role === role ? 'allow' : 'wrong-role'
}
