import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthContext'
import { Icon } from '../../shared/design/icons'

const NAV = [
  { to: '/dashboard', label: 'Home', icon: 'eventAvailable', end: true },
  { to: '/dashboard/schedule', label: 'Schedule', icon: 'calendar' },
  { to: '/dashboard/patients', label: 'Patients', icon: 'people' },
  { to: '/dashboard/notes', label: 'Notes', icon: 'description' },
  { to: '/dashboard/finance', label: 'Finance', icon: 'payments' },
  { to: '/dashboard/settings', label: 'Settings', icon: 'settings' },
]

export function DoctorShell() {
  const { user, profile, logout } = useAuth()
  const name = (profile as { fullName?: string } | null)?.fullName
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '256px 1fr', height: '100%', background: 'var(--surface)' }}>
      <aside style={{
        background: 'var(--surface)', borderRight: '1px solid var(--line)', padding: '28px 20px',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ padding: '0 8px 8px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 4 }}>
            Unified Medical Care
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--ink)' }}>Doctor</div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 16 }}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', borderRadius: 'var(--r-md)', textDecoration: 'none',
              fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 600,
              color: isActive ? 'var(--surface)' : 'var(--ink-soft)',
              background: isActive ? 'var(--ink)' : 'transparent',
              boxShadow: isActive ? 'var(--neo-cta)' : 'none',
              transition: 'background .2s, color .2s',
            })}>
              <Icon name={n.icon} size={19} />{n.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: '0 8px' }}>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            {name || 'Doctor'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.email}
          </div>
          <button onClick={logout} style={{
            marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
            color: 'var(--ink-soft)', cursor: 'pointer', padding: 0, fontFamily: 'var(--sans)', fontSize: 13,
          }}>
            <Icon name="logout" size={16} />Sign out
          </button>
        </div>
      </aside>

      <main style={{ padding: '48px 56px', overflowY: 'auto' }}><Outlet /></main>
    </div>
  )
}
