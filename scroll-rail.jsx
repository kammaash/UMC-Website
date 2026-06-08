// scroll-rail.jsx — right-edge scroll rail for UMC landing page.
// Thin 2px track + 8px rounded thumb pinned to the right edge.
// Targets .scroll-shell as the scroll container.
(function () {
  const { useRef, useState, useEffect } = React;
  const RAIL_MARGIN = 90;

  function ScrollRail() {
    const thumbRef = useRef(null);
    const [show, setShow] = useState(false);

    useEffect(() => {
      const fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
      if (!fine) return;
      const shell = document.querySelector(".scroll-shell");
      if (!shell) return;
      let raf = 0;
      const update = () => {
        raf = 0;
        const locked = shell.classList.contains("locked");
        const diveOpen = !!document.querySelector('.dive[data-show="true"]');
        const sh = shell.scrollHeight, ch = shell.clientHeight;
        const visible = sh > ch + 4 && !locked && !diveOpen;
        setShow(visible);
        if (!visible) return;
        const trackH = Math.max(80, window.innerHeight - RAIL_MARGIN * 2);
        const thumbH = Math.max(48, trackH * (ch / sh));
        const maxTop = trackH - thumbH;
        const prog = sh > ch ? shell.scrollTop / (sh - ch) : 0;
        if (thumbRef.current) {
          thumbRef.current.style.height = thumbH + "px";
          thumbRef.current.style.transform = `translateY(${prog * maxTop}px)`;
        }
      };
      const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
      update();
      shell.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      const mo = new MutationObserver(onScroll);
      mo.observe(shell, { attributes: true, attributeFilter: ["class"] });
      const introEl = document.querySelector(".intro");
      const moDive = new MutationObserver(onScroll);
      if (introEl) moDive.observe(introEl, { attributes: true, attributeFilter: ["data-dive", "data-phase"] });
      const iv = setInterval(update, 600);
      return () => {
        shell.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        mo.disconnect(); moDive.disconnect(); clearInterval(iv);
        if (raf) cancelAnimationFrame(raf);
      };
    }, []);

    const onClick = (e) => {
      const shell = document.querySelector(".scroll-shell");
      if (!shell) return;
      const trackH = Math.max(80, window.innerHeight - RAIL_MARGIN * 2);
      const frac = Math.max(0, Math.min(1, (e.clientY - RAIL_MARGIN) / trackH));
      const sh = shell.scrollHeight, ch = shell.clientHeight;
      shell.scrollTo({ top: frac * (sh - ch), behavior: "smooth" });
    };

    return (
      <div className="scroll-rail" data-show={show ? "true" : "false"} onClick={onClick} aria-hidden="true">
        <div className="sr-track" />
        <div className="sr-thumb" ref={thumbRef} />
      </div>
    );
  }

  window.ScrollRail = ScrollRail;
})();
