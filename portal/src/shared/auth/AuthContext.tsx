import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, OAuthProvider,
  signInWithPhoneNumber, type ConfirmationResult, type ApplicationVerifier,
  signOut, deleteUser, type User,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { AuthStatus, UserProfile } from './access'

interface AuthValue {
  status: AuthStatus
  user: User | null
  profile: UserProfile | null
  signInWithGoogle: (forceSelect?: boolean) => Promise<void>
  signInWithApple: (forceSelect?: boolean) => Promise<void>
  signInWithPhone: (phoneNumber: string, verifier: ApplicationVerifier) => Promise<ConfirmationResult>
  logout: () => Promise<void>
  // True iff `users/{uid}` exists with a role — i.e. an already-registered member.
  isRegisteredUser: (uid: string) => Promise<boolean>
  // Undo a just-completed sign-in (deletes the freshly-created auth account so an
  // unregistered phone number doesn't leave an orphan; falls back to sign-out).
  rejectCurrentUser: () => Promise<void>
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

  // forceSelect → always show the account chooser instead of silently reusing
  // the provider's cached account (used after a wrong-role bounce so the
  // visitor can pick a different Google/Apple account).
  const signInWithGoogle = async (forceSelect = false) => {
    const provider = new GoogleAuthProvider()
    if (forceSelect) provider.setCustomParameters({ prompt: 'select_account' })
    await signInWithPopup(auth, provider)
  }
  const signInWithApple = async (forceSelect = false) => {
    const provider = new OAuthProvider('apple.com')
    if (forceSelect) provider.setCustomParameters({ prompt: 'login' })
    await signInWithPopup(auth, provider)
  }
  const signInWithPhone = (phoneNumber: string, verifier: ApplicationVerifier) =>
    signInWithPhoneNumber(auth, phoneNumber, verifier)
  const logout = async () => { await signOut(auth) }

  const isRegisteredUser = async (uid: string): Promise<boolean> => {
    const snap = await getDoc(doc(db, 'users', uid))
    return snap.exists() && !!(snap.data() as UserProfile | undefined)?.role
  }
  const rejectCurrentUser = async (): Promise<void> => {
    const u = auth.currentUser
    if (!u) return
    // delete() also signs the user out; fall back to a plain sign-out if it can't
    // (e.g. requires-recent-login — won't happen right after a fresh verify).
    try { await deleteUser(u) } catch { await signOut(auth) }
  }

  return (
    <AuthCtx.Provider value={{
      status, user, profile,
      signInWithGoogle, signInWithApple, signInWithPhone, logout,
      isRegisteredUser, rejectCurrentUser,
    }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth(): AuthValue {
  const v = useContext(AuthCtx)
  if (!v) throw new Error('useAuth must be used within AuthProvider')
  return v
}
