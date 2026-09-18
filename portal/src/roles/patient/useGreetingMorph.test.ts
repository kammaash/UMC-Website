import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGreetingMorph } from './useGreetingMorph'
import { GREETING_HOLD_MS, CORNER_HOLD_MS, PEEK_HOLD_MS } from './greetingMorphTiming'

// renderHook mounts no real heading/corner elements, so nameRef/cornerRef
// stay null throughout — exactly the "safety net" path in useGreetingMorph.ts
// (`if (!nameEl || !cornerEl) { setPhase('corner'); return }`), landing
// straight on 'corner' instead of 'morphing'. The ref-driven flight itself
// (the actual DOM measuring) is exercised by RemindersPage.test.tsx, which
// renders real elements; this file is for the state machine and timers.

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

// through the 8s hold, then the corner rest, to the avatar — two steps,
// since the corner's timer is only scheduled once React re-renders into it
const toAvatar = () => {
  act(() => { vi.advanceTimersByTime(GREETING_HOLD_MS) })
  act(() => { vi.advanceTimersByTime(CORNER_HOLD_MS) })
}

describe('useGreetingMorph', () => {
  it('the hold is 8 seconds', () => {
    expect(GREETING_HOLD_MS).toBe(8000)
  })

  it('never fires while inactive', () => {
    const { result } = renderHook(() => useGreetingMorph(false, 'Patient B'))
    act(() => { vi.advanceTimersByTime(GREETING_HOLD_MS * 3) })
    expect(result.current.phase).toBe('inline')
  })

  it('fires exactly GREETING_HOLD_MS after it becomes active — not before', () => {
    const { result, rerender } = renderHook(({ active }) => useGreetingMorph(active, 'Patient B'), { initialProps: { active: false } })
    act(() => { vi.advanceTimersByTime(5000) }) // time spent inactive doesn't count
    rerender({ active: true })
    act(() => { vi.advanceTimersByTime(GREETING_HOLD_MS - 1) })
    expect(result.current.phase).toBe('inline')
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current.phase).toBe('corner') // no ref → skips the flight
  })

  it('then rests in the corner before swapping for the avatar', () => {
    const { result } = renderHook(() => useGreetingMorph(true, 'Patient B'))
    act(() => { vi.advanceTimersByTime(GREETING_HOLD_MS) })
    act(() => { vi.advanceTimersByTime(CORNER_HOLD_MS - 1) })
    expect(result.current.phase).toBe('corner')
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current.phase).toBe('avatar')
  })

  it('fires only once — staying active past the hold does not re-run it', () => {
    const { result } = renderHook(() => useGreetingMorph(true, 'Patient B'))
    toAvatar()
    act(() => { vi.advanceTimersByTime(GREETING_HOLD_MS * 3) })
    expect(result.current.phase).toBe('avatar')
  })

  it('a tap peeks the name beside the avatar, then auto-hides after PEEK_HOLD_MS', () => {
    const { result } = renderHook(() => useGreetingMorph(true, 'Patient B'))
    toAvatar()
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
    const { result } = renderHook(() => useGreetingMorph(true, 'Patient B'))
    toAvatar()
    act(() => { result.current.handleAvatarClick() })
    act(() => { vi.advanceTimersByTime(PEEK_HOLD_MS - 1) })
    act(() => { result.current.handleAvatarClick() }) // restart with 1ms left on the old timer
    act(() => { vi.advanceTimersByTime(PEEK_HOLD_MS - 1) })
    expect(result.current.peeking).toBe(true) // would have hidden under the old timer alone
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current.peeking).toBe(false)
  })

  it('hover peeks immediately and un-peeks on leave, with no auto-hide timer running', () => {
    const { result } = renderHook(() => useGreetingMorph(true, 'Patient B'))
    toAvatar()

    act(() => { result.current.handlePointerEnter() })
    expect(result.current.peeking).toBe(true)
    act(() => { vi.advanceTimersByTime(PEEK_HOLD_MS + 5000) })
    expect(result.current.peeking).toBe(true) // still hovering — no timer to expire

    act(() => { result.current.handlePointerLeave() })
    expect(result.current.peeking).toBe(false)
  })
})
