// SketchLine.tsx — a pencil line drawn from a panel step's own bullet to the
// browser button that step taps (iPhone and iPad Safari only; see
// installTarget).
//
// It starts at the bullet, so which step it belongs to is never in question:
// a ring is pencilled round that bullet, then the line runs out of it, through
// the page margin and along the screen edge (sketchRoute.ts), and ends in an
// arrowhead at the button. The button is browser chrome, which a page cannot
// draw on, so the line stops at the edge nearest it.
//
// Drawn ONCE, when the panel opens, and then left alone. The bullet moves with
// the page and the button does not, so the route is re-measured on scroll and
// resize — the ends stay attached, nothing redraws.
//
// Full-screen, `position: fixed`, through a portal to the body: inside the
// panel it would be pinned to the card, because .umc-install-card is animated
// with a transform, and a transformed ancestor becomes the containing block
// for `position: fixed`.
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { InstallTarget } from './data/platformGate'
import { routeFor, type Route } from './sketchRoute'
import { GLYPH_PATHS, type GlyphName } from './glyphPaths'

const RING_GAP = 5  // pencil ring sits this far outside the bullet
// Follow the bullet every frame until it has stayed put this long. Things
// move it with no event to say so: the card springs or morphs in, and Safari
// runs a scripted smooth scroll (the panel scrolling itself up) without
// firing scroll events — following for a fixed time left the ring short of
// the bullet by however far the page still had to go.
const STILL_MS = 600

interface Geometry { route: Route; ring: { cx: number; cy: number; r: number } }

export function SketchLine({ at, step, anchor }: {
  at: InstallTarget
  step: number
  anchor: RefObject<HTMLElement | null>
}) {
  const [geo, setGeo] = useState<Geometry | null>(null)

  useLayoutEffect(() => {
    let last = ''
    // Returns whether the bullet moved since the last measure.
    const measure = (): boolean => {
      const el = anchor.current
      if (!el) return false
      const b = el.getBoundingClientRect()
      const where = `${b.left},${b.top},${b.width},${window.innerWidth},${window.innerHeight}`
      if (where === last) return false
      last = where
      const card = el.closest('.umc-install-card')?.getBoundingClientRect()
      const brand = document.querySelector('.umc-rem-brand')?.getBoundingClientRect()
      const r = b.width / 2 + RING_GAP
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2
      setGeo({
        ring: { cx, cy, r },
        route: routeFor(at, {
          anchor: { x: cx - r, y: cy },
          vw: window.innerWidth,
          vh: window.innerHeight,
          gutterX: Math.max(8, (card?.left ?? 20) - 12),
          topLaneY: Math.max(24, (brand?.bottom ?? 20) + 14),
        }),
      })
      return true
    }
    let frame = 0
    let stillSince = performance.now()
    const follow = () => {
      const now = performance.now()
      if (measure()) stillSince = now
      frame = now - stillSince < STILL_MS ? requestAnimationFrame(follow) : 0
    }
    // a scroll or resize that does fire an event starts the watch again
    const schedule = () => {
      stillSince = performance.now()
      if (!frame) frame = requestAnimationFrame(follow)
    }
    follow()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
    }
  }, [at, anchor])

  // The page leaves room along its bottom edge for the line's lane (see
  // :root[data-umc-sketch] in RemindersPage.css).
  useEffect(() => {
    const root = document.documentElement
    root.dataset.umcSketch = at
    return () => { delete root.dataset.umcSketch }
  }, [at])

  const route = geo?.route
  // what the patient is looking for where the line ends: ⋯ on a Safari 26+
  // iPhone, Share everywhere else
  const glyph: GlyphName = at === 'bottom-right' ? 'more' : 'share'
  const head = route && `M ${route.headArms[0].x} ${route.headArms[0].y} L ${route.tip.x} ${route.tip.y} L ${route.headArms[1].x} ${route.headArms[1].y}`
  const strokes = geo && route && (
    <>
      {/* starts at 9 o'clock, where the line leaves */}
      <circle className="umc-sketch-ring" pathLength={100} cx={geo.ring.cx} cy={geo.ring.cy} r={geo.ring.r}
        transform={`rotate(180 ${geo.ring.cx} ${geo.ring.cy})`} />
      <path className="umc-sketch-line" pathLength={100} d={route.d} />
      <path className="umc-sketch-head" pathLength={100} d={head!} />
      <g data-glyph={glyph} transform={`translate(${route.glyphAt.x - 13.2} ${route.glyphAt.y - 13.2}) scale(1.1)`}>
        {GLYPH_PATHS[glyph].map((d) => <path key={d} className="umc-sketch-glyph" pathLength={100} d={d} />)}
      </g>
    </>
  )

  return createPortal(
    <svg className="umc-sketch" data-at={at} data-step={step} aria-hidden="true" fill="none"
      shapeRendering="geometricPrecision">
      {/* a dark disc behind the pencilled symbol, so it reads cleanly even
          where it lands on the page's own green button */}
      {route && <circle className="umc-sketch-glyph-bg" cx={route.glyphAt.x} cy={route.glyphAt.y} r={17} />}
      {/* No SVG filter here: a full-screen displacement filter is re-rastered
          every frame of the draw, and Safari renders it at reduced resolution
          — the line came out blocky and stuttered. The pencil feel comes from
          the offset second pass instead. */}
      {strokes && (
        <g strokeLinecap="round" strokeLinejoin="round">
          {/* a dark halo under the pencil, legible over text and buttons while
              covering only a hairline of them */}
          <g stroke="#0b0b0b" strokeWidth="5.5" opacity="0.55">{strokes}</g>
          <g stroke="currentColor" strokeWidth="2.6">{strokes}</g>
          {/* the lighter second pass a pencil leaves when a line is gone over */}
          <g stroke="currentColor" strokeWidth="1.3" opacity="0.4" transform="translate(1.4 1)">{strokes}</g>
        </g>
      )}
    </svg>,
    document.body,
  )
}
