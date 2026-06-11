import { useAuth } from '../shared/auth/AuthContext'

export function WrongRolePage() {
  const { logout } = useAuth()
  return (
    <main style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <h1 style={{ fontFamily: 'var(--serif)' }}>No portal for this account yet</h1>
        <p style={{ color: 'var(--ink-soft)' }}>
          This account isn't set up for a web portal. Use the UMC app, or sign in with a doctor account.
        </p>
        <button onClick={logout} style={{ marginTop: 12, padding: '10px 20px', borderRadius: 999,
          border: '1px solid var(--line)', background: 'var(--bg-2)', cursor: 'pointer' }}>Sign out</button>
      </div>
    </main>
  )
}
