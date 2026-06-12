import { Navigate } from 'react-router-dom'
import { useAuth } from '../shared/auth/AuthContext'

// Roles that currently have a web portal. Add 'pharmacy'/'diagnostics' here when built.
const SUPPORTED_ROLES = new Set(['doctor'])

export function RoleLanding() {
  const { status, profile } = useAuth()
  if (status === 'unknown') return <div style={{ padding: 40 }}>Loading…</div>
  if (status === 'signed-out') return <Navigate to="/login" replace />
  if (!profile || !SUPPORTED_ROLES.has(profile.role)) return <Navigate to="/login" replace state={{ error: 'wrong-role' }} />
  return <Navigate to={`/${profile.role}`} replace />
}
