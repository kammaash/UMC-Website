import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../shared/design/primitives'
import { loadGoogleMaps } from '../../../shared/lib/googleMaps'
import { stateCenter, INDIA_CENTER } from '../data/stateCenters'

export interface PickerResult {
  address: string
  lat: number
  lng: number
}

interface Props {
  initialAddress: string
  initialLat: number | null
  initialLng: number | null
  fallbackState: string | null
  onConfirm: (r: PickerResult) => void
  onClose: () => void
}

const css = `
  .clp-overlay {
    position: fixed; inset: 0; z-index: 300;
    background: rgba(20,20,20,0.40);
    display: grid; place-items: center; padding: 20px;
  }
  .clp-modal {
    position: relative; overflow: hidden;
    width: min(960px, 94vw); height: min(720px, 88vh);
    background: var(--card); border-radius: 22px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.35);
    display: flex; flex-direction: column;
  }
  .clp-map { position: absolute; inset: 0; }

  /* fixed center pin */
  .clp-pin {
    position: absolute; left: 50%; top: 50%;
    transform: translate(-50%, -100%); margin-top: -18px;
    pointer-events: none; z-index: 5;
    color: #e53935; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));
  }
  .clp-pin svg { width: 40px; height: 40px; display: block; }

  /* top bar: search + close */
  .clp-top {
    position: absolute; top: 14px; left: 14px; right: 14px; z-index: 6;
    display: flex; gap: 10px; align-items: flex-start;
  }
  .clp-search {
    flex: 1; background: rgba(255,255,255,0.92);
    border: 1px solid var(--line); border-radius: 14px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.12);
    backdrop-filter: blur(6px);
  }
  .clp-search-row { display: flex; align-items: center; height: 48px; padding: 0 14px; gap: 10px; }
  .clp-search input {
    flex: 1; border: none; background: transparent; outline: none;
    font-family: var(--sans); font-size: 15px; color: var(--ink);
  }
  .clp-search input::placeholder { color: var(--ink-faint); }
  .clp-results { border-top: 1px solid var(--line); max-height: 260px; overflow-y: auto; }
  .clp-result {
    display: flex; gap: 10px; align-items: flex-start;
    padding: 11px 14px; cursor: pointer;
    font-family: var(--sans); font-size: 13.5px; color: var(--ink);
    border-top: 1px solid var(--line-2);
  }
  .clp-result:first-child { border-top: none; }
  .clp-result:hover { background: rgba(66,66,66,0.05); }
  .clp-result svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; color: var(--ink-faint); }

  .clp-iconbtn {
    width: 48px; height: 48px; flex-shrink: 0;
    display: grid; place-items: center; cursor: pointer;
    background: rgba(255,255,255,0.92); color: var(--ink);
    border: 1px solid var(--line); border-radius: 14px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.12);
  }
  .clp-iconbtn:hover { background: #fff; }
  .clp-iconbtn svg { width: 20px; height: 20px; }

  /* my-location FAB */
  .clp-fab {
    position: absolute; right: 16px; bottom: 132px; z-index: 6;
    width: 46px; height: 46px; border-radius: 50%;
    display: grid; place-items: center; cursor: pointer;
    background: rgba(255,255,255,0.95); color: var(--ink);
    border: 1px solid var(--line); box-shadow: 0 6px 20px rgba(0,0,0,0.16);
  }
  .clp-fab:hover { background: #fff; }
  .clp-fab svg { width: 22px; height: 22px; }

  /* bottom address bar */
  .clp-bottom {
    position: absolute; left: 0; right: 0; bottom: 0; z-index: 6;
    background: rgba(255,255,255,0.96); backdrop-filter: blur(8px);
    border-top: 1px solid var(--line);
    padding: 16px 20px calc(16px + env(safe-area-inset-bottom));
    display: flex; flex-direction: column; gap: 14px;
  }
  .clp-addr { display: flex; gap: 12px; align-items: center; min-height: 40px; }
  .clp-addr-ico {
    width: 40px; height: 40px; flex-shrink: 0; border-radius: 50%;
    display: grid; place-items: center;
    background: rgba(229,57,53,0.12); color: #e53935;
  }
  .clp-addr-ico svg { width: 20px; height: 20px; }
  .clp-addr-text { font-family: var(--sans); font-size: 14px; color: var(--ink); line-height: 1.4; }
  .clp-addr-text.muted { color: var(--ink-faint); }
  .clp-actions { display: flex; gap: 10px; }

  /* loading + error states */
  .clp-center { position: absolute; inset: 0; display: grid; place-items: center; padding: 32px; }
  .clp-fallback { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 14px; }
  .clp-fallback h3 { font-family: var(--serif); font-size: 20px; color: var(--ink); margin: 0; }
  .clp-fallback p { font-family: var(--sans); font-size: 13px; color: var(--ink-soft); margin: 0; }
`

export function ClinicLocationPicker({
  initialAddress, initialLat, initialLng, fallbackState, onConfirm, onClose,
}: Props) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [address, setAddress] = useState(initialAddress)
  const [geocoding, setGeocoding] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [predictions, setPredictions] = useState<{ description: string; placeId: string }[]>([])
  const [showResults, setShowResults] = useState(false)
  const [manualAddress, setManualAddress] = useState(initialAddress)

  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const autoRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesRef = useRef<google.maps.places.PlacesService | null>(null)
  const skipNextIdle = useRef(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Esc closes the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !mapEl.current) return
        setupMap(maps)
      })
      .catch(() => { if (!cancelled) setStatus('error') })

    return () => {
      cancelled = true
      if (debounce.current) clearTimeout(debounce.current)
      if (window.google?.maps && mapRef.current) {
        window.google.maps.event.clearInstanceListeners(mapRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function reverseGeocode(lat: number, lng: number) {
    if (!geocoderRef.current) return
    setGeocoding(true)
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, gstatus) => {
      setGeocoding(false)
      if (gstatus === 'OK' && results && results[0]) setAddress(results[0].formatted_address)
    })
  }

  function setupMap(maps: typeof google.maps) {
    const hasInitial = initialLat != null && initialLng != null
    const fallback = stateCenter(fallbackState)
    const center0 = hasInitial
      ? { lat: initialLat as number, lng: initialLng as number }
      : (fallback ?? INDIA_CENTER)
    const zoom0 = hasInitial ? 16 : fallback ? 6.5 : 4.2

    const map = new maps.Map(mapEl.current as HTMLDivElement, {
      center: center0, zoom: zoom0,
      disableDefaultUI: true, clickableIcons: false, gestureHandling: 'greedy',
    })
    mapRef.current = map
    geocoderRef.current = new maps.Geocoder()
    autoRef.current = new maps.places.AutocompleteService()
    placesRef.current = new maps.places.PlacesService(map)

    // Ignore the initial render idle (and the region-centroid fallback, which
    // has no meaningful street address until the doctor moves the map).
    skipNextIdle.current = true
    map.addListener('idle', () => {
      if (skipNextIdle.current) { skipNextIdle.current = false; return }
      const c = map.getCenter()
      if (c) reverseGeocode(c.lat(), c.lng())
    })

    if (hasInitial) {
      setAddress(initialAddress)
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          map.setZoom(16) // idle (not skipped) reverse-geocodes the GPS spot
        },
        () => {/* denied/unavailable → keep state/India fallback */},
        { timeout: 8000 },
      )
    }
    setStatus('ready')
  }

  function onSearchChange(v: string) {
    setSearchInput(v)
    if (debounce.current) clearTimeout(debounce.current)
    if (v.trim().length < 3) { setPredictions([]); setShowResults(false); return }
    debounce.current = setTimeout(() => {
      autoRef.current?.getPlacePredictions(
        { input: v, componentRestrictions: { country: 'in' } },
        (preds, pstatus) => {
          if (pstatus === 'OK' && preds) {
            setPredictions(preds.map((p) => ({ description: p.description, placeId: p.place_id })))
            setShowResults(true)
          } else { setPredictions([]); setShowResults(false) }
        },
      )
    }, 400)
  }

  function selectPrediction(p: { description: string; placeId: string }) {
    setShowResults(false)
    setSearchInput('')
    placesRef.current?.getDetails({ placeId: p.placeId, fields: ['geometry'] }, (place, dstatus) => {
      if (dstatus === 'OK' && place?.geometry?.location) {
        skipNextIdle.current = true // we set the address from the prediction
        mapRef.current?.panTo(place.geometry.location)
        mapRef.current?.setZoom(16)
        setAddress(p.description)
      }
    })
  }

  function goToCurrentLocation() {
    if (!navigator.geolocation || !mapRef.current) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        mapRef.current?.setZoom(16)
      },
      () => {/* ignore */},
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  function confirm() {
    const c = mapRef.current?.getCenter()
    if (!c || !address.trim()) return
    onConfirm({ address: address.trim(), lat: c.lat(), lng: c.lng() })
  }

  return (
    <div className="clp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <style>{css}</style>
      <div className="clp-modal">
        {status === 'error' ? (
          <div className="clp-center">
            <div className="clp-fallback">
              <h3>Enter clinic address</h3>
              <p>The map couldn’t load. Type your clinic address instead — you can set the exact pin later.</p>
              <textarea
                className="umc-textarea"
                placeholder="Clinic address"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
              />
              <div className="clp-actions">
                <Button variant="ghost" full onClick={onClose}>Cancel</Button>
                <Button
                  full
                  disabled={manualAddress.trim() === ''}
                  onClick={() => onConfirm({ address: manualAddress.trim(), lat: NaN, lng: NaN })}
                >
                  Use this address
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div ref={mapEl} className="clp-map" />

            {status === 'loading' && (
              <div className="clp-center"><span className="umc-spin" /></div>
            )}

            {status === 'ready' && (
              <>
                {/* fixed center pin */}
                <div className="clp-pin" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                  </svg>
                </div>

                {/* top: search + close */}
                <div className="clp-top">
                  <div className="clp-search">
                    <div className="clp-search-row">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
                      </svg>
                      <input
                        value={searchInput}
                        placeholder="Search location"
                        onChange={(e) => onSearchChange(e.target.value)}
                      />
                    </div>
                    {showResults && predictions.length > 0 && (
                      <div className="clp-results">
                        {predictions.map((p) => (
                          <div key={p.placeId} className="clp-result" onClick={() => selectPrediction(p)}>
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg>
                            <span>{p.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="clp-iconbtn" role="button" aria-label="Close" onClick={onClose}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </div>
                </div>

                {/* my-location */}
                <div className="clp-fab" role="button" aria-label="My location" onClick={goToCurrentLocation}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                  </svg>
                </div>

                {/* bottom: address + confirm */}
                <div className="clp-bottom">
                  <div className="clp-addr">
                    <div className="clp-addr-ico">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg>
                    </div>
                    <div className={`clp-addr-text${address.trim() === '' ? ' muted' : ''}`}>
                      {geocoding ? 'Getting address…' : address.trim() === '' ? 'Move the map to select a location' : address}
                    </div>
                  </div>
                  <div className="clp-actions">
                    <Button variant="ghost" full onClick={onClose}>Cancel</Button>
                    <Button full disabled={address.trim() === ''} onClick={confirm}>Confirm Location</Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
