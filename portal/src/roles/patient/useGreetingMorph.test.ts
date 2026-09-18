import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGreetingMorph } from './useGreetingMorph'
import { CORNER_HOLD_MS, PEEK_HOLD_MS, SETTLE_FALLBACK_MS } from './greetingMorphTiming'

// renderHook mounts no real heading/corner elements, so nameRef/cornerRef
// stay null throughout — exactly the "safety net" path in useGreetingMorph.ts
// (`if (!nameEl || !cornerEl) { setPhase('corner'); return }`), landing
// straight on 'corner' instead of 'morphing'. The ref-driven flight itself
// (the actual DOM measuring) is exercised by RemindersPage.test.tsx, which
// renders real elements; this file is for the state machine and timers.

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('useGreetingMorph', () => {
  it('stays inline until active, and until settled once active', () => {
    const { result, rerender } = renderHook(
      ({ active, settled }) => useGreetingMorph(active, 'Patient B', settled),
      { initialProps: { active: false, settled: false } },
    )
    expect(result.current.phase).toBe('inline')

    act(() => { vi.advanceTimersByTime(SETTLE_FALLBACK_MS + 1000) })
    expect(result.current.phase).toBe('inline') // inactive — never fires

    rerender({ active: true, settled: false })
    expect(result.current.phase).toBe('inline') // active but not settled yet
  })

  it('fires once settled, then rests in the corner before swapping for the avatar', () => {
    const { result, rerender } = renderHook(
      ({ settled }) => useGreetingMorph(true, 'Patient B', settled),
      { initialProps: { settled: false } },
    )
    rerender({ settled: true })
    expect(result.current.phase).toBe('corner') // no ref → skips the flight

    act(() => { vi.advanceTimersByTime(CORNER_HOLD_MS - 1) })
    expect(result.current.phase).toBe('corner')
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current.phase).toBe('avatar')
  })

  it('fires the fallback even if push never settles — account details must stay reachable', () => {
    const { result } = renderHook(() => useGreetingMorph(true, 'Patient B', false))
    act(() => { vi.advanceTimersByTime(SETTLE_FALLBACK_MS - 1) })
    expect(result.current.phase).toBe('inline')
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current.phase).toBe('corner')
  })

  it('settling before the fallback fires cancels it — the trigger only ever runs once', () => {
    const { result, rerender } = renderHook(
      ({ settled }) => useGreetingMorph(true, 'Patient B', settled),
      { initialProps: { settled: false } },
    )
    act(() => { vi.advanceTimersByTime(SETTLE_FALLBACK_MS - 100) })
    rerender({ settled: true })
    expect(result.current.phase).toBe('corner')
    // the pending fallback timeout, if it fired too, would try to re-fire —
    // firedRef guards that, so nothing should throw or double-transition.
    act(() => { vi.advanceTimersByTime(200) })
    expect(result.current.phase).toBe('corner')
  })

  it('a tap peeks the name beside the avatar, then auto-hides after PEEK_HOLD_MS', () => {
    const { result } = renderHook(() => useGreetingMorph(true, 'Patient B', true))
    act(() => { vi.advanceTimersByTime(CORNER_HOLD_MS) })
    expect(result.current.phase).toBe('avatar')
    expect(result.current.peeking).toBe(false)

    act(() => { result.current.handleAvatarClick() })
    expect(result.current.peeking).toBe(true)
    act(() => { vi.advanceTimersByTime(PEEK_HOLD_MS - 1) })
    expect(result.current.peeking).toBe(true)
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current.peeking).toBe(false)
  })

  it('re-tapping while peeking restarts the auto-hide timer', () => {
    const { result } = renderHook(() => useGreetingMorph(true, 'Patient B', true))
    act(() => { vi.advanceTimersByTime(CORNER_HOLD_MS) })
    act(() => { result.current.handleAvatarClick() })
    act(() => { vi.advanceTimersByTime(PEEK_HOLD_MS - 1) })
    act(() => { result.current.handleAvatarClick() }) // restart with 1ms left on the old timer
    act(() => { vi.advanceTimersByTime(PEEK_HOLD_MS - 1) })
    expect(result.current.peeking).toBe(true) // would have hidden under the old timer alone
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current.peeking).toBe(false)
  })

  it('hover peeks immediately and un-peeks on leave, with no auto-hide timer running', () => {
    const { result } = renderHook(() => useGreetingMorph(true, 'Patient B', true))
    act(() => { vi.advanceTimersByTime(CORNER_HOLD_MS) })

    act(() => { result.current.handlePointerEnter() })
    expect(result.current.peeking).toBe(true)
    act(() => { vi.advanceTimersByTime(PEEK_HOLD_MS + 5000) })
    expect(result.current.peeking).toBe(true) // still hovering — no timer to expire

    act(() => { result.current.handlePointerLeave() })
    expect(result.current.peeking).toBe(false)
  })
})
