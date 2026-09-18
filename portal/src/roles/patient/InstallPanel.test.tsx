import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { InstallPanel } from './InstallPanel'
import { SETUP_HOLD_MS } from './setupTiming'
import * as scroll from './bringToTop'

vi.mock('./bringToTop', () => ({ bringToTop: vi.fn(() => () => {}) }))

const phone = { os: 'iphone', browser: 'safari', safariVersion: 26, beforeSignIn: true } as const
const pill = () => screen.queryByRole('button', { name: /set up reminders/i })
const card = () => document.querySelector('.umc-install-card')

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  sessionStorage.clear()
})
afterEach(() => { vi.useRealTimers() })

describe('InstallPanel — opening by itself on a phone', () => {
  it('shows the "Set up reminders" pill for the first second', () => {
    render(<InstallPanel {...phone} autoOpen />)
    expect(pill()).toBeInTheDocument()
    expect(card()).toBeNull()
    act(() => { vi.advanceTimersByTime(SETUP_HOLD_MS - 1) })
    expect(pill()).toBeInTheDocument()
  })
  it('then opens into the full steps and scrolls them to the top of the screen', () => {
    render(<InstallPanel {...phone} autoOpen />)
    act(() => { vi.advanceTimersByTime(SETUP_HOLD_MS) })
    expect(pill()).toBeNull()
    expect(card()).not.toBeNull()
    expect(scroll.bringToTop).toHaveBeenCalledWith(card())
  })
  it('a tap on the pill inside that second opens it at once — and the automatic opening never comes', () => {
    render(<InstallPanel {...phone} autoOpen />)
    act(() => { vi.advanceTimersByTime(400) })
    fireEvent.click(pill()!)
    expect(card()).not.toBeNull()
    act(() => { vi.advanceTimersByTime(SETUP_HOLD_MS * 3) })
    expect(scroll.bringToTop).not.toHaveBeenCalled()
  })
  it('if the patient then closes it straight away, it does not spring back open', () => {
    render(<InstallPanel {...phone} autoOpen />)
    fireEvent.click(pill()!)
    fireEvent.click(screen.getByRole('button', { name: /hide these steps/i }))
    act(() => { vi.advanceTimersByTime(SETUP_HOLD_MS * 3) })
    expect(pill()).toBeInTheDocument()
    expect(card()).toBeNull()
  })
  it('stays put away if the patient put it away earlier in this visit', () => {
    sessionStorage.setItem('umc-install-collapsed', '1')
    render(<InstallPanel {...phone} autoOpen />)
    act(() => { vi.advanceTimersByTime(SETUP_HOLD_MS * 3) })
    expect(pill()).toBeInTheDocument()
    expect(scroll.bringToTop).not.toHaveBeenCalled()
  })
  it('without autoOpen (a Mac) the steps are open from the start', () => {
    render(<InstallPanel {...phone} os="mac" />)
    expect(card()).not.toBeNull()
  })
})

describe('InstallPanel — growing out of the pill', () => {
  // jsdom has no Web Animations; a stand-in whose `finished` we settle by hand
  let finish: () => void
  beforeEach(() => {
    finish = () => {}
    const done = new Promise<void>((resolve) => { finish = resolve })
    HTMLElement.prototype.animate = vi.fn(() => ({ finished: done }) as unknown as Animation)
  })
  afterEach(() => { delete (HTMLElement.prototype as Partial<HTMLElement>).animate })

  it('keeps its spring-in switched off once grown, so the card does not blink out and back', async () => {
    render(<InstallPanel {...phone} autoOpen />)
    act(() => { vi.advanceTimersByTime(SETUP_HOLD_MS) })
    expect(card()).toHaveClass('is-morphing')
    await act(async () => { finish() })
    expect(card()).not.toHaveClass('is-morphing')
    expect(card()).toHaveClass('is-morphed')
  })

  it('shrinks back into the pill on close, mirroring how it grew open', async () => {
    render(<InstallPanel {...phone} autoOpen />)
    act(() => { vi.advanceTimersByTime(SETUP_HOLD_MS) })
    fireEvent.click(screen.getByRole('button', { name: /hide these steps/i }))
    // the plain fade (.is-closing) steps aside for the same pill-shaped tween
    // that opened it
    expect(card()).toHaveClass('is-morphing')
    expect(card()).not.toHaveClass('is-closing')
    await act(async () => { finish() })
    expect(pill()).toBeInTheDocument()
    expect(pill()).toHaveClass('is-morph-settled')
    expect(card()).toBeNull()
  })
})
