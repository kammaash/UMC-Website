// sections.jsx — marquee, features, trust, download, faq, footer.

function Marquee() {
  const items = ["Reminders that land", "Caregivers in the loop", "Doctors in sync",
    "Pharmacies connected", "Diagnostics on time", "Never a missed dose"];
  const loop = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="track">
        {loop.map((t, i) => (
          <React.Fragment key={i}>
            <span className="item">{t}</span>
            <span className="dot" />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: "alarm", t: "Smart alarms", d: "Full-screen, vibrating, sound-backed reminders for every dose — impossible to sleep through." },
  { icon: "users", t: "Caregiver loop", d: "The moment a dose is taken (or missed), the people who care are notified automatically." },
  { icon: "chart", t: "Adherence insight", d: "Clear charts turn daily habits into a story doctors can actually read and act on." },
  { icon: "pin", t: "Find care nearby", d: "Location-aware matching connects patients to pharmacies and diagnostic centers close by." },
  { icon: "mic", t: "Voice logging", d: "Speech-to-text and large, high-contrast controls keep the app usable for everyone." },
  { icon: "cloud", t: "Always in sync", d: "Cloud-backed schedules and notifications stay current across every device, in real time." },
];

function Features() {
  const Ico = ({ n }) => { const C = Icons[n]; return <C />; };
  return (
    <section className="snap features sec-pad" id="features" data-screen-label="Features">
      <Reveal><div className="sec-head">
        <h2>Built to keep<br />care on schedule</h2>
      </div></Reveal>
      <div className="feat-grid">
        {FEATURES.map((f, i) => (
          <Reveal key={f.t} delay={i * 0.06}>
            <div className="feat-card">
              <div className="ico"><Ico n={f.icon} /></div>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const TRUST = [
  { icon: "lock", t: "Encrypted by default", d: "Every record and reminder is encrypted in transit and at rest, on trusted cloud infrastructure." },
  { icon: "shield", t: "Consent-first sharing", d: "The patient decides exactly who joins their care circle — caregivers, doctors, pharmacies, diagnostics. Nobody by accident." },
  { icon: "users", t: "Role-scoped access", d: "Every role — doctors, pharmacies, diagnostics — sees only what their work needs, and nothing else. Your data is never the product." },
];

function Trust() {
  const Ico = ({ n }) => { const C = Icons[n]; return <C />; };
  return (
    <section className="snap trust sec-pad" id="trust" data-screen-label="Trust">
      <div className="trust-grid">
        <Reveal><div className="lead">
          <div className="big">Health data is the<br />most personal data.<br />We treat it that way.</div>
          <p>Unified Medical Care is built on consent and encryption — every record stays private, and a care circle is something the patient chooses, never something assumed.</p>
        </div></Reveal>
        <Reveal delay={0.1}><div className="points">
          {TRUST.map((p) => (
            <div className="point" key={p.t}>
              <span className="ic"><Ico n={p.icon} /></span>
              <span><b>{p.t}</b><span>{p.d}</span></span>
            </div>
          ))}
        </div></Reveal>
      </div>
    </section>
  );
}

function Download() {
  return (
    <section className="snap download" id="download" data-screen-label="Download">
      <div className="glow" />
      <div className="badge">Now in open beta</div>
      <h2>Care that<br /><em>never sleeps.</em></h2>
      <p>Join the beta and connect everyone in care — patients, doctors, pharmacies and diagnostics — in one calm, always-on place.</p>
      <div className="ctas">
        <a className="btn primary" href="#" onClick={(e) => e.preventDefault()}>
          <span className="b-ic">{Icons.apple()}</span>
          <span className="b-tx"><small>Join the beta on</small><b>TestFlight</b></span>
        </a>
        {/* TODO: replace href with the hosted APK download URL */}
        <a className="btn ghost" href="/downloads/umc-android.apk" download>
          <span className="b-ic">{Icons.download()}</span>
          <span className="b-tx"><small>Android</small><b>Download APK</b></span>
        </a>
      </div>
      <div className="meta">Free during beta · No card required</div>
    </section>
  );
}

const FAQS = [
  { q: "What is Unified Medical Care?", a: "It's a medication companion that reminds patients to take their tablets and keeps their caregivers, doctors, pharmacies and diagnostic centers connected around that single goal — never missing a dose." },
  { q: "How do caregivers get notified?", a: "When a patient confirms or misses a dose, anyone in their care circle is notified automatically. Patients choose who is in that circle, and can change it at any time." },
  { q: "Is my health data private?", a: "Yes. Data is encrypted in transit and at rest, sharing is consent-first, and every role only sees what it needs. You are always in control of your care circle." },
  { q: "How do I join the beta?", a: "The app is in open beta on both platforms. iOS users join via TestFlight (iOS 16+), and Android users can download the APK directly — both free during the beta, no card required. Tap the buttons above to get started." },
  { q: "Is it really free?", a: "Yes — the app is free during the beta, with no card required. For doctors, the digital clinic setup stays free; UMC is funded through pharmacy and diagnostic transactions, not by charging you." },
];

function FAQ({ panelRef }) {
  const [open, setOpen] = React.useState(0);
  return (
    <section className="faq faq-panel sec-pad" id="faq" data-screen-label="FAQ" ref={panelRef}>
      <Reveal><div className="sec-head">
        <h2>Questions,<br />answered</h2>
      </div></Reveal>
      <Reveal delay={0.1}><div className="faq-list">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div className={"faq-item" + (isOpen ? " open" : "")} key={i}>
              <button className="faq-q" onClick={() => setOpen(isOpen ? -1 : i)}>
                <span>{f.q}</span><span className="pm" />
              </button>
              <div className="faq-a" style={{ maxHeight: isOpen ? 300 : 0 }}>
                <div className="inner">{f.a}</div>
              </div>
            </div>
          );
        })}
      </div></Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="snap footer" data-screen-label="Footer">
      <div className="top">
        <div className="big-mark">Tablet<br />Reminder</div>
        <div className="cols">
          <div className="col">
            <h4>Product</h4>
            <a href="#features" onClick={smoothTo("features")}>Features</a>
            <a href="#intro" onClick={smoothTo("intro")}>The pillars</a>
            <a href="#download" onClick={smoothTo("download")}>Download</a>
          </div>
          <div className="col">
            <h4>Care circle</h4>
            <a href="#" onClick={(e)=>e.preventDefault()}>For patients</a>
            <a href="#" onClick={(e)=>e.preventDefault()}>For caregivers</a>
            <a href="#" onClick={(e)=>e.preventDefault()}>For clinicians</a>
          </div>
          <div className="col">
            <h4>Company</h4>
            <a href="#" onClick={(e)=>e.preventDefault()}>Privacy</a>
            <a href="#" onClick={(e)=>e.preventDefault()}>Terms</a>
            <a href="#" onClick={(e)=>e.preventDefault()}>Contact</a>
          </div>
        </div>
      </div>
      <div className="base">
        <span>© 2026 Unified Medical Care</span>
        <span>Care · Connect · Comfort</span>
      </div>
    </footer>
  );
}

// ENDING — sticky dark FAQ panel that shrinks + rounds off as the light
// contact footer is revealed behind it. Scroll progress drives --p (0→1).
function Ending() {
  const wrapRef = React.useRef(null);
  const panelRef = React.useRef(null);
  React.useEffect(() => {
    const wrap = wrapRef.current, panel = panelRef.current;
    if (!wrap || !panel) return;
    const shell = document.querySelector(".scroll-shell");
    const scroller = shell || window;
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = shell ? shell.clientHeight : window.innerHeight;
      const shellTop = shell ? shell.getBoundingClientRect().top : 0;
      const wrapTop = wrap.getBoundingClientRect().top - shellTop;
      const travel = wrap.offsetHeight - vh;
      const raw = travel > 0 ? (-wrapTop / travel) : 0;
      const p = Math.max(0, Math.min(1, raw / 0.5)); // squeeze into a card over the first half of the lift
      panel.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="ending-wrap" ref={wrapRef}>
      <FAQ panelRef={panelRef} />
      <ContactFooter />
    </div>
  );
}

function ContactFooter() {
  const [copied, setCopied] = React.useState(null);
  const copyToClipboard = (key, text) => (e) => {
    e.preventDefault();
    const done = () => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand("copy"); } catch (_) {}
      document.body.removeChild(ta); done();
    }
  };
  return (
    <footer className="ending-footer" id="links" data-screen-label="Get in touch">
      {/* top: oversized brand sign-off */}
      <div className="ef-signoff">
        <div className="ef-mark">UMC</div>
        <p className="ef-mark-sub">Care that never sleeps,<br />connected everywhere.</p>
      </div>

      {/* middle: navigation + contact + CTA */}
      <div className="ef-top">
        <div className="ef-cols">
          <nav className="ef-col" aria-label="Explore">
            <h4>Explore</h4>
            <a href="#intro" onClick={smoothTo("intro")}>How it works</a>
            <a href="#faq" onClick={smoothTo("faq")}>FAQ</a>
            <a href="#download" onClick={smoothTo("download")}>Get the app</a>
          </nav>

          <div className="ef-col ef-contact-col">
            <h4>Contact</h4>
            <a className={"ef-call" + (copied === "phone" ? " is-copied" : "")} href="tel:+916304519244"
               onClick={copyToClipboard("phone", "+91 63045 19244")}>
              <span className="ef-ic" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.1 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16.9z"/></svg>
              </span>
              {copied === "phone" ? "Copied to clipboard" : "Call us"}
            </a>
            <a className={"ef-mail" + (copied === "email" ? " is-copied" : "")} href="mailto:admin@unifiedmedicalcare.com"
               onClick={copyToClipboard("email", "admin@unifiedmedicalcare.com")}>
              <span className="ef-ic" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
              </span>
              {copied === "email" ? "Copied to clipboard" : "Email us"}
            </a>
            <a className="ef-wa" href="https://wa.me/916304519244" target="_blank" rel="noopener">
              <span className="ef-ic" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm0 18.1a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20.1zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-1.9-1.2 7.3 7.3 0 0 1-1.3-1.7c-.1-.2 0-.4.1-.5l.4-.5.2-.3a.5.5 0 0 0 0-.5L9 6.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11 11 0 0 0 4.3 3.8c.6.3 1.1.4 1.5.5a3.4 3.4 0 0 0 1.5.1c.5-.1 1.4-.6 1.6-1.1s.2-1 .1-1.1z"/></svg>
              </span>
              WhatsApp
            </a>
          </div>
        </div>

        <a className="ef-join" href="#download" onClick={smoothTo("download")}>Join the beta</a>
      </div>

      {/* bottom: legal */}
      <div className="ef-legal">
        <span>© 2026 Unified Medical Care</span>
        <span>ASHOKANAND CREATIONS PRIVATE LIMITED</span>
      </div>
    </footer>
  );
}

function smoothTo(id) {
  return (e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    const shell = document.querySelector(".scroll-shell");
    if (!el || !shell) return;
    const top = el.getBoundingClientRect().top - shell.getBoundingClientRect().top + shell.scrollTop;
    shell.scrollTo({ top, behavior: "smooth" });
  };
}

// scroll-reveal wrapper — scroll-listener based (robust everywhere),
// with an immediate in-view check so already-visible content shows at once.
function Reveal({ children, delay = 0 }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const shell = document.querySelector(".scroll-shell");
    const target = shell || window;
    const check = () => {
      const r = el.getBoundingClientRect();
      const bottom = shell ? shell.getBoundingClientRect().bottom : window.innerHeight;
      if (r.top < bottom * 0.92) { el.classList.add("show"); return true; }
      return false;
    };
    if (check()) return;
    const onScroll = () => { if (check()) cleanup(); };
    const cleanup = () => {
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return cleanup;
  }, []);
  return (
    <div className="reveal" ref={ref} style={{ transitionDelay: delay + "s" }}>
      {children}
    </div>
  );
}

Object.assign(window, { Marquee, Features, Trust, Download, FAQ, Footer, Ending, ContactFooter, Reveal, smoothTo });
