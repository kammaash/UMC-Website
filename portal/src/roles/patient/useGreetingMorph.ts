// useGreetingMorph.ts — the claimed screen's name → avatar sequence
// (decision 2026-09-19, refined 2026-09-19): the greeting's name shrinks
// into just its capitalised initial as it travels up into the brand row's
// corner, rests there a moment, then swaps for the account avatar. Tapping
// (or, with a mouse, hovering) the avatar afterward peeks the initial back
// out beside it for a couple of seconds.
//
// It fires on a fixed clock: GREETING_HOLD_MS after the claimed screen
// appears, on every device, whatever push is doing (decision 2026-09-18).
// Nothing about push state delays or hurries it, so the avatar (and account
// details behind it) always becomes reachable at the same moment.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { GREETING_HOLD_MS, MORPH_MS, CORNER_HOLD_MS, PEEK_HOLD_MS } from './greetingMorphTiming'

type Phase = 'inline' | 'morphing' | 'corner' | 'avatar'

export interface MorphOverlay {
  text: string
  fromTop: number
  fromLeft: number
  fontSize: string
  color: string
  fontFamily: string
  fontWeight: string
  dx: number
  dy: number
  scale: number
}

const CORNER_NAME_FONT_PX = 13

export function useGreetingMorph(active: boolean, fullName: string) {
  const nameRef = useRef<HTMLSpanElement>(null)
  const cornerRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('inline')
  const [overlay, setOverlay] = useState<MorphOverlay | null>(null)
  const [flying, setFlying] = useState(false)
  const [peeking, setPeeking] = useState(false)
  const firedRef = useRef(false)
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!active || firedRef.current) return
    const fire = () => {
      if (firedRef.current) return
      firedRef.current = true
      const nameEl = nameRef.current
      const cornerEl = cornerRef.current
      if (!nameEl || !cornerEl) { setPhase('corner'); return }
      const startRect = nameEl.getBoundingClientRect()
      const endRect = cornerEl.getBoundingClientRect()
      const cs = getComputedStyle(nameEl)
      const startFontPx = parseFloat(cs.fontSize) || CORNER_NAME_FONT_PX
      const initial = fullName.trim().charAt(0).toUpperCase() || '?'
      setOverlay({
        text: initial,
        fromTop: startRect.top, fromLeft: startRect.left,
        fontSize: cs.fontSize, color: cs.color, fontFamily: cs.fontFamily, fontWeight: cs.fontWeight,
        dx: endRect.left - startRect.left, dy: endRect.top - startRect.top,
        scale: CORNER_NAME_FONT_PX / startFontPx,
      })
      setPhase('morphing')
    }
    const t = setTimeout(fire, GREETING_HOLD_MS)
    return () => clearTimeout(t)
  }, [active, fullName])

  // Going inactive (the patient signed out) resets everything, so the next
  // sign-in in this same visit gets the whole sequence again from the start
  // — "Welcome back, <name>" in the heading, the 8s hold, the flight.
  useEffect(() => {
    if (active) return
    firedRef.current = false
    if (peekTimer.current) { clearTimeout(peekTimer.current); peekTimer.current = null }
    setPhase('inline'); setOverlay(null); setFlying(false); setPeeking(false)
  }, [active])

  // Two-step: paint the clone at its start position first, then flip the
  // flying class on the next frame so the transform transition actually runs
  // instead of jumping straight to its end state.
  useLayoutEffect(() => {
    if (phase !== 'morphing' || !overlay) return
    setFlying(false)
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setFlying(true)) })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) }
  }, [phase, overlay])

  useEffect(() => {
    if (phase !== 'morphing') return
    const t = setTimeout(() => { setPhase('corner'); setOverlay(null); setFlying(false) }, MORPH_MS)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'corner') return
    const t = setTimeout(() => setPhase('avatar'), CORNER_HOLD_MS)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => () => { if (peekTimer.current) clearTimeout(peekTimer.current) }, [])

  const schedulePeekHide = () => {
    if (peekTimer.current) clearTimeout(peekTimer.current)
    peekTimer.current = setTimeout(() => setPeeking(false), PEEK_HOLD_MS)
  }
  // Tap: peek, then auto-hide after PEEK_HOLD_MS.
  const handleAvatarClick = () => { setPeeking(true); schedulePeekHide() }
  // Mouse/trackpad: peek follows the hover state directly, no timer.
  const handlePointerEnter = () => { if (peekTimer.current) { clearTimeout(peekTimer.current); peekTimer.current = null } setPeeking(true) }
  const handlePointerLeave = () => { if (peekTimer.current) { clearTimeout(peekTimer.current); peekTimer.current = null } setPeeking(false) }

  return {
    nameRef, cornerRef, phase, peeking,
    overlay: phase === 'morphing' ? overlay : null,
    flying,
    handleAvatarClick, handlePointerEnter, handlePointerLeave,
  }
}
