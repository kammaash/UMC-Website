// InstallPanel.tsx — the one-time "install this page" steps for Apple devices.
//
// This is not decoration: on every Apple platform web push only exists inside
// an installed web app (see platformGate.ts), so this panel is the whole route
// to a patient ever being reminded of a dose. It is rendered only when the gate
// says 'ios-add-to-home'; an already-installed app never sees it.
//
// Decision 2026-09-18: the close button COLLAPSES, it does not dismiss. A
// patient who taps X gets a slim pill they can reopen, never a silently
// reminder-less page with nothing on screen explaining why. The collapsed state
// is per-session on purpose — a new visit starts expanded again.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { installTarget, type Browser, type InstallOs } from './data/platformGate'
import { SketchLine } from './SketchLine'
import { Glyph } from './glyphs'
import { SETUP_HOLD_MS } from './setupTiming'
import { bringToTop } from './bringToTop'
import { AllSet, CELEBRATE_MS, EXIT_MS } from './AllSet'
import { useStrings } from './i18n/useStrings'
import type { Strings } from './i18n/strings'

const COLLAPSED_KEY = 'umc-install-collapsed'
// The pill → card morph.
const MORPH_MS = 560
const MORPH_EASE = 'cubic-bezier(0.2, 0.9, 0.25, 1)'
const CARD_RADIUS = 22

// Grows the card out of the pill it replaces: its height from the pill's
// (pushing the page below down smoothly, not in one jump) and its outline from
// the pill's width and round ends to the full card, while the card's content
// fades in behind. Skipped under reduced motion.
function morphFromPill(card: HTMLElement, pill: DOMRect): void {
  if (typeof card.animate !== 'function') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const to = card.getBoundingClientRect()
  const right = Math.max(0, to.right - pill.right)
  const left = Math.max(0, pill.left - to.left)
  card.classList.add('is-morphing')
  const grow = card.animate([
    { height: `${pill.height}px`, clipPath: `inset(0 ${right}px 0 ${left}px round ${pill.height / 2}px)` },
    { height: `${to.height}px`, clipPath: `inset(0 0 0 0 round ${CARD_RADIUS}px)` },
  ], { duration: MORPH_MS, easing: MORPH_EASE })
  for (const child of card.children) {
    (child as HTMLElement).animate?.([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], { duration: MORPH_MS, easing: 'ease-out' })
  }
  const settle = () => card.classList.replace('is-morphing', 'is-morphed')
  grow.finished.then(settle, settle)
}

// The reverse: shrinks the open card back down into the pill it will become
// — same clip-path/height tween as morphFromPill, run backwards, so closing
// reads as one continuous gesture with opening rather than a plain fade-out.
// `pill` is a rect measured from a hidden stand-in pill (see InstallPanel's
// ghostPill) rather than a mounted one, since the real pill doesn't exist
// again until the collapse this animation is leading up to actually commits.
// Returns the running Animation so the caller can key `commitCollapse` off
// its `finished` promise; null (nothing started) tells the caller to fall
// back to the CSS exit instead.
function morphToPill(card: HTMLElement, pill: DOMRect): Animation | null {
  if (typeof card.animate !== 'function') return null
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null
  const from = card.getBoundingClientRect()
  const right = Math.max(0, from.right - pill.right)
  const left = Math.max(0, pill.left - from.left)
  card.classList.add('is-morphing')
  const shrink = card.animate([
    { height: `${from.height}px`, clipPath: `inset(0 0 0 0 round ${CARD_RADIUS}px)` },
    { height: `${pill.height}px`, clipPath: `inset(0 ${right}px 0 ${left}px round ${pill.height / 2}px)` },
  // Keep the pill-shaped final frame painted until React replaces this card
  // with the real pill. Without fill, Web Animations restores the full card
  // for a frame after `finished`, which reads as a flash on desktop.
  ], { duration: MORPH_MS, easing: MORPH_EASE, fill: 'forwards' })
  for (const child of card.children) {
    (child as HTMLElement).animate?.(
      [{ opacity: 1 }, { opacity: 0, offset: 0.5 }, { opacity: 0 }],
      { duration: MORPH_MS, easing: 'ease-in', fill: 'forwards' },
    )
  }
  return shrink
}

// Storage throws outright in some privacy modes — the panel must still work.
function readCollapsed(): boolean {
  try { return sessionStorage.getItem(COLLAPSED_KEY) === '1' } catch { return false }
}
function writeCollapsed(collapsed: boolean): void {
  try {
    if (collapsed) sessionStorage.setItem(COLLAPSED_KEY, '1')
    else sessionStorage.removeItem(COLLAPSED_KEY)
  } catch { /* nothing to do; the in-memory state still holds for this view */ }
}

interface Panel {
  label: string
  steps: ReactNode[]
  // the line under "You're all set!" — what to do now the steps are done
  doneLine: string
  // The step whose target is on screen, and so gets the pencil line from its
  // bullet: the tap on ⋯/Share. The steps after it happen inside Safari's
  // share sheet or the installed app, which cover the page — nothing there
  // for a line to point at.
  lineStep?: number
}

// Steps follow Apple's own iOS/iPadOS user guides for the Safari in front of
// the patient. Safari 26 changed them: Share moved behind ⋯ on iPhone and
// grew a More step on iPad, and Add to Home Screen gained an "Open as Web
// App" switch. That switch is the one that matters most — off, it makes a
// plain bookmark, and a bookmark can never receive a reminder.
//
// `beforeSignIn`: before sign-in the patient must sign in *inside* the
// installed app (it has its own storage); afterwards they have already done
// that.
//
// Which steps, in which order, is decided here; their wording is the
// language's own (i18n/strings.ts `install`).
function panelFor(os: InstallOs, browser: Browser, safari: number | null, beforeSignIn: boolean, t: Strings): Panel {
  const w = t.install
  const modern = safari !== null && safari >= 26
  const device = os === 'ipad' ? 'iPad' : 'iPhone'
  const lines = (...parts: ReactNode[]) => (
    <>{parts.map((part, i) => <span key={i} className="umc-step-line">{part}</span>)}</>
  )

  // Every other iOS browser puts Share somewhere different, and some let the
  // patient move it. Send them to the one whose steps are known.
  if (os !== 'mac' && browser !== 'safari') {
    return { label: w.needSafariLabel(device), doneLine: w.doneSafari, steps: [w.safariOnly, w.openInSafari] }
  }
  if (os === 'iphone' && modern) {
    return {
      label: w.addToHomeLabel(device),
      doneLine: w.doneHome,
      lineStep: 1,
      steps: [
        <>
          <span className="umc-step-line">{w.lookBottomRight}</span>
          <span className="umc-step-line">{w.tapMore}</span>
          <span className="umc-step-line">{w.thenTapShare}</span>
          <span className="umc-step-line umc-step-note">{w.noMoreButton}</span>
        </>,
        w.scrollListAddHome,
        w.webApp,
        w.openIcon(beforeSignIn),
        // The notifications prompt only appears inside the installed app,
        // after the patient taps the page's own "Enable Reminders" button.
        // Without Allow, everything before it was for nothing.
        w.allow(device),
      ],
    }
  }
  if (os === 'iphone') {
    return {
      label: w.addToHomeLabel(device),
      doneLine: w.doneHome,
      lineStep: 1,
      steps: [lines(w.lookBottom, w.tapShare), w.scrollMenuAddHome, w.openIcon(beforeSignIn), w.allow(device)],
    }
  }
  if (os === 'ipad' && modern) {
    return {
      label: w.addToHomeLabel(device),
      doneLine: w.doneHome,
      lineStep: 1,
      steps: [lines(w.lookTopRight, w.tapShare), w.viewMoreAddHome, w.webApp, w.launchApp(beforeSignIn), w.allow(device)],
    }
  }
  if (os === 'ipad') {
    return {
      label: w.addToHomeLabel(device),
      doneLine: w.doneHome,
      lineStep: 1,
      steps: [lines(w.lookTopRight, w.tapShare), w.chooseAddHome, w.launchApp(beforeSignIn), w.allow(device)],
    }
  }
  // A Mac: each browser installs from a different place, so the steps name
  // only the one in front of the patient. No arrow on a Mac.
  if (browser === 'safari') {
    return {
      label: w.addToDockLabel,
      doneLine: w.doneDock,
      steps: [w.macMenuBar, w.macAddToDock, w.macOpenFromDock(beforeSignIn), w.allow('Mac')],
    }
  }
  if (browser === 'chromium') {
    return {
      label: w.addToDockLabel,
      doneLine: w.doneDock,
      steps: [w.macAddressBar, w.macInstall, w.macOpenFromDock(beforeSignIn), w.allow('Mac')],
    }
  }
  return { label: w.needSafariMacLabel, doneLine: w.doneSafari, steps: [w.cannotDock, w.openInSafari] }
}

export function InstallPanel({ os, browser, safariVersion, beforeSignIn, onDone, autoOpen = false }: {
  os: InstallOs; browser: Browser; safariVersion: number | null; beforeSignIn: boolean
  // told the moment the patient taps Done on the last step. Only before
  // sign-in, where Done unlocks "Continue with phone"; after sign-in there is
  // no Done — the page celebrates once reminders are really on instead.
  onDone?: () => void
  // Phones (decision 2026-09-18): start as the "Set up reminders" pill, then
  // a second later morph open by themselves and scroll up to the top of the
  // screen. A tap on the pill inside that second opens it there and then, and
  // the automatic opening (and its scroll) is called off.
  autoOpen?: boolean
}) {
  const t = useStrings()
  // Put away earlier this session: stays put away, nothing opens by itself.
  const [holding] = useState(() => autoOpen && SETUP_HOLD_MS > 0 && !readCollapsed())
  const [collapsed, setCollapsed] = useState(() => holding || readCollapsed())
  const pill = useRef<HTMLButtonElement>(null)
  const card = useRef<HTMLElement>(null)
  // Set as the pill opens: where it was, and whether this was the automatic
  // opening (which also scrolls).
  const morph = useRef<{ from: DOMRect; auto: boolean } | null>(null)
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelScroll = useRef<(() => void) | null>(null)
  // Kept mounted through the shrink-out; `collapsed` only flips once it ends.
  // 'morph' when the card is animating itself back down into the pill's
  // shape (see ghostPill below), 'fade' for the plain CSS exit it falls
  // back to (reduced motion, or no Web Animations support).
  const [closeMode, setCloseMode] = useState<'idle' | 'morph' | 'fade'>('idle')
  const closing = closeMode !== 'idle'
  // A morph already draws the pill's entrance. The real pill that replaces
  // it must not run its normal opacity/scale entrance again at the handoff.
  const [settlePill, setSettlePill] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // A hidden stand-in for the pill this card collapses into, sized and
  // shaped exactly like the real one but out of flow and invisible — the
  // real pill doesn't exist while the card is open, so this is what
  // morphToPill measures its target rect from.
  const ghostPill = useRef<HTMLButtonElement>(null)
  // the bullet the pencil line starts from
  const anchor = useRef<HTMLSpanElement>(null)

  // "You're all set!" is showing; the panel closes itself when it ends
  const [celebrating, setCelebrating] = useState(false)
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
    if (celebrateTimer.current) clearTimeout(celebrateTimer.current)
    if (autoTimer.current) clearTimeout(autoTimer.current)
    cancelScroll.current?.()
  }, [])

  const openFromPill = (auto: boolean) => {
    if (autoTimer.current) { clearTimeout(autoTimer.current); autoTimer.current = null }
    const from = pill.current?.getBoundingClientRect()
    morph.current = from ? { from, auto } : null
    setSettlePill(false)
    setCollapsed(false)
    writeCollapsed(false)
  }
  useEffect(() => {
    if (!holding) return
    autoTimer.current = setTimeout(() => { autoTimer.current = null; openFromPill(true) }, SETUP_HOLD_MS)
    return () => { if (autoTimer.current) { clearTimeout(autoTimer.current); autoTimer.current = null } }
  }, [holding])
  // Before paint, so the card never shows at full size for a frame first.
  useLayoutEffect(() => {
    const m = morph.current
    if (collapsed || !m || !card.current) return
    morph.current = null
    morphFromPill(card.current, m.from)
    if (m.auto) { cancelScroll.current?.(); cancelScroll.current = bringToTop(card.current) }
  }, [collapsed])

  const commitCollapse = (fromMorph = false) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    setSettlePill(fromMorph)
    setCloseMode('idle')
    setCollapsed(true)
    writeCollapsed(true)
  }
  const handleClose = () => {
    if (closing) return
    const pillRect = ghostPill.current?.getBoundingClientRect()
    const shrink = pillRect && card.current ? morphToPill(card.current, pillRect) : null
    if (shrink) {
      setCloseMode('morph')
      shrink.finished.then(() => commitCollapse(true), () => commitCollapse(true))
      return
    }
    setCloseMode('fade')
    // animationend does the honours when the animation runs; this covers the
    // cases where it never fires at all.
    timer.current = setTimeout(commitCollapse, EXIT_MS)
  }
  // A tap on the pill — also during the first second, which cancels the
  // automatic opening.
  const handleReopen = () => openFromPill(false)
  const handleDone = () => {
    if (celebrating) return
    onDone?.()
    setCelebrating(true)
    celebrateTimer.current = setTimeout(() => {
      celebrateTimer.current = null
      setCelebrating(false)
      handleClose()
    }, CELEBRATE_MS)
  }

  if (collapsed) {
    return (
      <button type="button" ref={pill} className={`umc-install-pill${settlePill ? ' is-morph-settled' : ''}`} onClick={handleReopen}>
        <span className="umc-install-pill-bell" aria-hidden="true"><Glyph name="phone-vibrate" /></span>
        {t.install.pill}
        <span className="umc-install-pill-caret" aria-hidden="true">▸</span>
      </button>
    )
  }

  const { label, steps, lineStep, doneLine } = panelFor(os, browser, safariVersion, beforeSignIn, t)
  const target = installTarget(os, browser, safariVersion)
  const lineFrom = target && lineStep ? lineStep : null
  // While "You're all set!" plays, it is the whole card — the finished steps
  // step aside so it stays small, rather than floating in a tall empty box.
  if (celebrating) {
    return (
      <section className={`umc-install-card is-celebrating${closing ? ' is-closing' : ''}`}
        onAnimationEnd={(e) => { if (closing && e.target === e.currentTarget) commitCollapse() }}>
        <AllSet line={doneLine} />
      </section>
    )
  }
  return (
    <section
      ref={card}
      className={`umc-install-card${closeMode === 'morph' ? ' is-morphing' : closeMode === 'fade' ? ' is-closing' : ''}`}
      onAnimationEnd={(e) => { if (closeMode === 'fade' && e.target === e.currentTarget) commitCollapse() }}
    >
      {/* Measured, never shown — see ghostPill above. */}
      <button type="button" ref={ghostPill} className="umc-install-pill umc-install-pill-ghost" aria-hidden="true" tabIndex={-1}>
        <span className="umc-install-pill-bell" aria-hidden="true"><Glyph name="phone-vibrate" /></span>
        {t.install.pill}
        <span className="umc-install-pill-caret" aria-hidden="true">▸</span>
      </button>
      <div className="umc-install-top">
        <p className="umc-install-label">{label}</p>
        <button type="button" className="umc-install-x" aria-label={t.install.hide} onClick={handleClose}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {/* Every step at once (decision 2026-09-18), so the whole route is
          readable before the patient leaves the page for the share sheet. */}
      <ol className="umc-install-steps">
        {steps.map((step, i) => {
          const n = i + 1
          return (
            <li key={n} className="is-active">
              <span className="umc-install-num" aria-hidden="true" ref={n === lineFrom ? anchor : undefined}
                data-sketch-anchor={n === lineFrom ? '' : undefined}>{n}</span>
              <span className="umc-install-body">{step}</span>
            </li>
          )
        })}
      </ol>
      {/* Done in the panel's foot, right-hand side. Not "Continue": that word
          already belongs to the sign-in button just below the panel. */}
      {onDone && (
        <div className="umc-install-foot">
          <button type="button" className="umc-install-next" onClick={handleDone} disabled={celebrating}>{t.install.done} <span aria-hidden="true">✓</span></button>
        </div>
      )}
      {/* Drawn once each time the panel opens, starting 1s in (see
          .umc-sketch-* in RemindersPage.css). Leaves with the card on close. */}
      {!closing && target && lineFrom && <SketchLine key={lineFrom} at={target} step={lineFrom} anchor={anchor} />}
    </section>
  )
}
