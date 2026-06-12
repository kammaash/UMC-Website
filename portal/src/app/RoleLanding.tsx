import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../shared/auth/AuthContext'

// Roles that currently have a web portal. Add 'pharmacy'/'diagnostics' here when built.
const SUPPORTED_ROLES = new Set(['doctor'])

export function RoleLanding() {
  const { status, profile } = useAuth()
  // Sign-in lives at the site root (/login), a different mount from /member —
  // so leave the SPA with a full-page redirect rather than a router Navigate.
  const redirect = status === 'signed-out'
    ? '/login'
    : status === 'signed-in' && (!profile || !SUPPORTED_ROLES.has(profile.role))
      ? '/login?e=wrong-role'
      : null
  useEffect(() => { if (redirect) window.location.href = redirect }, [redirect])

  if (status === 'unknown' || redirect) return <div style={{ padding: 40 }}>Loading…</div>
  // Single role today (doctor); its portal lives at /dashboard.
  return <Navigate to="/dashboard" replace />
}
