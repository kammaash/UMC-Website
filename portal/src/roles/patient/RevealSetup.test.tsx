import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { RevealSetup, REVEAL_DELAY_MS } from './RevealSetup'

const Page = ({ children }: { children: React.ReactNode }) => <div className="umc-rem-root">{children}</div>

beforeEach(() => {
  vi.useFakeTimers()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})
afterEach(() => { vi.useRealTimers() })

describe('RevealSetup', () => {
  it('holds the section back for a second after load', () => {
    render(<Page><RevealSetup><section className="umc-install-card">steps</section></RevealSetup></Page>)
    expect(screen.queryByText('steps')).toBeNull()
    act(() => { vi.advanceTimersByTime(REVEAL_DELAY_MS - 1) })
    expect(screen.queryByText('steps')).toBeNull()
    act(() => { vi.advanceTimersByTime(1) })
    expect(screen.getByText('steps')).toBeInTheDocument()
  })
  // How far it scrolls (and that a page that fits is left alone) is
  // bringToTop's own business — bringToTop.test.ts. Here: it never pads the
  // page to make a scroll possible.
  it('then brings the section toward the top without padding the page to do it', () => {
    const { container } = render(<Page><RevealSetup><section className="umc-install-card">steps</section></RevealSetup></Page>)
    act(() => { vi.advanceTimersByTime(REVEAL_DELAY_MS) })
    act(() => { vi.advanceTimersByTime(20) }) // the animation frame
    expect(window.scrollTo).not.toHaveBeenCalled() // jsdom's page fits its screen
    const root = container.querySelector<HTMLElement>('.umc-rem-root')!
    expect(root.style.getPropertyValue('--umc-reveal-room')).toBe('')
  })
  it('leaves the page alone when the section was collapsed to its pill', () => {
    render(<Page><RevealSetup><button className="umc-install-pill">Set up reminders</button></RevealSetup></Page>)
    act(() => { vi.advanceTimersByTime(REVEAL_DELAY_MS + 20) })
    expect(screen.getByText('Set up reminders')).toBeInTheDocument()
    expect(window.scrollTo).not.toHaveBeenCalled()
  })
})
