// app.jsx — loader + assembly. No theme toggle, no nav (single light theme).

function Loader({ onDone }) {
  const [pct, setPct] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const [settled, setSettled] = React.useState(false);
  const pillRef = React.useRef(null);
  React.useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let p = 0;
    let cancelled = false;

    // when loading hits 100%, ROTATE the pill smoothly from wherever it is
    // (continuing forward, no snap) into the final pose, and only THEN advance.
    // Driven by a self-terminating rAF tween on the wall clock, with an
    // idempotent advance + safety timeout so the reveal can never hang.
    const settleThenAdvance = () => {
      const pill = pillRef.current;
      const TARGET = 225;            // -135deg orientation: dark end NE, white end SW
      const settleMs = reduce ? 1 : 780;
      let advanced = false;
      const advance = () => {
        if (cancelled || advanced) return;
        advanced = true;
        if (pill) pill.style.transform = "rotate(-135deg)";  // exact final orientation, no snap
        setSettled(true);
        setTimeout(() => { if (!cancelled) { setDone(true); setTimeout(onDone, 850); } }, reduce ? 40 : 260);
      };
      if (pill) {
        // read the live spin angle so we keep turning forward to the target
        let cur = 0;
        const tr = getComputedStyle(pill).transform;
        const m = tr && tr.match(/matrix\(([^)]+)\)/);
        if (m) { const v = m[1].split(",").map(Number); cur = Math.atan2(v[1], v[0]) * 180 / Math.PI; }
        let end = cur + ((((TARGET - cur) % 360) + 360) % 360); // forward to target orientation
        if (end - cur < 140) end += 360;                         // always a graceful turn, never a near-snap
        pill.style.animation = "none";
        pill.style.transform = `rotate(${cur}deg)`;
        const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
        const t0 = performance.now();
        const tick = (now) => {
          if (cancelled || advanced) return;
          const p = Math.min((now - t0) / settleMs, 1);
          pill.style.transform = `rotate(${cur + (end - cur) * easeOutCubic(p)}deg)`;
          if (p < 1) requestAnimationFrame(tick);
          else advance();
        };
        requestAnimationFrame(tick);
      }
      // safety net: advance even if rAF is throttled / never completes
      setTimeout(advance, settleMs + 500);
    };

    const step = () => {
      if (cancelled) return;
      p += Math.random() * 14 + 6;
      if (p >= 100) { p = 100; setPct(100); settleThenAdvance(); return; }
      setPct(Math.floor(p));
      setTimeout(step, reduce ? 25 : 95 + Math.random() * 80);
    };
    const t = setTimeout(step, reduce ? 10 : 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [onDone]);

  const ticks = Array.from({ length: 36 });
  const lit = Math.round((pct / 100) * ticks.length);
  return (
    <div className={"loader" + (settled ? " settled" : "") + (done ? " done" : "")}>
      <div className="ring" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Loading">
        {ticks.map((_, i) => (
          <span key={i} className={"tick" + (i % 9 === 0 ? " card" : "") + (i < lit ? " on" : "")}
                style={{ transform: `rotate(${i * (360 / ticks.length)}deg)` }} />
        ))}
        <div className="pill"><i ref={pillRef} /></div>
      </div>
    </div>
  );
}

function App() {
  // Deep-links ("#pillars", "#download") skip the loader and start revealed so
  // the intro jumps straight to the bloomed state (pillars / download section).
  const deepLink = typeof window !== "undefined" && ["#pillars", "#download"].includes(window.location.hash);
  const [revealed, setRevealed] = React.useState(deepLink);
  return (
    <React.Fragment>
      <CursorLayer />
      {!deepLink && <Loader onDone={() => setRevealed(true)} />}
      <div className="scroll-shell">
        <IntroStage holdMs={2000} diveMs={800} maxSpin={10} hubCrossScale={0.30} heroReady={revealed} />
        <Marquee />
        <Trust />
        <Download />
        <Ending />
      </div>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
