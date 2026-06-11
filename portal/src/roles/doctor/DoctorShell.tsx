import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthContext'

const NAV = [
  { to: '/doctor', label: 'Home', end: true },
  { to: '/doctor/schedule', label: 'Schedule' },
  { to: '/doctor/patients', label: 'Patients' },
  { to: '/doctor/notes', label: 'Notes' },
  { to: '/doctor/finance', label: 'Finance' },
  { to: '/doctor/settings', label: 'Settings' },
]

export function DoctorShell() {
  const { user, logout } = useAuth()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: '100%' }}>
      <aside style={{ background: 'var(--bg-2)', borderRight: '1px solid var(--line)', padding: 24,
        display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, marginBottom: 20 }}>UMC · Doctor</div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} style={({ isActive }) => ({
            padding: '10px 14px', borderRadius: 10, textDecoration: 'none',
            fontFamily: 'var(--sans)', color: isActive ? 'var(--bg)' : 'var(--ink)',
            background: isActive ? 'var(--ink)' : 'transparent',
          })}>{n.label}</NavLink>
        ))}
        <div style={{ marginTop: 'auto', fontSize: 12, color: 'var(--ink-faint)' }}>
          <div>{user?.email}</div>
          <button onClick={logout} style={{ marginTop: 8, background: 'none', border: 'none',
            color: 'var(--ink-soft)', cursor: 'pointer', padding: 0 }}>Sign out</button>
        </div>
      </aside>
      <main style={{ padding: 40, overflowY: 'auto' }}><Outlet /></main>
    </div>
  )
}
