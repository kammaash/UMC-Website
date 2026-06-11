export type AuthStatus = 'unknown' | 'signed-out' | 'signed-in'
export interface UserProfile { role: string; fullName?: string }
export interface AccessInput {
  status: AuthStatus
  profile: UserProfile | null
}
export type Access = 'loading' | 'unauthenticated' | 'no-profile' | 'wrong-role' | 'allow'

export function resolveRoleAccess(role: string, { status, profile }: AccessInput): Access {
  if (status === 'unknown') return 'loading'
  if (status === 'signed-out') return 'unauthenticated'
  if (!profile) return 'no-profile'
  return profile.role === role ? 'allow' : 'wrong-role'
}
