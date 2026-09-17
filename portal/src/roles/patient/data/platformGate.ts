// platformGate.ts — pure: can THIS browser receive web push, and if not, why.
//
// Web push on iPhone needs iOS 16.4+ AND the page running as a Home Screen web
// app (Safari and every other iOS browser lack PushManager in a tab). A Home
// Screen app has its own storage, so the patient should add it BEFORE signing
// in — otherwise they sign in twice (harmless; the claim is idempotent).
export interface PlatformFacts {
  ua: string
  standalone: boolean        // navigator.standalone (iOS) or display-mode: standalone
  hasServiceWorker: boolean
  hasPushManager: boolean
  hasNotification: boolean
}
export type PushGate = 'ok' | 'ios-add-to-home' | 'ios-too-old' | 'unsupported'
// Stored on the token doc; the sender/dashboards read it.
export type TokenPlatform = 'android-chrome' | 'ios-homescreen' | 'other'
export interface Platform {
  os: 'ios' | 'android' | 'other'
  iosVersion: [number, number] | null
  standalone: boolean
  gate: PushGate
  tokenPlatform: TokenPlatform
}

const IOS_MIN: [number, number] = [16, 4]

export function iosVersion(ua: string): [number, number] | null {
  if (!/iPhone|iPad|iPod/.test(ua)) return null
  const m = /OS (\d+)_(\d+)/.exec(ua)
  return m ? [Number(m[1]), Number(m[2])] : null
}

export function detectPlatform(f: PlatformFacts): Platform {
  const ua = f.ua || ''
  const isIos = /iPhone|iPad|iPod/.test(ua)   // iPadOS "desktop" UA reads as Macintosh → 'other' (desktop Safari push works in a tab)
  const isAndroid = /Android/.test(ua)
  const apis = f.hasServiceWorker && f.hasPushManager && f.hasNotification
  const version = iosVersion(ua)
  const os = isIos ? 'ios' : isAndroid ? 'android' : 'other'

  let gate: PushGate
  if (isIos) {
    const tooOld = !!version && (version[0] < IOS_MIN[0] || (version[0] === IOS_MIN[0] && version[1] < IOS_MIN[1]))
    gate = tooOld ? 'ios-too-old' : !f.standalone ? 'ios-add-to-home' : apis ? 'ok' : 'unsupported'
  } else {
    gate = apis ? 'ok' : 'unsupported'
  }
  const tokenPlatform: TokenPlatform =
    isIos && f.standalone ? 'ios-homescreen'
    : isAndroid && /Chrome\//.test(ua) ? 'android-chrome'
    : 'other'
  return { os, iosVersion: version, standalone: f.standalone, gate, tokenPlatform }
}
