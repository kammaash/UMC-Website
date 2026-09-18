// bringToTop.ts — scroll the page until `el`'s top is at the top of the screen
// (less its scroll-margin-top). The page is usually too short to scroll that
// far, so the root is given just enough room at its foot (--umc-reveal-room)
// to let it. Returns a function that takes the room back.

// Distance from the top of the document, ignoring transforms — the section is
// usually mid-animation when this is read.
function docTop(el: HTMLElement): number {
  let top = 0
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) top += n.offsetTop
  return top
}

export function bringToTop(el: HTMLElement): () => void {
  const root = el.closest<HTMLElement>('.umc-rem-root')
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
  const target = Math.max(0, docTop(el) - margin)
  const room = target + window.innerHeight - document.documentElement.scrollHeight
  if (room > 0) root?.style.setProperty('--umc-reveal-room', `${Math.ceil(room)}px`)
  // after the room has been laid out
  const raf = requestAnimationFrame(() => window.scrollTo({ top: target, behavior: 'smooth' }))
  return () => {
    cancelAnimationFrame(raf)
    root?.style.removeProperty('--umc-reveal-room')
  }
}
