// AllSet.tsx — the "You're all set!" moment, shared by the setup panels.
//
// InstallPanel plays it in place of its steps when Done is tapped (before
// sign-in). After sign-in there is no Done (decision 2026-09-19): the page
// plays AllSetCard itself once a tap on Enable Reminders has actually been
// confirmed — permission granted AND the push token saved — so it never
// celebrates something that didn't happen.
import { useEffect, useRef, useState } from 'react'

// Matches .umc-install-card's is-closing animation; also the fallback delay
// when the animation never runs (reduced motion, background tab).
export const EXIT_MS = 400
// How long "You're all set!" stays up before it folds itself away.
export const CELEBRATE_MS = 2600

// Cartoony but in UMC's black-and-light palette: a badge that bounces in with
// a squash, a tick that draws itself, sparks and confetti flying off it.
// role=status, so it is announced.
const SPARKS = [0, 45, 90, 135, 180, 225, 270, 315]
const CONFETTI = [
  { x: 14, y: 30, r: 3.2 }, { x: 108, y: 22, r: 2.6 }, { x: 118, y: 78, r: 3.4 },
  { x: 8, y: 88, r: 2.4 }, { x: 36, y: 8, r: 2 }, { x: 92, y: 110, r: 2.2 },
]
export function AllSet({ line }: { line: string }) {
  return (
    <div className="umc-install-yay" role="status">
      <svg className="umc-yay-badge" viewBox="0 0 120 120" aria-hidden="true">
        {SPARKS.map((a) => (
          <line key={a} className="umc-yay-spark" x1="60" y1="10" x2="60" y2="2" transform={`rotate(${a} 60 60)`} />
        ))}
        {CONFETTI.map((c, i) => (
          <circle key={i} className="umc-yay-dot" cx={c.x} cy={c.y} r={c.r} style={{ animationDelay: `${0.35 + i * 0.04}s` }} />
        ))}
        <g className="umc-yay-disc">
          <circle cx="60" cy="60" r="38" />
          <path className="umc-yay-tick" pathLength={100} d="M 43 61 L 55 73 L 78 48" />
        </g>
      </svg>
      <p className="umc-yay-title">You're all set!</p>
      <p className="umc-yay-line">{line}</p>
    </div>
  )
}

// A card of its own: plays for CELEBRATE_MS, shrinks away, then tells the
// caller it is gone.
export function AllSetCard({ line, onFinished }: { line: string; onFinished: () => void }) {
  const [closing, setClosing] = useState(false)
  const finished = useRef(false)
  const end = () => { if (!finished.current) { finished.current = true; onFinished() } }

  useEffect(() => {
    let exit: ReturnType<typeof setTimeout> | undefined
    const hold = setTimeout(() => {
      setClosing(true)
      // animationend does the honours when the animation runs
      exit = setTimeout(end, EXIT_MS)
    }, CELEBRATE_MS)
    return () => { clearTimeout(hold); if (exit) clearTimeout(exit) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className={`umc-install-card is-celebrating${closing ? ' is-closing' : ''}`}
      onAnimationEnd={(e) => { if (closing && e.target === e.currentTarget) end() }}>
      <AllSet line={line} />
    </section>
  )
}
