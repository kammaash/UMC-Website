// platformGate.ts — pure: can THIS browser receive web push, and if not, why.
//
// Web push on iPhone needs iOS 16.4+ AND the page running as a Home Screen web
// app (Safari and every other iOS browser lack PushManager in a tab). A Home
// Screen app has its own storage, so the patient should add it BEFORE signing
// in — otherwise they sign in twice (harmless; the claim is idempotent).
//
// Decision 2026-09-17: every Apple platform (iPhone, iPad — including iPadOS's
// "desktop site" UA, which reads as Macintosh — and a real Mac) requires the
// same install-first step, no exceptions. Simpler and more reliable than
// trying to prove a given Mac/iPad browser doesn't need it.
export interface PlatformFacts {
  ua: string
  standalone: boolean        // navigator.standalone (iOS) or display-mode: standalone
  maxTouchPoints: number     // a "Macintosh" UA with touch is an iPad, not a Mac
  hasServiceWorker: boolean
  hasPushManager: boolean
  hasNotification: boolean
}
export type PushGate = 'ok' | 'ios-add-to-home' | 'ios-too-old' | 'unsupported'
// The Apple devices whose install steps differ from one another.
export type InstallOs = 'iphone' | 'ipad' | 'mac'
export type Browser = 'safari' | 'chromium' | 'firefox' | 'other'
// The corner of the screen the button actually lives in, so the sketched
// arrow can be pinned to the viewport edge nearest it.
export type InstallTarget = 'bottom-center' | 'bottom-right' | 'top-right'
// Stored on the token doc; the sender/dashboards read it.
export type TokenPlatform = 'android-chrome' | 'ios-homescreen' | 'other'
export interface Platform {
  browser: Browser
  // Safari's own major version. iOS 26 froze the OS in Safari's UA at 18_6,
  // so this — not iosVersion — is what says which Safari layout is on screen.
  safariVersion: number | null
  // Split three ways across Apple because the install steps differ per device
  // (Share at the bottom on an iPhone, top-right on an iPad, File → Add to
  // Dock on a Mac). The gate below stays identical for all three.
  os: 'iphone' | 'ipad' | 'mac' | 'android' | 'other'
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

export function safariVersion(ua: string): number | null {
  if (/Chrome\/|Chromium\/|CriOS\/|FxiOS\/|Firefox\/|Edg(?:iOS|A|)\//.test(ua)) return null
  const m = /Version\/(\d+)/.exec(ua)
  return m ? Number(m[1]) : null
}

export function detectPlatform(f: PlatformFacts): Platform {
  const ua = f.ua || ''
  const macUa = /Macintosh/.test(ua)
  // iPadOS reports a Mac UA by default ("Request Desktop Website" is on for
  // iPads since iPadOS 13); touch support is what tells the two apart. A real
  // Mac reports maxTouchPoints 0 even with a trackpad or a touch display.
  const isIpad = /iPad/.test(ua) || (macUa && f.maxTouchPoints > 1)
  const isIphone = !isIpad && /iPhone|iPod/.test(ua)
  const isIos = isIphone || isIpad
  const isMac = !isIos && macUa
  const isApple = isIos || isMac
  const isAndroid = /Android/.test(ua)
  const apis = f.hasServiceWorker && f.hasPushManager && f.hasNotification
  const version = iosVersion(ua)
  // Chrome and Edge both carry "Safari/" in their UA, so they are ruled out
  // first; CriOS is Chrome on iOS.
  const browser: Browser =
    /Chrome\/|Chromium\/|CriOS\/|Edg(?:iOS|A|)\//.test(ua) ? 'chromium'
    : /Firefox\/|FxiOS\//.test(ua) ? 'firefox'
    : /Safari\//.test(ua) ? 'safari'
    : 'other'
  const os: Platform['os'] =
    isIphone ? 'iphone' : isIpad ? 'ipad' : isMac ? 'mac' : isAndroid ? 'android' : 'other'

  let gate: PushGate
  if (isApple) {
    const tooOld = !!version && (version[0] < IOS_MIN[0] || (version[0] === IOS_MIN[0] && version[1] < IOS_MIN[1]))
    gate = tooOld ? 'ios-too-old' : !f.standalone ? 'ios-add-to-home' : apis ? 'ok' : 'unsupported'
  } else {
    gate = apis ? 'ok' : 'unsupported'
  }
  const tokenPlatform: TokenPlatform =
    isApple && f.standalone ? 'ios-homescreen'
    : isAndroid && /Chrome\//.test(ua) ? 'android-chrome'
    : 'other'
  return { os, browser, safariVersion: safariVersion(ua), iosVersion: version, standalone: f.standalone, gate, tokenPlatform }
}

// Which device's install steps to show. Null on anything that can take push in
// a plain tab — there is no step for those to follow.
export function installOs(os: Platform['os']): InstallOs | null {
  return os === 'iphone' || os === 'ipad' || os === 'mac' ? os : null
}

// Where the button the patient taps first actually is on screen, per Apple's
// iOS/iPadOS 26–27 user guides:
//   iPhone, Safari 26+ — every layout keeps its controls at the bottom; the
//            default (Compact) hides Share behind the ⋯ Page Menu button at
//            the bottom RIGHT. Bottom/Top layouts show Share in the bottom
//            toolbar instead — the page cannot tell which layout is on, so it
//            aims at the default and the step text covers the other.
//   iPhone, older Safari — Share is the middle of the bottom toolbar.
//   iPad   — Share in the top toolbar, right-hand end (Separate Tab Bar,
//            the default).
// Null — no arrow — on a Mac (decision 2026-09-18: arrows on iPhone and iPad
// only) and in any non-Safari browser, whose toolbars differ and can move.
export function installTarget(os: InstallOs, browser: Browser, safari: number | null): InstallTarget | null {
  if (os === 'mac' || browser !== 'safari') return null
  if (os === 'ipad') return 'top-right'
  return safari !== null && safari >= 26 ? 'bottom-right' : 'bottom-center'
}
