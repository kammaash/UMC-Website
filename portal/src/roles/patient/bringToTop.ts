// bringToTop.ts — scroll the page toward `el`'s top (less its
// scroll-margin-top), but only as far as the page can genuinely scroll.
//
// Decision 2026-09-18: the page never scrolls unless its content is taller
// than the screen. This used to pad the root's foot (--umc-reveal-room) so
// even a short page could scroll the section right up to the top — needed
// while the content was vertically centred. It's top-aligned now, so the
// section is already near the top, and that padding was the only thing
// making a page that fits scroll at all.
//
// The section is usually still animating in (the pill → card morph grows its
// height; the Android card pops in), so the page's real height isn't known
// yet. Wait for the element's own animations to finish, then measure.
// Returns a cancel function.

// Distance from the top of the document, ignoring transforms.
function docTop(el: HTMLElement): number {
  let top = 0
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) top += n.offsetTop
  return top
}

export function bringToTop(el: HTMLElement): () => void {
  let cancelled = false
  let raf = 0
  const scroll = () => {
    if (cancelled) return
    raf = requestAnimationFrame(() => {
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const top = Math.min(Math.max(0, docTop(el) - margin), maxScroll)
      if (top > 0) window.scrollTo({ top, behavior: 'smooth' })
    })
  }
  const running = typeof el.getAnimations === 'function' ? el.getAnimations() : []
  if (running.length) Promise.all(running.map((a) => a.finished.catch(() => undefined))).then(scroll)
  else scroll()
  return () => { cancelled = true; cancelAnimationFrame(raf) }
}
