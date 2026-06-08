// cursor.jsx — Inversion ring cursor for UMC landing page.
// Gated on (pointer: fine); respects prefers-reduced-motion (no custom cursor if reduced).
(function () {
  const { useRef, useEffect } = React;
  const lerp = (a, b, t) => a + (b - a) * t;

  // Elements the ring morphs to wrap
  const BTN_SEL = ".btn, .prong, .role-card, .rn-tab, .rn-cta, .rn-back, .faq-item";

  // All interactive elements (for hoverEl tracking)
  const INTERACTIVE = [
    "a", "button", "[role='button']",
    ".prong", ".role-card", ".faq-q", ".join-cta",
    ".btn", ".rn-tab", ".rn-back", ".rn-cta",
    "input", "select",
  ].join(",");

  function useCursor() {
    const s = useRef({
      x: window.innerWidth / 2, y: window.innerHeight / 2,
      px: 0, py: 0, vx: 0, vy: 0,
      down: false, visible: false, hoverEl: null,
    });
    useEffect(() => {
      const st = s.current;
      const onMove = (e) => {
        st.px = st.x; st.py = st.y;
        st.x = e.clientX; st.y = e.clientY;
        st.vx = st.x - st.px; st.vy = st.y - st.py;
        st.visible = true;
        st.hoverEl = e.target && e.target.closest ? e.target.closest(INTERACTIVE) : null;
      };
      const onDown = () => { st.down = true; };
      const onUp = () => { st.down = false; };
      const onLeave = () => { st.visible = false; };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("pointerdown", onDown);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("blur", onLeave);
      document.addEventListener("mouseleave", onLeave);
      return () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("blur", onLeave);
        document.removeEventListener("mouseleave", onLeave);
      };
    }, []);
    return s;
  }

  function InvertCursor() {
    const s = useCursor();
    const ring = useRef(null);
    const m = useRef({ rx: window.innerWidth / 2, ry: window.innerHeight / 2, rw: 26, rh: 26, rr: 13 });

    useEffect(() => {
      let raf;
      const tick = () => {
        const st = s.current, me = m.current;
        const btn = st.hoverEl && st.hoverEl.closest ? st.hoverEl.closest(BTN_SEL) : null;

        // Within ~52px of right edge and rail is visible → snap ring around thumb
        const railThumb = (!btn && st.x > window.innerWidth - 52)
          ? document.querySelector('.scroll-rail[data-show="true"] .sr-thumb') : null;

        let wrapEl = btn, role = false, isRail = false;
        // Role pillars → wrap the visible cap circle, not the full prong hit area
        if (btn && btn.matches && btn.matches(".prong")) wrapEl = btn.querySelector(".cap") || btn;
        if (btn) role = btn.matches && btn.matches(".prong, .role-card");
        else if (railThumb) { wrapEl = railThumb; isRail = true; }

        let tx = st.x, ty = st.y, tw, th, tr;
        if (wrapEl) {
          const r = wrapEl.getBoundingClientRect();
          const pad = isRail ? 6 : (role ? 5 : 7);
          tw = r.width + pad * 2; th = r.height + pad * 2;
          tx = r.left + r.width / 2; ty = r.top + r.height / 2;
          const br = parseFloat(getComputedStyle(wrapEl).borderRadius) || (isRail ? 999 : 10);
          tr = Math.min(br + pad, Math.min(tw, th) / 2);
        } else {
          tw = th = st.down ? 20 : 26; tr = tw / 2;
        }

        me.rx = lerp(me.rx, tx, 0.22); me.ry = lerp(me.ry, ty, 0.22);
        me.rw = lerp(me.rw, tw, 0.24); me.rh = lerp(me.rh, th, 0.24); me.rr = lerp(me.rr, tr, 0.24);

        if (ring.current) {
          const el = ring.current;
          // White on dark screens (loader, pre-bloom intro, role dive); black on light pages
          const loaderEl = document.querySelector(".loader");
          const introEl = document.querySelector(".intro");
          const darkBg = (loaderEl && !loaderEl.classList.contains("done"))
            || (introEl && !introEl.classList.contains("lit"))
            || !!document.querySelector('.dive[data-show="true"]');
          el.style.borderColor = darkBg ? "#f3f3f3" : "#0b0b0b";
          el.style.transform = `translate(${me.rx}px,${me.ry}px) translate(-50%,-50%)`;
          el.style.width = me.rw + "px"; el.style.height = me.rh + "px"; el.style.borderRadius = me.rr + "px";
          el.style.opacity = st.visible ? 1 : 0;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, []);

    return (
      <div className="cur cur-invert">
        <div className="halo-ring" ref={ring} />
      </div>
    );
  }

  function CursorLayer() {
    const fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    useEffect(() => {
      if (!fine || reduce) return;
      document.documentElement.classList.add("cur-on");
      return () => document.documentElement.classList.remove("cur-on");
    }, [fine, reduce]);
    if (!fine || reduce) return null;
    return <InvertCursor />;
  }

  window.CursorLayer = CursorLayer;
})();
