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
  it('then scrolls the section up to the top of the screen, making room to do so', () => {
    const { container } = render(<Page><RevealSetup><section className="umc-install-card">steps</section></RevealSetup></Page>)
    act(() => { vi.advanceTimersByTime(REVEAL_DELAY_MS) })
    act(() => { vi.advanceTimersByTime(20) }) // the animation frame
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    const root = container.querySelector<HTMLElement>('.umc-rem-root')!
    expect(root.style.getPropertyValue('--umc-reveal-room')).toMatch(/px$/)
  })
  it('leaves the page alone when the section was collapsed to its pill', () => {
    render(<Page><RevealSetup><button className="umc-install-pill">Set up reminders</button></RevealSetup></Page>)
    act(() => { vi.advanceTimersByTime(REVEAL_DELAY_MS + 20) })
    expect(screen.getByText('Set up reminders')).toBeInTheDocument()
    expect(window.scrollTo).not.toHaveBeenCalled()
  })
  it('gives the room back when it goes', () => {
    const { container, unmount } = render(<Page><RevealSetup><section className="umc-install-card">steps</section></RevealSetup></Page>)
    const root = container.querySelector<HTMLElement>('.umc-rem-root')!
    act(() => { vi.advanceTimersByTime(REVEAL_DELAY_MS) })
    unmount()
    expect(root.style.getPropertyValue('--umc-reveal-room')).toBe('')
  })
})
