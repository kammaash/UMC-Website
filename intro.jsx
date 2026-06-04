// intro.jsx — the orchestrated opening:
//   black "Care. Connect. Comfort." -> a small scroll AUTO-runs the blur + builds
//   a sharp medical cross on its own -> "Press & Hold" spins the cross like a tyre
//   (releasing early reverse-spins it back over the time it was held) -> a slow,
//   refined comic burst flips bg to light and blooms four pillars around an upright
//   cross -> clicking a pillar does a slow CAMERA DIVE: the surrounding pillars scale
//   THROUGH the clicked one (pinhole), its symbol fills the screen and racks to blur,
//   and a role-specific page eases in. Closing dollies smoothly back out.
const { useState, useRef, useEffect, useLayoutEffect, useMemo } = React;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const easeOut = (p) => 1 - Math.pow(1 - p, 3);

const FEAT_HEAD = {
  patient: "What every patient gets",
  doctor: "What every doctor gets",
  pharmacy: "What every pharmacy gets",
  diagnostics: "What every lab gets",
};
const ORIGIN = { top: "50% 0%", right: "100% 50%", bottom: "50% 100%", left: "0% 50%" };

function Speedlines({ progress, spin, active }) {
  // a fixed radial fan of TANGENTIAL streaks that ROTATE with the cross
  // (no expansion — length stays constant; the whole fan spins)
  const lines = useMemo(() => Array.from({ length: 30 }).map((_, i) => {
    const r = () => Math.random();
    return {
      angle: (i / 30) * 360 + (r() * 4 - 2),
      rad: 132 + r() * 64,
      len: 26 + r() * 64,
      thick: 1.4 + r() * 2.1,
      op: 0.22 + r() * 0.6,
    };
  }), []);
  return (
    <div className="speedlines" style={{ opacity: active ? Math.min(1, 0.18 + progress * 0.9) : 0 }}>
      <div className="sl-rot" style={{ transform: `rotate(${spin}deg)` }}>
        {lines.map((l, i) => (
          <span key={i} className="ln" style={{
            transform: `rotate(${l.angle}deg) translateX(${l.rad}px) rotate(90deg)`,
            width: `${l.len}px`,
            height: `${l.thick}px`,
            opacity: l.op,
          }} />
        ))}
      </div>
    </div>
  );
}

// ---- explosion: a light shock-wipe sweeps out of the cross and PAINTS the
//      world light (bg flip is synced to the ring), plus a sharp pulse ring ----
function Boom({ show }) {
  return (
    <div className="boom" data-show={show}>
      <div className="wipe" />
      <div className="ring lead" />
      <div className="ring pulse" />
    </div>
  );
}

const SIDES = ["top", "right", "bottom", "left"];

function IntroStage({ holdMs, diveMs, maxSpin, hubCrossScale }) {
  const [phase, setPhase] = useState("hero");   // hero | holding | boom | bloomed | dive
  const [introP, setIntroP] = useState(0);       // 0..1 opening progress (auto-tweened)
  const [holdP, setHoldP] = useState(0);         // 0..1 press-and-hold progress
  const [spin, setSpin] = useState(0);           // live cross/streak rotation (deg)
  const [active, setActive] = useState(null);    // role index when dived
  const [hoverSide, setHoverSide] = useState(null);
  const [lit, setLit] = useState(false);
  const [closing, setClosing] = useState(false); // dive-out in progress
  const [focused, setFocused] = useState(false); // rack-focus blur on opened role
  const [cardIdx, setCardIdx] = useState(0);     // active card in the mobile swipe carousel
  const cardsRef = useRef(null);

  const stageRef = useRef(null);
  const crossRef = useRef(null);
  const diveIconRef = useRef(null);
  const diveRef = useRef(null);
  const fromRectRef = useRef(null);     // clicked glyph rect (drives the symbol FLIP)
  const fromCircleRef = useRef(null);   // clicked circle rect (drives the iris)
  const flipRef = useRef(null);

  const introPRef = useRef(0); introPRef.current = introP;
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const activeRef = useRef(active); activeRef.current = active;
  const closingRef = useRef(closing); closingRef.current = closing;

  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const HOLD_MS = holdMs ?? (reduce ? 700 : 3000);

  // peak angular speed of the spin (deg/ms) — tweakable, read live via ref
  const maxSpinRef = useRef(maxSpin ?? 26); maxSpinRef.current = maxSpin ?? 26;

  // how small the cross scales down when it settles into the hub centre
  const hubCrossScaleRef = useRef(hubCrossScale ?? 0.26); hubCrossScaleRef.current = hubCrossScale ?? 0.26;
  const crossOffsetRef = useRef({ dx: 0, dy: 0 });

  // live-update the bloomed cross size when the slider changes
  useEffect(() => {
    if (phase === "bloomed" && crossRef.current) {
      const { dx, dy } = crossOffsetRef.current;
      crossRef.current.style.transform = `translate(${dx}px, ${dy}px) rotate(0deg) scale(${hubCrossScaleRef.current})`;
    }
  }, [hubCrossScale, phase]);

  // Re-anchor the settled cross to the hub centre on any viewport change
  // (zoom / resize). On small screens the hub-inner is hidden, so we leave the
  // cross alone — CSS fades it out — and when the viewport grows back to a size
  // that shows the radial hub again, this recomputes its offset so it returns
  // to exactly the right spot.
  const repositionCross = () => {
    if (phaseRef.current !== "bloomed") return;
    const cross = crossRef.current;
    const hubInner = document.querySelector(".hub-inner");
    if (!cross || !hubInner || hubInner.offsetParent === null) return; // hidden on small screens
    const prevT = cross.style.transition;
    cross.style.transition = "none";
    cross.style.transform = "none";
    const fr = cross.getBoundingClientRect();
    const hr = hubInner.getBoundingClientRect();
    const dx = (hr.left + hr.width / 2) - (fr.left + fr.width / 2);
    const dy = (hr.top + hr.height / 2) - (fr.top + fr.height / 2);
    crossOffsetRef.current = { dx, dy };
    cross.style.transform = `translate(${dx}px, ${dy}px) rotate(0deg) scale(${hubCrossScaleRef.current})`;
    requestAnimationFrame(() => { cross.style.transition = prevT || ""; });
  };

  useEffect(() => {
    let raf = 0;
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(repositionCross); };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); cancelAnimationFrame(raf); };
  }, []);

  const ready = introP >= 0.999 && phase === "hero";

  // ---- entrance reveal for the hero words ----
  useEffect(() => {
    requestAnimationFrame(() => { if (stageRef.current) stageRef.current.classList.add("in"); });
  }, []);

  // ---- scroll lock: locked until the pillars bloom ----
  useEffect(() => {
    const shell = document.querySelector(".scroll-shell");
    if (!shell) return;
    if (phase === "bloomed") shell.classList.remove("locked");
    else shell.classList.add("locked");
  }, [phase]);

  // ---- a small scroll AUTO-runs the opening (blur + cross build) ----
  const auto = useRef({ raf: 0, running: false, accum: 0 });
  const runAuto = () => {
    if (auto.current.running || introPRef.current >= 1) return;
    auto.current.running = true;
    const from = introPRef.current;
    const dur = reduce ? 280 : 1800;
    const t0 = performance.now();
    const step = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      setIntroP(from + (1 - from) * easeInOut(p));
      if (p < 1 && phaseRef.current === "hero") auto.current.raf = requestAnimationFrame(step);
      else auto.current.running = false;
    };
    auto.current.raf = requestAnimationFrame(step);
  };

  useEffect(() => {
    const trigger = (delta) => {
      if (phaseRef.current !== "hero") return false;
      if (introPRef.current >= 1) return true; // still swallow scroll, but nothing to do
      auto.current.accum += Math.abs(delta);
      if (auto.current.accum > 40) runAuto();
      return true;
    };
    const onWheel = (e) => {
      const p = phaseRef.current;
      if (p === "hero") { e.preventDefault(); trigger(e.deltaY); }
      else if (p !== "bloomed") e.preventDefault();
    };
    let touchY = null;
    const onTouchStart = (e) => { touchY = e.touches[0].clientY; };
    const onTouchMove = (e) => {
      const p = phaseRef.current;
      if (p === "hero") { e.preventDefault(); const y = e.touches[0].clientY; trigger(touchY - y); touchY = y; }
      else if (p !== "bloomed") e.preventDefault();
    };
    const onKey = (e) => {
      if (phaseRef.current === "hero" && ["ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); runAuto(); }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // ---- press & hold ----
  const hold = useRef({ raf: 0, start: 0, last: 0, angle: 0, speed: 0 });

  const startHold = () => {
    if (!(introPRef.current >= 0.999 && phaseRef.current === "hero")) return;
    if (crossRef.current) crossRef.current.style.transition = "none";
    setPhase("holding");
    const h = hold.current;
    h.start = performance.now();
    h.last = h.start;
    h.angle = 0;
    h.speed = 0;
    const loop = (t) => {
      const h = hold.current;
      const p = clamp((t - h.start) / HOLD_MS, 0, 1);
      const dt = clamp((t - h.last) / 16.6667, 0, 4); // frames elapsed (capped)
      h.last = t;
      setHoldP(p);
      // smooth ease-in acceleration: gentle start that builds up like a flywheel
      h.speed = 0.5 + maxSpinRef.current * (p * p * (3 - 2 * p)) * p;   // smoothstep × p ramp
      h.angle += h.speed * dt;
      setSpin(h.angle);
      if (crossRef.current) crossRef.current.style.transform = `rotate(${h.angle}deg)`;
      if (p >= 1) { explode(); return; }
      h.raf = requestAnimationFrame(loop);
    };
    h.raf = requestAnimationFrame(loop);
  };

  // release early -> reverse-spin back to upright over the SAME time it was held
  const endHold = () => {
    if (phaseRef.current !== "holding") return;
    const h = hold.current;
    cancelAnimationFrame(h.raf);
    const heldMs = performance.now() - h.start;
    setPhase("hero");
    setHoldP(0);
    const startAngle = h.angle;
    const dur = clamp(heldMs, 280, 5000);
    const t0 = performance.now();
    if (crossRef.current) crossRef.current.style.transition = "none";
    const rev = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      const a = startAngle * (1 - easeOut(p));   // unwind the other way, decelerating
      setSpin(a);
      if (crossRef.current) crossRef.current.style.transform = `rotate(${a}deg)`;
      if (p < 1 && phaseRef.current === "hero") h.raf = requestAnimationFrame(rev);
      else { h.angle = 0; setSpin(0); if (crossRef.current) crossRef.current.style.transform = "rotate(0deg)"; }
    };
    h.raf = requestAnimationFrame(rev);
  };

  // explosion: cross keeps spinning, DECELERATES to upright while it recolors
  // black and drifts to the bloom centre — then the pillars emerge out of it.
  const explode = () => {
    cancelAnimationFrame(hold.current.raf);
    setHoldP(1);
    setPhase("settle");
    const h = hold.current;
    const startAngle = h.angle;
    const target = Math.ceil((startAngle + 220) / 360) * 360; // a little more spin, land upright
    const cross = crossRef.current;
    const hubInner = document.querySelector(".hub-inner");
    let dx = 0, dy = 0, scaleTo = hubCrossScaleRef.current;
    if (cross && hubInner) {
      const fr = cross.getBoundingClientRect();
      const hr = hubInner.getBoundingClientRect();
      dx = (hr.left + hr.width / 2) - (fr.left + fr.width / 2);
      dy = (hr.top + hr.height / 2) - (fr.top + fr.height / 2);
      scaleTo = hubCrossScaleRef.current;
      crossOffsetRef.current = { dx, dy };
    }
    const DUR = reduce ? 380 : 1350;
    const t0 = performance.now();
    setTimeout(() => setLit(true), reduce ? 120 : 180);   // cross ignites black + bg flips AS the ring emanates
    if (cross) cross.style.transition = "none";
    const settleLoop = (t) => {
      const p = clamp((t - t0) / DUR, 0, 1);
      const e = easeOut(p);                           // decelerate
      const a = startAngle + (target - startAngle) * e;
      const sc = 1 + (scaleTo - 1) * e;
      setSpin(a);
      if (cross) cross.style.transform = `translate(${dx * e}px, ${dy * e}px) rotate(${a}deg) scale(${sc})`;
      if (p < 1) { hold.current.raf = requestAnimationFrame(settleLoop); }
      else { h.angle = 0; setPhase("bloomed"); }      // pillars now emerge from the cross
    };
    hold.current.raf = requestAnimationFrame(settleLoop);
  };

  // ---- camera DIVE in/out (smooth dolly) — duration is tweakable ----
  const DIVE_IN = diveMs ?? (reduce ? 340 : 1700);
  const DIVE_OUT = Math.round((diveMs ?? (reduce ? 340 : 1700)) * 0.82);
  const DIVE_EASE = "cubic-bezier(0.65, 0, 0.35, 1)"; // smooth ease-in-out both ways

  // keep the CSS background/symbol morph in sync with the (tweakable) dive duration
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--dive-bg-dur", Math.round(DIVE_OUT * 0.6) + "ms");
    root.style.setProperty("--dive-bg-delay", Math.round(DIVE_OUT * 0.36) + "ms");
  }, [DIVE_OUT]);

  // find the VISIBLE cap for a side — works for either the radial prong
  // hub (desktop) or the role-card grid (small screens). offsetParent is
  // null when an element (or an ancestor) is display:none, so the hidden
  // layout is skipped automatically.
  const visibleCap = (side) => {
    const caps = document.querySelectorAll(".prong-" + side + " .cap, .role-card[data-side='" + side + "'] .cap");
    for (const c of caps) { if (c.offsetParent !== null) return c; }
    return caps[0] || null;
  };
  const prongRect = (side) => {
    const cap = visibleCap(side);
    if (!cap) return null;
    const glyph = cap.querySelector("svg");
    return (glyph || cap).getBoundingClientRect();
  };
  const prongCircleRect = (side) => {
    const cap = visibleCap(side);
    return cap ? cap.getBoundingClientRect() : null;
  };

  // mobile role carousel — track the centred card + jump to one on dot tap
  const onCardsScroll = () => {
    const el = cardsRef.current; if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0, bestD = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const cc = c.offsetLeft + c.offsetWidth / 2;
      const d = Math.abs(cc - center);
      if (d < bestD) { bestD = d; best = i; }
    });
    setCardIdx(best);
  };
  const scrollToCard = (i) => {
    const el = cardsRef.current; if (!el) return;
    const c = el.children[i]; if (!c) return;
    el.scrollTo({ left: c.offsetLeft - (el.clientWidth - c.offsetWidth) / 2, behavior: "smooth" });
  };

  const openRole = (i, e) => {
    if (phaseRef.current !== "bloomed") return;
    const circle = e.currentTarget.querySelector(".cap");
    const glyph = e.currentTarget.querySelector(".cap svg") || circle;
    fromRectRef.current = glyph ? glyph.getBoundingClientRect() : null;
    fromCircleRef.current = circle ? circle.getBoundingClientRect() : null;
    flipRef.current = "in";
    setClosing(false); setFocused(false);
    setActive(i); setPhase("dive");
  };

  const closeRole = () => {
    if (phaseRef.current !== "dive" || closingRef.current) return;
    setClosing(true); setFocused(false);
    const side = ROLES[activeRef.current].side;
    const to = prongRect(side) || fromRectRef.current;
    const el = diveIconRef.current;
    if (el && to) {
      el.style.transition = "none"; el.style.transform = "translate(0px, 0px) scale(1)"; el.style.opacity = "1";
      const base = el.getBoundingClientRect();
      const scale = to.width / base.width;
      const tx = (to.left + to.width / 2) - (base.left + base.width / 2);
      const ty = (to.top + to.height / 2) - (base.top + base.height / 2);
      void el.offsetWidth;
      el.style.transition = `transform ${DIVE_OUT}ms ${DIVE_EASE}, opacity ${DIVE_OUT * 0.9}ms ease`;
      el.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      el.style.opacity = "1";
    }
    // collapse the circular reveal back into the pillar
    const dv = diveRef.current;
    const circleTo = prongCircleRect(side) || to;
    if (dv && circleTo) {
      const cx = circleTo.left + circleTo.width / 2, cy = circleTo.top + circleTo.height / 2;
      const startR = circleTo.width / 2;
      dv.style.transition = `clip-path ${DIVE_OUT}ms ${DIVE_EASE}`;
      dv.style.clipPath = `circle(${startR}px at ${cx}px ${cy}px)`;
    }
    setTimeout(() => {
      setPhase("bloomed"); setActive(null); setClosing(false);
      if (diveIconRef.current) { const x = diveIconRef.current; x.style.transition = "none"; x.style.transform = "none"; x.style.opacity = ""; }
      if (diveRef.current) { const d = diveRef.current; d.style.transition = "none"; d.style.clipPath = ""; }
    }, DIVE_OUT);
  };

  // FLIP the big symbol from the clicked pillar to fullscreen (slow + natural),
  // and reveal the role via a circular iris that grows out of the clicked circle.
  useLayoutEffect(() => {
    if (phase !== "dive" || flipRef.current !== "in") return;
    flipRef.current = null;
    const el = diveIconRef.current;
    const from = fromRectRef.current;
    if (!el) return;
    el.style.transition = "none"; el.style.transform = "translate(0px, 0px) scale(1)"; el.style.opacity = "1";
    const base = el.getBoundingClientRect();
    if (from && base.width) {
      const scale = from.width / base.width;
      const tx = (from.left + from.width / 2) - (base.left + base.width / 2);
      const ty = (from.top + from.height / 2) - (base.top + base.height / 2);
      el.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      el.style.opacity = "0.35";
      void el.offsetWidth;
      el.style.transition = `transform ${DIVE_IN}ms ${DIVE_EASE}, opacity ${DIVE_IN * 0.55}ms ease`;
      el.style.transform = "translate(0px, 0px) scale(1)";
      el.style.opacity = "1";
    }
    // circular reveal grows from the clicked CIRCLE to fill the screen
    const dv = diveRef.current;
    const circle = fromCircleRef.current || from;
    if (dv && circle) {
      const cx = circle.left + circle.width / 2, cy = circle.top + circle.height / 2;
      const W = window.innerWidth, H = window.innerHeight;
      const endR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 4;
      const startR = circle.width / 2;
      dv.style.transition = "none";
      dv.style.clipPath = `circle(${startR}px at ${cx}px ${cy}px)`;
      void dv.offsetWidth;
      dv.style.transition = `clip-path ${DIVE_IN}ms ${DIVE_EASE}`;
      dv.style.clipPath = `circle(${endR}px at ${cx}px ${cy}px)`;
    }
    // blur applies immediately as the role page opens (no delay)
    setFocused(true);
  }, [phase, active]);

  // arrow / esc nav while dived (crossfade, no FLIP)
  useEffect(() => {
    const onKey = (e) => {
      if (phaseRef.current !== "dive" || closingRef.current) return;
      if (e.key === "Escape") closeRole();
      else if (["ArrowRight", "ArrowDown"].includes(e.key)) setActive((a) => (a + 1) % ROLES.length);
      else if (["ArrowLeft", "ArrowUp"].includes(e.key)) setActive((a) => (a - 1 + ROLES.length) % ROLES.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const Cap = ({ name }) => { const C = Icons[name]; return <C />; };

  // ---- derived values ----
  const buildV = clamp((introP - 0.04) / 0.5, 0, 1);   // vertical arm draws first
  const buildH = clamp((introP - 0.28) / 0.5, 0, 1);   // then horizontal arm
  const blur = (reduce ? 0 : 30) * introP;
  const heroOpacity = 1 - introP;
  const holding = phase === "holding";

  const headShown = phase === "bloomed" || phase === "dive";
  const roleNow = active != null ? ROLES[active] : null;
  const diveSide = roleNow ? roleNow.side : null;
  const diveState = phase === "dive" ? (closing ? "out" : "in") : "off";

  return (
    <section ref={stageRef} className={"intro snap" + (lit ? " lit" : "")} data-phase={phase} data-dive={diveState} id="intro" data-screen-label="Intro">

      {/* hero layer — auto blur morphs the words into the black */}
      <div className="hero-layer" style={{ filter: `blur(${blur}px)`, opacity: heroOpacity }}>
        <div className="words">
          <div className="word"><span>Care.</span></div>
          <div className="word"><span>Connect.</span></div>
          <div className="word muted"><span>Comfort.</span></div>
        </div>
        <div className="scroll-cue"><span>Scroll to begin</span><span className="line" /></div>
      </div>

      {/* the building cross (hero + hold) */}
      <div className="cross-stage">
        <Speedlines progress={holdP} spin={spin} active={holding} />

        <div className={"cross-wrap" + (ready ? " ready" : "")} data-show={true}>
          <div className="cross" ref={crossRef}
               onPointerDown={(e) => { e.preventDefault(); startHold(); }}
               onPointerUp={endHold} onPointerLeave={endHold} onPointerCancel={endHold}
               onContextMenu={(e) => e.preventDefault()}
               role="button" aria-label="Hold to reveal the four pillars">
            <div className="arm v" style={{ transform: `translate(-50%,-50%) scaleY(${buildV})`, opacity: buildV }} />
            <div className="arm h" style={{ transform: `translate(-50%,-50%) scaleX(${buildH})`, opacity: buildH }} />
            <div className="core" style={{ transform: `translate(-50%,-50%) scale(${buildH})`, opacity: buildH }} />
          </div>
        </div>

        {/* Press & Hold prompt — becomes "Hold" + bar once the hold begins */}
        <div className="hold-ui" data-show={ready || holding} data-holding={holding}>
          <div className="hold-word">{holding ? "Hold" : "Press & Hold"}</div>
          <div className="hold-bar"><i style={{ transform: `scaleX(${holdP})` }} /></div>
        </div>
      </div>

      {/* soft bloom glow during the settle */}
      <Boom show={phase === "settle"} />

      {/* bloomed: the settled cross is the centre; paths + pillars emerge out of it */}
      <div className="hub" data-show={phase === "bloomed" || phase === "dive"}>
        <div className="hub-inner" style={diveSide ? { transformOrigin: ORIGIN[diveSide] } : undefined}>
          {SIDES.map((s) => (
            <span key={s} className={"path path-" + s} data-lit={hoverSide === s} />
          ))}

          {ROLES.map((r, i) => (
            <button key={r.key} className={"prong prong-" + r.side}
                    onMouseEnter={() => setHoverSide(r.side)} onMouseLeave={() => setHoverSide(null)}
                    onClick={(e) => openRole(i, e)} aria-label={"Explore " + r.label}>
              <span className="cap">
                <Cap name={r.icon} />
              </span>
              <span className="prong-name">{r.label}</span>
            </button>
          ))}
        </div>

        {/* small-screen layout: the four roles as a horizontal swipe carousel —
            one card per screen, swipe (or tap a dot) to see the rest. Each card
            keeps a .cap so openRole / closeRole drive the same iris open +
            collapse-back animation as the desktop pillars. */}
        <div className="role-carousel">
          <div className="role-cards" ref={cardsRef} onScroll={onCardsScroll}>
            {ROLES.map((r, i) => (
              <button key={r.key} className="role-card" data-side={r.side}
                      onClick={(e) => openRole(i, e)} aria-label={"Explore " + r.label}>
                <span className="rc-head">
                  <span className="cap"><Cap name={r.icon} /></span>
                </span>
                <span className="rc-label">{r.label}</span>
                <span className="rc-lede">{r.lede}</span>
                <span className="rc-cta">Explore<span className="rc-arrow" aria-hidden="true">→</span></span>
              </button>
            ))}
          </div>
          <div className="role-dots">
            {ROLES.map((r, i) => (
              <button key={r.key} className={"role-dot" + (cardIdx === i ? " on" : "")}
                      onClick={() => scrollToCard(i)} aria-label={"Show " + r.label} />
            ))}
          </div>
        </div>
      </div>

      {/* post-bloom title */}
      <div className="stage-head" data-show={headShown}>
        <span className="eyebrow">An ecosystem, not an app</span>
        <h2>The four pillars of modern healthcare</h2>
        <div className="hint">Select a pillar to dive in →</div>
      </div>

      {/* camera DIVE overlay — circular iris from the clicked circle + rack focus */}
      <div ref={diveRef} className={"dive" + (focused ? " focused" : "") + (closing ? " closing" : "")} data-show={phase === "dive"}>
        <div className="dive-bg" />
        <div className="dive-icon" ref={diveIconRef}>
          {roleNow && <Cap name={roleNow.icon} />}
        </div>
        {roleNow && (
          <div className="dive-info" key={roleNow.key}>
            <div className="di-eyebrow">{roleNow.label}</div>
            <h3>{roleNow.title}</h3>
            <p className="di-lede">{roleNow.lede}</p>
            <div className="di-feat">
              <div className="di-feat-head">{FEAT_HEAD[roleNow.key]}</div>
              <div className="di-rows">
                {roleNow.rows.map((row, j) => (
                  <div className="di-row" key={j}>
                    <span className="di-rt"><b>{row.t}</b><span>{row.d}</span></span>
                  </div>
                ))}
              </div>
            </div>
            <div className="di-demo">
              <div className="di-demo-head">See it in action</div>
              <div className="di-demo-frame" role="img"
                   aria-label={roleNow.label + " demo video"}>
                <span className="di-demo-play" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M8 5.5v13l11-6.5-11-6.5z" fill="currentColor" /></svg>
                </span>
                <span className="di-demo-cap">{roleNow.label} walkthrough · demo</span>
              </div>
            </div>
          </div>
        )}
        <button className="dive-back" onClick={closeRole}>← All pillars</button>
      </div>
    </section>
  );
}

window.IntroStage = IntroStage;
