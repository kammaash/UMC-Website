import { describe, it, expect } from 'vitest'
import { detectPlatform, iosVersion, installOs, installTarget, safariVersion } from './platformGate'

const IOS17 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IOS163 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1'
const IOS_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1'
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36'
// iPadOS's "desktop site" UA is byte-identical to a real Mac's; only
// maxTouchPoints tells them apart.
const MAC_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
// An iPad that has NOT been switched to "Request Desktop Website".
const IPAD_MOBILE = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const MAC_CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
// iOS 26 freezes the OS in Safari's UA at 18_6; only Version/ tells the truth.
const IOS26 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const all = { maxTouchPoints: 0, hasServiceWorker: true, hasPushManager: true, hasNotification: true }

describe('iosVersion', () => {
  it('parses major.minor from the UA', () => { expect(iosVersion(IOS17)).toEqual([17, 5]) })
  it('is null off iOS', () => { expect(iosVersion(ANDROID_CHROME)).toBeNull() })
})

describe('detectPlatform', () => {
  it('iOS < 16.4 → too old, whatever else is true', () => {
    expect(detectPlatform({ ua: IOS163, standalone: true, ...all }).gate).toBe('ios-too-old')
  })
  it('iOS 16.4+ in a browser tab → add to Home Screen (PushManager absent in a tab)', () => {
    const p = detectPlatform({ ua: IOS17, standalone: false, hasServiceWorker: true, hasPushManager: false, hasNotification: false })
    expect(p.gate).toBe('ios-add-to-home')
    expect(p.os).toBe('iphone')
  })
  it('iOS Chrome tab is gated the same way (any iOS browser)', () => {
    expect(detectPlatform({ ua: IOS_CHROME, standalone: false, ...all }).gate).toBe('ios-add-to-home')
  })
  it('iOS Home Screen app with the APIs → ok, labelled ios-homescreen', () => {
    const p = detectPlatform({ ua: IOS17, standalone: true, ...all })
    expect(p.gate).toBe('ok'); expect(p.tokenPlatform).toBe('ios-homescreen')
  })
  it('Android Chrome tab → ok, labelled android-chrome', () => {
    const p = detectPlatform({ ua: ANDROID_CHROME, standalone: false, ...all })
    expect(p.gate).toBe('ok'); expect(p.tokenPlatform).toBe('android-chrome'); expect(p.os).toBe('android')
  })
  it('a non-Apple desktop → ok, labelled other', () => {
    const p = detectPlatform({ ua: DESKTOP, standalone: false, ...all })
    expect(p.gate).toBe('ok'); expect(p.tokenPlatform).toBe('other')
  })
  it('a browser without the push APIs → unsupported', () => {
    expect(detectPlatform({ ua: DESKTOP, standalone: false, hasServiceWorker: true, hasPushManager: false, hasNotification: true }).gate).toBe('unsupported')
  })
  it('Mac Safari in a browser tab → add to Dock, same gate as iPhone', () => {
    const p = detectPlatform({ ua: MAC_SAFARI, standalone: false, ...all })
    expect(p.gate).toBe('ios-add-to-home'); expect(p.os).toBe('mac')
  })
  it('an iPad reporting the desktop (Mac) UA is still an iPad: touch tells them apart', () => {
    const p = detectPlatform({ ua: MAC_SAFARI, standalone: false, ...all, maxTouchPoints: 5 })
    expect(p.gate).toBe('ios-add-to-home'); expect(p.os).toBe('ipad')
  })
  it('Mac installed to the Dock with the APIs → ok, labelled ios-homescreen', () => {
    const p = detectPlatform({ ua: MAC_SAFARI, standalone: true, ...all })
    expect(p.gate).toBe('ok'); expect(p.tokenPlatform).toBe('ios-homescreen')
  })
})

// The install steps differ per Apple device (Share button at the bottom on an
// iPhone, top-right on an iPad, File → Add to Dock on a Mac), so `os` has to
// tell the three apart. The gate itself stays identical for all of them.
describe('detectPlatform — which Apple device, for the install steps', () => {
  it('an iPhone is iphone, not a generic Apple lump', () => {
    expect(detectPlatform({ ua: IOS17, standalone: false, ...all }).os).toBe('iphone')
  })
  it('an iPad on its own mobile UA is ipad', () => {
    expect(detectPlatform({ ua: IPAD_MOBILE, standalone: false, ...all }).os).toBe('ipad')
  })
  it('an iPad hiding behind the desktop Mac UA is still ipad (touch gives it away)', () => {
    expect(detectPlatform({ ua: MAC_SAFARI, standalone: false, ...all, maxTouchPoints: 5 }).os).toBe('ipad')
  })
  it('a real Mac reports no touch, so it stays mac', () => {
    expect(detectPlatform({ ua: MAC_SAFARI, standalone: false, ...all }).os).toBe('mac')
  })
  it('splitting the device never changes the gate: all three still install first', () => {
    const gates = [IOS17, IPAD_MOBILE, MAC_SAFARI].map((ua) =>
      detectPlatform({ ua, standalone: false, ...all, maxTouchPoints: ua === IPAD_MOBILE ? 5 : 0 }).gate)
    expect(gates).toEqual(['ios-add-to-home', 'ios-add-to-home', 'ios-add-to-home'])
  })
})

describe('installOs', () => {
  it('names the Apple device whose install steps to show', () => {
    expect(installOs('iphone')).toBe('iphone')
    expect(installOs('ipad')).toBe('ipad')
    expect(installOs('mac')).toBe('mac')
  })
  it('is null where push works in a plain tab, so no steps are shown at all', () => {
    expect(installOs('android')).toBeNull()
    expect(installOs('other')).toBeNull()
  })
})

// Which browser matters only on a Mac, where the button to press is in a
// different corner of the screen in each one.
describe('detectPlatform — which browser', () => {
  it('Mac Safari is safari', () => {
    expect(detectPlatform({ ua: MAC_SAFARI, standalone: false, ...all }).browser).toBe('safari')
  })
  it('Mac Chrome is chromium, despite carrying Safari in its UA', () => {
    expect(detectPlatform({ ua: MAC_CHROME, standalone: false, ...all }).browser).toBe('chromium')
  })
  it('iOS Chrome is chromium (CriOS)', () => {
    expect(detectPlatform({ ua: IOS_CHROME, standalone: false, ...all }).browser).toBe('chromium')
  })
  it('iPhone Safari is safari', () => {
    expect(detectPlatform({ ua: IOS17, standalone: false, ...all }).browser).toBe('safari')
  })
})

describe('safariVersion', () => {
  it('reads Safari\'s own version, which iOS 26 no longer freezes', () => {
    expect(safariVersion(IOS26)).toBe(26)
    expect(safariVersion(IOS17)).toBe(17)
  })
  it('is null outside Safari', () => {
    expect(safariVersion(IOS_CHROME)).toBeNull()
    expect(safariVersion(MAC_CHROME)).toBeNull()
  })
  it('lands on the platform', () => {
    expect(detectPlatform({ ua: IOS26, standalone: false, ...all }).safariVersion).toBe(26)
  })
})

// Where the button the patient taps actually is, per Apple's iOS/iPadOS
// 26–27 guides. The arrow is pinned to the viewport edge nearest it.
describe('installTarget', () => {
  it('iPhone, Safari 26+: the default Compact layout hides Share behind ⋯, bottom right', () => {
    expect(installTarget('iphone', 'safari', 26)).toBe('bottom-right')
    expect(installTarget('iphone', 'safari', 27)).toBe('bottom-right')
  })
  it('iPhone, older Safari: Share is the middle of the bottom toolbar', () => {
    expect(installTarget('iphone', 'safari', 18)).toBe('bottom-center')
    expect(installTarget('iphone', 'safari', 17)).toBe('bottom-center')
  })
  it('iPad: Share sits in the top toolbar, right-hand end', () => {
    expect(installTarget('ipad', 'safari', 26)).toBe('top-right')
    expect(installTarget('ipad', 'safari', 17)).toBe('top-right')
  })
  it('never on a Mac', () => {
    expect(installTarget('mac', 'safari', 26)).toBeNull()
    expect(installTarget('mac', 'chromium', null)).toBeNull()
  })
  it('never outside Safari, whose toolbar is the only one it knows', () => {
    expect(installTarget('iphone', 'chromium', null)).toBeNull()
    expect(installTarget('ipad', 'firefox', null)).toBeNull()
  })
})
