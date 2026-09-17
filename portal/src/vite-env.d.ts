/// <reference types="vite/client" />
/// <reference types="google.maps" />

interface ImportMetaEnv {
  readonly VITE_FB_API_KEY: string
  readonly VITE_FB_AUTH_DOMAIN: string
  readonly VITE_FB_PROJECT_ID: string
  readonly VITE_FB_STORAGE_BUCKET: string
  readonly VITE_FB_MESSAGING_SENDER_ID: string
  readonly VITE_FB_APP_ID: string
  // Optional: the picker degrades to manual entry when unset (incremental rollout).
  readonly VITE_GMAPS_API_KEY?: string
  // Web Push certificate public key (Firebase Console → Cloud Messaging → Web
  // configuration). Optional: without it the reminders page can sign in and
  // claim but cannot register a push token. Public config, not a secret.
  readonly VITE_FB_VAPID_KEY?: string
  // Optional: reCAPTCHA v3 App Check site key; App Check stays off when unset.
  readonly VITE_FB_APPCHECK_SITE_KEY?: string
}
interface ImportMeta { readonly env: ImportMetaEnv }

// The Maps JS script (lazy-loaded) attaches the `google` global at runtime.
interface Window {
  google?: typeof google
}
