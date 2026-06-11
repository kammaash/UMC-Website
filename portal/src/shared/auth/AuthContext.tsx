import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, OAuthProvider,
  signInWithPhoneNumber, type ConfirmationResult, type ApplicationVerifier,
  signOut, type User,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { AuthStatus, UserProfile } from './access'

interface AuthValue {
  status: AuthStatus
  user: User | null
  profile: UserProfile | null
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signInWithPhone: (phoneNumber: string, verifier: ApplicationVerifier) => Promise<ConfirmationResult>
  logout: () => Promise<void>
}

const AuthCtx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('unknown')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (!u) { setProfile(null); setStatus('signed-out'); return }
      const snap = await getDoc(doc(db, 'users', u.uid))
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null)
      setStatus('signed-in')
    })
  }, [])

  const signInWithGoogle = async () => { await signInWithPopup(auth, new GoogleAuthProvider()) }
  const signInWithApple = async () => { await signInWithPopup(auth, new OAuthProvider('apple.com')) }
  const signInWithPhone = (phoneNumber: string, verifier: ApplicationVerifier) =>
    signInWithPhoneNumber(auth, phoneNumber, verifier)
  const logout = async () => { await signOut(auth) }

  return (
    <AuthCtx.Provider value={{ status, user, profile, signInWithGoogle, signInWithApple, signInWithPhone, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth(): AuthValue {
  const v = useContext(AuthCtx)
  if (!v) throw new Error('useAuth must be used within AuthProvider')
  return v
}
