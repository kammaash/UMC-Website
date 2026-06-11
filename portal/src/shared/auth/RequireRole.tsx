import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { resolveRoleAccess } from './access'

export function RequireRole({ role }: { role: string }) {
  const { status, profile } = useAuth()
  const access = resolveRoleAccess(role, { status, profile })

  if (access === 'loading') return <div style={{ padding: 40 }}>Loading…</div>
  if (access === 'unauthenticated') return <Navigate to="/login" replace />
  if (access === 'wrong-role' || access === 'no-profile') return <Navigate to="/wrong-role" replace />
  return <Outlet />
}
