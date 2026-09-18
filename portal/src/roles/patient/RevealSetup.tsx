// RevealSetup.tsx — Android's notification steps arrive on their own.
//
// (iPhone and iPad do this inside InstallPanel instead, morphing out of the
// "Set up reminders" pill — see autoOpen there.)
//
// On Android (decision 2026-09-18) the section is held back
// for a second after the screen loads, so the page settles first, then it
// pops in and the page scrolls until the section's top is at the top of the
// screen — the steps are the one thing the patient has to do here.
//
// `display: contents`, so the section stays a direct flex item of the column
// and keeps its own entrance animation.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SETUP_HOLD_MS } from './setupTiming'
import { bringToTop } from './bringToTop'

export const REVEAL_DELAY_MS = SETUP_HOLD_MS

export function RevealSetup({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setShown(true), REVEAL_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!shown) return
    const card = box.current?.querySelector<HTMLElement>('.umc-install-card')
    return card ? bringToTop(card) : undefined
  }, [shown])

  return <div ref={box} className="umc-reveal">{shown ? children : null}</div>
}
