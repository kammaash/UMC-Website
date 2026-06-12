import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { resolveRoleAccess } from './access'

export function RequireRole({ role }: { role: string }) {
  const { status, profile } = useAuth()
  const access = resolveRoleAccess(role, { status, profile })

  // Sign-in lives at the site root (/login) — leave the SPA with a full-page
  // redirect rather than a router Navigate into /member.
  const redirect = access === 'unauthenticated'
    ? '/login'
    : access === 'wrong-role' || access === 'no-profile'
      ? '/login?e=wrong-role'
      : null
  useEffect(() => { if (redirect) window.location.href = redirect }, [redirect])

  if (access === 'loading' || redirect) return <div style={{ padding: 40 }}>Loading…</div>
  return <Outlet />
}
