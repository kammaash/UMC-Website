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
}
interface ImportMeta { readonly env: ImportMetaEnv }

// The Maps JS script (lazy-loaded) attaches the `google` global at runtime.
interface Window {
  google?: typeof google
}
