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
  { icon: "lock", t: "Encrypted by default", d: "Every record and reminder is protected in transit and at rest on trusted cloud infrastructure." },
  { icon: "shield", t: "Consent-first sharing", d: "Patients decide exactly who joins their care circle — caregivers, doctors, nobody by accident." },
  { icon: "users", t: "Role-scoped access", d: "Doctors, pharmacies and diagnostics only ever see what their role needs. Nothing more." },
];

function Trust() {
  const Ico = ({ n }) => { const C = Icons[n]; return <C />; };
  return (
    <section className="snap trust sec-pad" id="trust" data-screen-label="Trust">
      <div className="trust-grid">
        <Reveal><div className="lead">
          <div className="big">Health data is the<br />most personal data.<br />We treat it that way.</div>
          <p>Unified Medical Care is built on consent, encryption, and the principle that a care circle is something you choose — never something assumed.</p>
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
      <div className="badge">Now in TestFlight beta</div>
      <h2>Care that<br /><em>never sleeps.</em></h2>
      <p>Join the beta and be among the first to put every dose, every reminder, and every caregiver in one calm place.</p>
      <div className="ctas">
        <a className="btn primary" href="#" onClick={(e) => e.preventDefault()}>
          <span className="b-ic">{Icons.apple()}</span>
          <span className="b-tx"><small>Join the beta on</small><b>TestFlight</b></span>
        </a>
        <a className="btn ghost" href="#" onClick={(e) => e.preventDefault()}>
          <span className="b-ic">{Icons.bell()}</span>
          <span className="b-tx"><small>Android</small><b>Notify me</b></span>
        </a>
      </div>
      <div className="meta">Requires iOS 16+ · Free during beta · No card required</div>
    </section>
  );
}

const FAQS = [
  { q: "What is Unified Medical Care?", a: "It's a medication companion that reminds patients to take their tablets and keeps their caregivers, doctors, pharmacies and diagnostic centers connected around that single goal — never missing a dose." },
  { q: "How do caregivers get notified?", a: "When a patient confirms or misses a dose, anyone in their care circle is notified automatically. Patients choose who is in that circle, and can change it at any time." },
  { q: "Is my health data private?", a: "Yes. Data is encrypted in transit and at rest, sharing is consent-first, and every role only sees what it needs. You are always in control of your care circle." },
  { q: "How do I join the beta?", a: "The app is currently in TestFlight beta for iOS 16 and above. Tap “Join the beta on TestFlight” above — it's free during the beta and no card is required. Android users can ask to be notified at launch." },
  { q: "Which roles can use the app?", a: "Five: Patient, Caregiver, Doctor, Pharmacy and Diagnostic Center. Each gets a tailored experience scoped to what that role actually needs to do." },
];

function FAQ() {
  const [open, setOpen] = React.useState(0);
  return (
    <section className="snap faq sec-pad" id="faq" data-screen-label="FAQ">
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

// LINKS — finale: a single oversized "Join the beta" call to action
// that fills the whole closing section.
function Links() {
  return (
    <footer className="snap links" id="links" data-screen-label="Join the beta">
      <div className="links-inner">
        <Reveal><span className="links-kicker">Now in TestFlight</span></Reveal>

        <Reveal delay={0.06}>
          <a className="join-cta" href="#download" onClick={smoothTo("download")}>
            <span className="jc-text">
              <span className="a">Join the beta</span>
              <span className="b" aria-hidden="true">Join the beta</span>
            </span>
            <span className="jc-arrow" aria-hidden="true">↗</span>
          </a>
        </Reveal>

        <Reveal delay={0.12}><p className="join-sub">Be among the first to keep care on schedule. Free while in beta.</p></Reveal>

        <Reveal delay={0.16}><div className="links-base">
          <span className="big-mark">Unified Medical Care</span>
          <div className="lb-row">
            <span>© 2026 Unified Medical Care</span>
            <span>Care · Connect · Comfort</span>
          </div>
        </div></Reveal>
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

Object.assign(window, { Marquee, Features, Trust, Download, FAQ, Footer, Links, Reveal, smoothTo });
