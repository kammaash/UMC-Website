// sketchRoute.ts — pure: the path of the pencil line from a panel step's
// bullet to the browser button that step taps.
//
// The route is a rounded polyline that stays out of the step text: it leaves
// the bullet sideways into the page's side margin, runs down (or up) that
// margin to a lane along the screen edge, follows the edge, and turns in to
// the button at the very end. Recomputed as the page scrolls — the bullet
// moves with the page, the button does not.
import type { InstallTarget } from './data/platformGate'

export interface Pt { x: number; y: number }
export interface RouteInput {
  anchor: Pt       // left edge, vertical centre, of the step's bullet
  vw: number
  vh: number
  gutterX: number  // x of the page margin the line runs down
  topLaneY: number // y of the lane along the top edge, clear of the brand row
}
export interface Route {
  d: string
  points: Pt[]
  tip: Pt
  headArms: [Pt, Pt]
  // centre of the pencilled symbol drawn by the tip
  glyphAt: Pt
  vw: number
}

// Where each button sits on screen. Estimates from Safari's layouts, not
// measurements — a page cannot read the browser's own toolbar.
//   ⋯  (iPhone, Safari 26+ Compact): a round button right of the tab bar,
//      its centre ~58pt in from the edge (checked on an iOS 26.5 iPhone 17 Pro).
//   Share (iPad): top toolbar, just left of the + and tabs buttons.
const BOTTOM_RIGHT_INSET = 58
const TOP_RIGHT_INSET = 96
const EDGE = 1          // the tip stops just inside the top edge
// On the bottom edge the tip stops a little short, so the arrowhead is drawn
// whole rather than squashed against the screen's rounded corner.
const BOTTOM_EDGE = 6
// How far above the bottom edge the line runs along it. Low, so it stays
// under the page's main button (a line through its label reads as crossing
// it out), but high enough that the last turn down is longer than its corner
// plus the arrowhead — any shorter and the head bends round the curve.
const BOTTOM_LANE = 30
const RADIUS = 18
const HEAD_LEN = 11
const HEAD_HALF = 7
// The pencilled symbol sits beside the arrowhead: above it on the bottom edge,
// to its left on the top edge (the line arrives from the left there). The
// half-size keeps it wholly on screen.
const GLYPH_HALF = 14
const GLYPH_GAP = 24

export function routeFor(at: InstallTarget, r: RouteInput): Route {
  const { anchor, vw, vh, gutterX } = r
  const bottom = at !== 'top-right'
  const tip: Pt = at === 'bottom-center' ? { x: vw / 2, y: vh - BOTTOM_EDGE }
    : at === 'bottom-right' ? { x: vw - BOTTOM_RIGHT_INSET, y: vh - BOTTOM_EDGE }
    : { x: vw - TOP_RIGHT_INSET, y: EDGE }
  const laneY = bottom ? vh - BOTTOM_EDGE - BOTTOM_LANE : r.topLaneY

  const points: Pt[] = [
    anchor,
    { x: gutterX, y: anchor.y },
    { x: gutterX, y: laneY },
    { x: tip.x, y: laneY },
    tip,
  ]

  // Arrowhead: two strokes opening back along the last segment.
  const last = points[points.length - 2]
  const len = Math.hypot(tip.x - last.x, tip.y - last.y) || 1
  const ux = (tip.x - last.x) / len, uy = (tip.y - last.y) / len
  const headArms: [Pt, Pt] = [
    { x: tip.x - ux * HEAD_LEN - uy * HEAD_HALF, y: tip.y - uy * HEAD_LEN + ux * HEAD_HALF },
    { x: tip.x - ux * HEAD_LEN + uy * HEAD_HALF, y: tip.y - uy * HEAD_LEN - ux * HEAD_HALF },
  ]

  const glyphAt: Pt = bottom
    ? { x: Math.min(tip.x, vw - GLYPH_HALF), y: tip.y - BOTTOM_LANE - GLYPH_GAP }
    : { x: Math.max(GLYPH_HALF, tip.x - GLYPH_GAP - 6), y: tip.y + GLYPH_HALF + 8 }

  return { d: rounded(points), points, tip, headArms, glyphAt, vw }
}

const f = (n: number) => Math.round(n * 10) / 10

// Straight runs joined by quarter-round corners, each corner's radius capped
// at half its shorter neighbouring run so short runs never overshoot.
function rounded(pts: Pt[]): string {
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], p = pts[i], b = pts[i + 1]
    const la = Math.hypot(a.x - p.x, a.y - p.y), lb = Math.hypot(b.x - p.x, b.y - p.y)
    const rad = Math.min(RADIUS, la / 2, lb / 2)
    if (rad < 0.5) { d += ` L ${f(p.x)} ${f(p.y)}`; continue }
    const p1 = { x: p.x + ((a.x - p.x) / la) * rad, y: p.y + ((a.y - p.y) / la) * rad }
    const p2 = { x: p.x + ((b.x - p.x) / lb) * rad, y: p.y + ((b.y - p.y) / lb) * rad }
    d += ` L ${f(p1.x)} ${f(p1.y)} Q ${f(p.x)} ${f(p.y)} ${f(p2.x)} ${f(p2.y)}`
  }
  const end = pts[pts.length - 1]
  return `${d} L ${f(end.x)} ${f(end.y)}`
}
