import { describe, it, expect } from 'vitest'
import { detectPlatform, iosVersion } from './platformGate'

const IOS17 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IOS163 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1'
const IOS_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1'
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36'
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const all = { hasServiceWorker: true, hasPushManager: true, hasNotification: true }

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
    expect(p.os).toBe('ios')
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
  it('desktop → ok, labelled other', () => {
    const p = detectPlatform({ ua: DESKTOP, standalone: false, ...all })
    expect(p.gate).toBe('ok'); expect(p.tokenPlatform).toBe('other')
  })
  it('a browser without the push APIs → unsupported', () => {
    expect(detectPlatform({ ua: DESKTOP, standalone: false, hasServiceWorker: true, hasPushManager: false, hasNotification: true }).gate).toBe('unsupported')
  })
})
