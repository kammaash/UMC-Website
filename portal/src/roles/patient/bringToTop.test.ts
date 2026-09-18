import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { bringToTop } from './bringToTop'

// jsdom does no layout, so the numbers bringToTop reads are set by hand:
// the page's height, the screen's, and how far down the section sits.
function layout({ pageH, screenH, sectionTop }: { pageH: number; screenH: number; sectionTop: number }) {
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: pageH })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: screenH })
  const el = document.createElement('section')
  Object.defineProperty(el, 'offsetTop', { configurable: true, value: sectionTop })
  document.body.appendChild(el)
  return el
}
const frame = () => vi.advanceTimersByTime(20)

beforeEach(() => {
  vi.useFakeTimers()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})
afterEach(() => {
  vi.useRealTimers()
  document.body.replaceChildren()
})

describe('bringToTop', () => {
  it('a page that fits the screen is never scrolled', () => {
    const el = layout({ pageH: 800, screenH: 800, sectionTop: 300 })
    bringToTop(el)
    frame()
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('adds no room to the page to make a scroll possible', () => {
    const root = document.createElement('div')
    root.className = 'umc-rem-root'
    document.body.appendChild(root)
    const el = layout({ pageH: 800, screenH: 800, sectionTop: 300 })
    root.appendChild(el)
    bringToTop(el)
    frame()
    expect(root.style.getPropertyValue('--umc-reveal-room')).toBe('')
  })

  it('a taller page scrolls the section to the top', () => {
    const el = layout({ pageH: 2000, screenH: 800, sectionTop: 300 })
    bringToTop(el)
    frame()
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 300, behavior: 'smooth' })
  })

  it('but only as far as the page can actually scroll', () => {
    const el = layout({ pageH: 900, screenH: 800, sectionTop: 300 })
    bringToTop(el)
    frame()
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 100, behavior: 'smooth' })
  })

  it('waits for the section to finish animating in before measuring', async () => {
    const el = layout({ pageH: 2000, screenH: 800, sectionTop: 300 })
    let finish!: () => void
    const finished = new Promise<void>((r) => { finish = r })
    el.getAnimations = () => [{ finished } as unknown as Animation]
    bringToTop(el)
    frame()
    expect(window.scrollTo).not.toHaveBeenCalled()
    finish()
    await vi.waitFor(() => { frame(); expect(window.scrollTo).toHaveBeenCalled() })
  })

  it('does nothing once cancelled', () => {
    const el = layout({ pageH: 2000, screenH: 800, sectionTop: 300 })
    const cancel = bringToTop(el)
    cancel()
    frame()
    expect(window.scrollTo).not.toHaveBeenCalled()
  })
})
