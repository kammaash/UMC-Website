/**
 * Lazily load the Google Maps JavaScript API (+ Places library) exactly once.
 *
 * The script is only injected when something first calls this (i.e. when the
 * clinic location picker opens), so the initial bundle is unaffected. The key
 * comes from `VITE_GMAPS_API_KEY`; callers handle the rejection by falling back
 * to manual address entry, so a missing/blocked key never hard-blocks the page.
 */
let promise: Promise<typeof google.maps> | null = null

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (promise) return promise

  const key = import.meta.env.VITE_GMAPS_API_KEY as string | undefined
  if (!key) return Promise.reject(new Error('Google Maps API key is not configured'))

  promise = new Promise<typeof google.maps>((resolve, reject) => {
    if (window.google?.maps) {
      resolve(window.google.maps)
      return
    }
    const script = document.createElement('script')
    // Classic loader (no `loading=async`): google.maps.Map / Geocoder / places
    // are ready as direct constructors once the script's onload fires.
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` +
      `&libraries=places`
    script.async = true
    script.onerror = () => {
      promise = null // allow a retry on the next open
      reject(new Error('Failed to load Google Maps'))
    }
    script.onload = () => {
      if (window.google?.maps?.Map) resolve(window.google.maps)
      else {
        promise = null
        reject(new Error('Google Maps unavailable after load'))
      }
    }
    document.head.appendChild(script)
  })
  return promise
}
