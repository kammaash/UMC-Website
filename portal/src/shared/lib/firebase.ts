import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
}

export const app = initializeApp(firebaseConfig)

// App Check (see ../../../../.claude/SECURITY-PLAN.md §2a). Attaches a reCAPTCHA
// attestation token to Firestore/Functions/Auth requests so the backend can
// reject traffic that isn't from a genuine instance of the app. Guarded on the
// site key so the app still runs before the key is provisioned. NOTE: backend
// *enforcement* is a separate, coordinated step (the shared backend also serves
// the live phone app) — until it is enabled this only populates the App Check
// "monitoring" metrics and changes nothing functionally.
const appCheckSiteKey = import.meta.env.VITE_FB_APPCHECK_SITE_KEY
if (appCheckSiteKey) {
  // In dev, emit a debug token (logged to the console once) to register under
  // Firebase Console → App Check → Apps → Manage debug tokens.
  if (import.meta.env.DEV) {
    ;(self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app, 'asia-south1')
