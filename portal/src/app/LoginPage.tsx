import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../shared/auth/AuthContext'

export function LoginPage() {
  const { status, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (status === 'signed-in') navigate('/', { replace: true })  // RoleLanding routes by role
  }, [status, navigate])

  return (
    <main style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 48, margin: '0 0 8px' }}>UMC Portal</h1>
        <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>Sign in with your UMC account.</p>
        <button onClick={signInWithGoogle} style={{
          marginTop: 16, padding: '14px 26px', borderRadius: 999, border: '1px solid var(--line)',
          background: 'var(--bg-2)', boxShadow: 'var(--neo-rest)', cursor: 'pointer',
          fontFamily: 'var(--sans)', fontSize: 16,
        }}>Continue with Google</button>
      </div>
    </main>
  )
}
