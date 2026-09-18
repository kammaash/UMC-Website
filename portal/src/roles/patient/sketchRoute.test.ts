import { describe, it, expect } from 'vitest'
import { routeFor } from './sketchRoute'

// A phone: 393×760, the step-2 bullet's left edge at (38, 400), the page's
// side margin 8px in from the edge.
const phone = { anchor: { x: 38, y: 400 }, vw: 393, vh: 760, gutterX: 8, topLaneY: 60 }
// An iPad: wide margins either side of a centred column, brand row above.
const ipad = { anchor: { x: 190, y: 900 }, vw: 820, vh: 1100, gutterX: 158, topLaneY: 62 }

describe('routeFor', () => {
  it('starts exactly at the step bullet', () => {
    expect(routeFor('bottom-right', phone).d.startsWith('M 38 400')).toBe(true)
  })
  it('leaves the bullet sideways into the page margin, clear of the step text', () => {
    const { points } = routeFor('bottom-right', phone)
    expect(points[1]).toEqual({ x: 8, y: 400 })
    expect(points[2].x).toBe(8)
  })
  it('iPhone, Safari 26+: ends at ⋯, on the bottom edge near the right corner', () => {
    const { tip } = routeFor('bottom-right', phone)
    expect(tip).toEqual({ x: 393 - 58, y: 760 - 6 })
  })
  it('iPhone, older Safari: ends at Share, on the bottom edge dead centre', () => {
    expect(routeFor('bottom-center', phone).tip).toEqual({ x: 196.5, y: 754 })
  })
  it('iPad: ends at Share, on the top edge near the right', () => {
    const { tip } = routeFor('top-right', ipad)
    expect(tip).toEqual({ x: 820 - 96, y: 1 })
  })
  it('the arrowhead opens back up the line, so it points INTO the edge', () => {
    const down = routeFor('bottom-right', phone)
    expect(down.headArms.every((p) => p.y < down.tip.y)).toBe(true)
    const up = routeFor('top-right', ipad)
    expect(up.headArms.every((p) => p.y > up.tip.y)).toBe(true)
  })
  // a line through the main button's label reads as crossing it out
  it('runs along the very bottom edge, below anything a patient needs to read', () => {
    const { points } = routeFor('bottom-right', phone)
    expect(points[3].y).toBeGreaterThanOrEqual(760 - 40)
  })
  // a turn shorter than corner + arrowhead bends the head round the curve
  it('leaves the arrowhead a straight run of its own on the last turn down', () => {
    for (const r of [routeFor('bottom-right', phone), routeFor('bottom-center', phone)]) {
      const leg = r.tip.y - r.points[3].y
      const corner = Math.min(18, leg / 2)
      expect(leg - corner).toBeGreaterThanOrEqual(11)
    }
  })
  // the pencilled symbol sits just before the arrowhead, on screen, so the
  // patient sees what to look for right where the line says to look
  it('places the symbol beside the tip, fully on screen', () => {
    for (const r of [routeFor('bottom-right', phone), routeFor('bottom-center', phone), routeFor('top-right', ipad)]) {
      expect(Math.hypot(r.glyphAt.x - r.tip.x, r.glyphAt.y - r.tip.y)).toBeLessThan(60)
      expect(r.glyphAt.x - 14).toBeGreaterThanOrEqual(0)
      expect(r.glyphAt.x + 14).toBeLessThanOrEqual(r.vw)
      expect(r.glyphAt.y - 14).toBeGreaterThanOrEqual(0)
    }
  })
  it('never leaves the screen sideways', () => {
    for (const r of [routeFor('bottom-right', phone), routeFor('bottom-center', phone), routeFor('top-right', ipad)]) {
      for (const p of r.points) expect(p.x >= 0 && p.x <= r.vw).toBe(true)
    }
  })
  it('still routes sensibly when the bullet has scrolled off the top of the screen', () => {
    const r = routeFor('bottom-right', { ...phone, anchor: { x: 38, y: -120 } })
    expect(r.d).not.toMatch(/NaN/)
    expect(r.tip).toEqual({ x: 335, y: 754 })
  })
})
