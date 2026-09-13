# Privacy Policy Page + Signed PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `https://unifiedmedicalcare.com/privacy/` as a plain-HTML privacy policy for the Play Store listing, plus a letterheaded PDF of the same policy for the directors to e-sign.

**Architecture:** One self-contained static file `privacy/index.html` (inline CSS, no JS) served by Netlify from the build-less marketing site. A print stylesheet in the same file adds the company letterhead and a board-approval signature page; headless Chrome renders it to PDF. The live footer gets one link.

**Tech Stack:** Static HTML/CSS, Google Fonts (already used by the site), Google Chrome headless for PDF, a bash check script as the "test".

**Spec:** `docs/superpowers/specs/2026-09-13-privacy-policy-page-design.md`

---

## File map

| File | Responsibility |
|---|---|
| `scripts/check-privacy-page.sh` (create) | The test. Greps the page for every required fact and every forbidden claim. Exits 1 on any miss. |
| `privacy/index.html` (create) | The policy page. Web header, article, signed-copy callout, print letterhead, board-approval block. |
| `scripts/build-privacy-pdf.sh` (create) | Renders the print view to `privacy/UMC-Privacy-Policy-v1.0-unsigned.pdf`. |
| `sections.jsx` (modify, `ContactFooter` legal row ~line 274) | Add the Privacy Policy link. |
| `styles.css` (modify, after `.ef-legal` block ~line 1049) | Style `.ef-legal a`. |

---

### Task 1: The check script (test first)

**Files:**
- Create: `scripts/check-privacy-page.sh`

- [ ] **Step 1: Write the check script**

```bash
#!/usr/bin/env bash
# Verifies privacy/index.html states every required fact and none of the
# claims the app's code does not support. Run from the repo root.
set -u
PAGE="privacy/index.html"
fail=0

if [[ ! -f "$PAGE" ]]; then echo "MISSING $PAGE"; exit 1; fi

must_contain=(
  "ASHOKANAND CREATIONS PRIVATE LIMITED"
  "U26209AP2025PTC120364"
  "37ABDCA3414H1ZY"
  "Kurnool"
  "518002"
  "admin@unifiedmedicalcare.com"
  "+91 63045 19244"
  "13 September 2026"
  "Digital Personal Data Protection Act"
  "Google Gemini"
  "Sarvam AI"
  "Razorpay"
  "Google Maps"
  "Apple"
  "ABHA"
  "Firebase"
  "Mumbai"
  "Caregiver"
  "Clinic assistant"
  "Diagnostic centre"
  "School infirmar"
  "delivery"
  "Microphone"
  "Contacts"
  "Delete Account"
  "Data Protection Board of India"
  "Anand Kamma"
  "Ashok Kamma"
  "10280398"
  "10280418"
  'id="delete-account"'
  'id="signed-copy"'
  "Not a medical device"
  "POST_NOTIFICATIONS"
  "ACCESS_FINE_LOCATION"
  "RECORD_AUDIO"
  "WRITE_CONTACTS"
  "READ_MEDIA_IMAGES"
  "CAMERA"
)
must_not_contain=(
  "geofenc"
  "Crashlytics"
  "vitals"
  "crash log"
  "Install Referrer"
  "arrival"
  "TBD"
  "TODO"
  "\[Registered office address\]"
)

for s in "${must_contain[@]}"; do
  if ! grep -q -- "$s" "$PAGE"; then echo "MISSING: $s"; fail=1; fi
done
for s in "${must_not_contain[@]}"; do
  if grep -qi -- "$s" "$PAGE"; then echo "FORBIDDEN: $s"; fail=1; fi
done

# No scripts: Play reviewers and crawlers must read it without JS.
if grep -qi "<script" "$PAGE"; then echo "FORBIDDEN: <script> tag"; fail=1; fi

words=$(sed -e 's/<[^>]*>/ /g' "$PAGE" | wc -w | tr -d ' ')
echo "word count (incl. CSS): $words"

if [[ $fail -eq 0 ]]; then echo "PASS"; else echo "FAIL"; fi
exit $fail
```

- [ ] **Step 2: Make it executable and run it to see it fail**

Run: `chmod +x scripts/check-privacy-page.sh && scripts/check-privacy-page.sh`
Expected: `MISSING privacy/index.html`, exit code 1.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-privacy-page.sh
git commit -m "test: privacy page fact/forbidden-claim check script"
```

---

### Task 2: The privacy policy page

**Files:**
- Create: `privacy/index.html`

- [ ] **Step 1: Create the page with exactly this content**

See **Appendix A** at the end of this plan for the full file. Write it byte-for-byte to `privacy/index.html`.

- [ ] **Step 2: Run the check script**

Run: `scripts/check-privacy-page.sh`
Expected: `PASS`, exit 0.

- [ ] **Step 3: Serve locally and eyeball**

Run: `python3 -m http.server 8787 >/dev/null 2>&1 & sleep 1; open http://localhost:8787/privacy/`
Check: fonts load, headings serif, page column ≤ 760px, tables readable, `#delete-account` anchor works, no horizontal scroll at 400px (DevTools device toolbar). Then `kill %1`.

- [ ] **Step 4: Commit**

```bash
git add privacy/index.html
git commit -m "feat: privacy policy page at /privacy/"
```

---

### Task 3: PDF build script

**Files:**
- Create: `scripts/build-privacy-pdf.sh`

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# Renders privacy/index.html (print view: letterhead + signature page) to PDF
# with headless Chrome. Run from the repo root.
set -euo pipefail
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="privacy/UMC-Privacy-Policy-v1.0-unsigned.pdf"
SRC="file://$PWD/privacy/index.html"

[[ -x "$CHROME" ]] || { echo "Chrome not found at $CHROME"; exit 1; }

"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=8000 \
  --print-to-pdf="$OUT" "$SRC" 2>/dev/null

python3 - "$OUT" <<'EOF'
import sys
from pypdf import PdfReader
r = PdfReader(sys.argv[1])
n = len(r.pages)
last = r.pages[-1].extract_text() or ""
first = r.pages[0].extract_text() or ""
ok = ("U26209AP2025PTC120364" in first) and ("DIN: 10280398" in last) and ("DIN: 10280418" in last)
print(f"{sys.argv[1]}: {n} pages; letterhead on p1 and both signature cells on last page: {ok}")
sys.exit(0 if ok else 1)
EOF
```

- [ ] **Step 2: Run it**

Run: `chmod +x scripts/build-privacy-pdf.sh && scripts/build-privacy-pdf.sh`
Expected: `privacy/UMC-Privacy-Policy-v1.0-unsigned.pdf: N pages; ... True`, exit 0.

- [ ] **Step 3: Visually verify the PDF pages**

Run:
```bash
python3 - <<'EOF'
from pypdf import PdfReader, PdfWriter
r = PdfReader("privacy/UMC-Privacy-Policy-v1.0-unsigned.pdf")
for i in (0, len(r.pages)-1):
    w = PdfWriter(); w.add_page(r.pages[i]); w.write(f"/tmp/pp-page{i+1}.pdf")
EOF
qlmanage -t -s 1400 -o /tmp /tmp/pp-page1.pdf "/tmp/pp-page$(python3 -c "from pypdf import PdfReader;print(len(PdfReader('privacy/UMC-Privacy-Policy-v1.0-unsigned.pdf').pages))").pdf" >/dev/null 2>&1
```
Then Read the two PNGs in `/tmp/`. Check: letterhead block at top of page 1 (company name, CIN, address, GSTIN, email, phone); last page has the approval statement and two signature cells with blank space, names, "Director", DIN, Date line; no browser header/footer text; body not clipped.

- [ ] **Step 4: Commit the script and the unsigned PDF**

```bash
git add scripts/build-privacy-pdf.sh privacy/UMC-Privacy-Policy-v1.0-unsigned.pdf
git commit -m "feat: headless-Chrome PDF build for the privacy policy"
```

---

### Task 4: Footer link

**Files:**
- Modify: `sections.jsx` (`ContactFooter`, the `ef-legal` div)
- Modify: `styles.css` (after the `.ef-legal { … }` rule)

- [ ] **Step 1: Edit the legal row in `sections.jsx`**

Find:
```jsx
      <div className="ef-legal">
        <span>© 2026 Unified Medical Care</span>
        <span>ASHOKANAND CREATIONS PRIVATE LIMITED</span>
      </div>
```
Replace with:
```jsx
      <div className="ef-legal">
        <span>© 2026 Unified Medical Care</span>
        <a href="/privacy/">Privacy Policy</a>
        <span>ASHOKANAND CREATIONS PRIVATE LIMITED</span>
      </div>
```

- [ ] **Step 2: Add the link style in `styles.css`**

Find:
```css
.ef-legal {
  width: 100%; max-width: 1280px; margin: 0 auto; margin-top: auto;
  display: flex; gap: 18px; flex-wrap: wrap; justify-content: space-between;
  padding-top: clamp(20px, 3vh, 34px);
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em;
  color: rgba(243,243,243,0.4);
}
```
Append immediately after it:
```css
.ef-legal a { color: rgba(243,243,243,0.62); text-decoration: none; border-bottom: 1px solid rgba(243,243,243,0.25); transition: color .25s var(--ease-out), border-color .25s; }
.ef-legal a:hover { color: #fff; border-color: #fff; }
```

- [ ] **Step 3: Verify in the browser**

Run: `python3 -m http.server 8787 >/dev/null 2>&1 & sleep 1; open http://localhost:8787/`
Scroll to the end, past the FAQ curtain; the legal row shows "Privacy Policy" between the copyright and the company name; clicking it opens `/privacy/`. Then `kill %1`.

- [ ] **Step 4: Commit**

```bash
git add sections.jsx styles.css
git commit -m "feat: link Privacy Policy from the site footer"
```

---

### Task 5: Hand-off notes for the manual signing step

No code. After Task 3, tell the user:
1. Open `privacy/UMC-Privacy-Policy-v1.0-unsigned.pdf` in Preview → Markup → Sign; both directors sign and date; save as `UMC-Privacy-Policy-v1.0-signed.pdf`.
2. Firebase console → Storage → `legal/` → upload; copy the download URL (with `?alt=media&token=`).
3. Send the URL back. Then: in `privacy/index.html` replace `href="#"` on the `#signed-copy` link with the URL and delete the `hidden` attribute from the `<aside id="signed-copy" hidden>`; rerun `scripts/check-privacy-page.sh`; commit `feat: link board-signed privacy policy PDF`; push.
4. Play Console: privacy policy URL `https://unifiedmedicalcare.com/privacy/`; account deletion URL `https://unifiedmedicalcare.com/privacy/#delete-account`.

---

## Appendix A — `privacy/index.html`

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy Policy — Unified Medical Care</title>
<meta name="description" content="How Unified Medical Care (UMC), operated by Ashokanand Creations Private Limited, collects, uses, shares and protects your information.">
<meta name="robots" content="index,follow">
<link rel="icon" href="../assets/app_logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root {
    --serif: 'DM Serif Display', 'DM Serif Text', Georgia, serif;
    --sans: 'Inter', system-ui, -apple-system, sans-serif;
    --mono: 'JetBrains Mono', 'SFMono-Regular', ui-monospace, monospace;
    --bg: #e3e3e3; --bg-2: #ededed; --ink: #1c1c1c; --ink-soft: #555; --ink-faint: #6a6a6a;
    --line: rgba(20,20,20,0.14); --line-2: rgba(20,20,20,0.06);
    --shadow-dark: rgba(150,150,150,0.55); --shadow-light: rgba(255,255,255,0.9);
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--sans); font-size: 16px; line-height: 1.65; }
  a { color: inherit; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 0 20px 96px; }

  /* ---- web header ---- */
  .web-only { display: block; }
  .print-only { display: none; }
  .top { display: flex; align-items: center; justify-content: space-between; padding: 26px 0 0; }
  .mark { font-family: var(--serif); font-size: 22px; letter-spacing: -0.02em; text-decoration: none; }
  .mark small { font-family: var(--mono); font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-faint); margin-left: 12px; vertical-align: middle; }
  .back { font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-soft); text-decoration: none; }
  .back:hover { color: var(--ink); }

  header.title { padding: 72px 0 34px; border-bottom: 1px solid var(--line); margin-bottom: 40px; }
  .kicker { font-family: var(--mono); font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--ink-faint); margin: 0 0 18px; }
  h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(40px, 8vw, 68px); line-height: 0.98; letter-spacing: -0.03em; margin: 0 0 22px; }
  .lede { font-size: 18px; color: var(--ink-soft); margin: 0; max-width: 60ch; }

  /* ---- document ---- */
  h2 { font-family: var(--serif); font-weight: 400; font-size: 28px; letter-spacing: -0.02em; line-height: 1.15; margin: 56px 0 14px; }
  h2 .n { font-family: var(--mono); font-size: 11px; letter-spacing: 0.2em; color: var(--ink-faint); display: block; margin-bottom: 8px; }
  h3 { font-family: var(--sans); font-weight: 600; font-size: 16px; margin: 26px 0 6px; }
  p { margin: 0 0 14px; }
  ul { padding-left: 20px; margin: 0 0 14px; }
  li { margin-bottom: 6px; }
  li strong { font-weight: 600; }
  .note { background: var(--bg-2); border-left: 3px solid var(--ink); padding: 14px 18px; margin: 18px 0; font-size: 15px; }
  .contents { font-size: 14px; color: var(--ink-soft); columns: 2; column-gap: 32px; padding-left: 20px; margin-bottom: 8px; }
  .contents li { break-inside: avoid; }
  .contents a { text-decoration: none; }
  .contents a:hover { text-decoration: underline; }
  .tablewrap { overflow-x: auto; margin: 16px 0 22px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 520px; }
  th { font-family: var(--mono); font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; text-align: left; color: var(--ink-faint); padding: 8px 10px 8px 0; border-bottom: 1px solid var(--line); }
  td { padding: 10px 10px 10px 0; border-bottom: 1px solid var(--line-2); vertical-align: top; }
  td:first-child { font-weight: 600; white-space: nowrap; }
  code { font-family: var(--mono); font-size: 12.5px; background: var(--bg-2); padding: 1px 5px; border-radius: 4px; }
  address { font-style: normal; }

  /* ---- signed copy callout ---- */
  .callout { margin-top: 56px; padding: 26px 28px; border-radius: 22px; background: var(--bg-2);
    box-shadow: 8px 12px 30px var(--shadow-dark), -5px -5px 16px var(--shadow-light); }
  .callout .kicker { margin-bottom: 8px; }
  .callout p { margin: 0 0 14px; color: var(--ink-soft); font-size: 15px; }
  .btn { display: inline-flex; align-items: center; gap: 10px; background: var(--ink); color: var(--bg); text-decoration: none; border-radius: 999px; padding: 12px 22px; font-weight: 600; font-size: 14px; transition: transform .3s var(--ease-out); }
  .btn:hover { transform: translateY(-2px); }

  footer.site { margin-top: 72px; padding-top: 22px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em; color: var(--ink-faint); }
  footer.site a { text-decoration: none; }

  @media (max-width: 560px) {
    header.title { padding-top: 48px; }
    .contents { columns: 1; }
  }

  /* ---- print: letterhead + board approval ---- */
  @page { size: A4; margin: 16mm 16mm 20mm; }
  @media print {
    :root { --bg: #fff; --bg-2: #f4f4f4; }
    body { background: #fff; color: #000; font-size: 10.5pt; line-height: 1.5; }
    .web-only { display: none !important; }
    .print-only { display: block; }
    .wrap { max-width: none; padding: 0; }
    a { text-decoration: none; color: #000; }
    h1 { font-size: 30pt; margin-bottom: 10pt; }
    h2 { font-size: 16pt; margin: 22pt 0 8pt; break-after: avoid; }
    h3 { font-size: 11pt; margin: 12pt 0 4pt; break-after: avoid; }
    p, li { orphans: 3; widows: 3; }
    table { min-width: 0; font-size: 9.5pt; }
    tr, .note { break-inside: avoid; }
    .tablewrap { overflow: visible; }
    .callout, footer.site { display: none; }

    .letterhead { display: flex; justify-content: space-between; align-items: flex-end; gap: 12mm; padding-bottom: 5mm; border-bottom: 1.2pt solid #000; margin-bottom: 10mm; }
    .lh-name { font-family: var(--serif); font-size: 17pt; letter-spacing: 0.01em; line-height: 1.1; }
    .lh-sub { font-family: var(--mono); font-size: 7.5pt; letter-spacing: 0.16em; text-transform: uppercase; color: #444; margin-top: 4pt; }
    .lh-meta { font-family: var(--mono); font-size: 7.4pt; line-height: 1.55; text-align: right; color: #222; white-space: nowrap; }
    header.title { padding: 0 0 8mm; margin-bottom: 8mm; }
    .running { position: fixed; bottom: -14mm; left: 0; right: 0; font-family: var(--mono); font-size: 7pt; letter-spacing: 0.12em; text-transform: uppercase; color: #666; display: flex; justify-content: space-between; }

    .approval { break-before: page; }
    .approval h2 { margin-top: 0; }
    .approval .statement { font-size: 10.5pt; margin-bottom: 14mm; }
    .sigs { display: flex; gap: 14mm; }
    .sig { flex: 1; }
    .sig .box { height: 34mm; border-bottom: 1pt solid #000; margin-bottom: 4pt; }
    .sig .name { font-weight: 600; font-size: 11pt; }
    .sig .meta { font-family: var(--mono); font-size: 8pt; letter-spacing: 0.06em; color: #333; line-height: 1.7; }
    .seal { margin-top: 16mm; font-family: var(--mono); font-size: 7.5pt; letter-spacing: 0.12em; text-transform: uppercase; color: #555; }
  }
</style>
</head>
<body>
<div class="wrap">

  <!-- ================= PRINT LETTERHEAD ================= -->
  <div class="print-only letterhead">
    <div>
      <div class="lh-name">ASHOKANAND CREATIONS PRIVATE LIMITED</div>
      <div class="lh-sub">Operator of Unified Medical Care</div>
    </div>
    <div class="lh-meta">
      CIN U26209AP2025PTC120364 · GSTIN 37ABDCA3414H1ZY<br>
      H No 46/1L-4, Chanukyapuri Colony, KNL-Camp-B<br>
      Kurnool – 518002, Andhra Pradesh, India<br>
      admin@unifiedmedicalcare.com · +91 63045 19244
    </div>
  </div>
  <div class="print-only running">
    <span>Unified Medical Care · Privacy Policy · Version 1.0</span>
    <span>Effective 13 September 2026</span>
  </div>

  <!-- ================= WEB HEADER ================= -->
  <div class="web-only top">
    <a class="mark" href="/">UMC <small>Unified Medical Care</small></a>
    <a class="back" href="/">← Back to site</a>
  </div>

  <header class="title">
    <p class="kicker">Privacy Policy · Version 1.0 · Effective 13 September 2026</p>
    <h1>Privacy Policy</h1>
    <p class="lede">How Unified Medical Care collects, uses, shares and protects your information, and the rights you have over it.</p>
  </header>

  <article>

    <p>Unified Medical Care (“UMC”, “the app”) is operated by <strong>ASHOKANAND CREATIONS PRIVATE LIMITED</strong>, a company incorporated in India under the Companies Act, 2013 (CIN U26209AP2025PTC120364) (“we”, “us”, “our”). This policy covers the UMC mobile app for Android and iOS, the UMC web portal for healthcare providers, and the website <a href="https://unifiedmedicalcare.com">unifiedmedicalcare.com</a>.</p>

    <p>UMC handles health information. We treat it as sensitive personal data under India’s <strong>Digital Personal Data Protection Act, 2023</strong> (the “DPDP Act”) and the Information Technology Act, 2000 and its rules. We do not sell it, rent it, use it for advertising, or share it with anyone who is not involved in your care or in running the service.</p>

    <p>Contact for any privacy question or request: <a href="mailto:admin@unifiedmedicalcare.com">admin@unifiedmedicalcare.com</a>.</p>

    <div class="web-only">
      <p class="kicker" style="margin-top:34px">Contents</p>
      <ol class="contents">
        <li><a href="#roles">Who uses UMC</a></li>
        <li><a href="#collect">What we collect</a></li>
        <li><a href="#why">Why we collect it</a></li>
        <li><a href="#who-sees">Who can see your data</a></li>
        <li><a href="#third-parties">Service providers we use</a></li>
        <li><a href="#abha">ABHA and ABDM</a></li>
        <li><a href="#security">Storage and security</a></li>
        <li><a href="#retention">How long we keep it</a></li>
        <li><a href="#rights">Your rights</a></li>
        <li><a href="#delete-account">Deleting your account</a></li>
        <li><a href="#children">Children</a></li>
        <li><a href="#not-medical-device">Not a medical device</a></li>
        <li><a href="#permissions">App permissions</a></li>
        <li><a href="#changes">Changes to this policy</a></li>
        <li><a href="#contact">Grievance officer and contact</a></li>
      </ol>
    </div>

    <!-- 1 -->
    <h2 id="roles"><span class="n">01</span>Who uses UMC</h2>
    <p>UMC connects the people around one goal: never missing a dose. It serves seven kinds of user, and what we collect depends on the role you hold.</p>
    <ul>
      <li><strong>Patients</strong> take medication and keep their own health record.</li>
      <li><strong>Caregivers</strong> are family members or helpers a patient has invited to see their schedule and be alerted if a dose is missed.</li>
      <li><strong>Doctors</strong> prescribe, consult, and keep clinical records for their patients. Doctors may also use the UMC web portal, which shows the same records under the same rules.</li>
      <li><strong>Clinic assistants</strong> are staff a doctor has authorised to manage appointments and patient details. They cannot prescribe.</li>
      <li><strong>Pharmacies</strong> receive prescriptions and medicine orders and fulfil them.</li>
      <li><strong>Diagnostic centres</strong> receive test orders and upload reports.</li>
      <li><strong>School infirmaries</strong> administer medication to students whose guardians have enrolled them.</li>
    </ul>
    <p>Visitors to the website: the marketing site collects nothing beyond the standard requests your browser makes to load it. It sets no cookies and runs no analytics.</p>

    <!-- 2 -->
    <h2 id="collect"><span class="n">02</span>What we collect</h2>

    <h3>Account and identity</h3>
    <p>Your name, email address, mobile number and whether it has been verified, how you sign in (Google, Apple or phone), your role, your time zone, and a profile photo if you add one. Patients may also record gender, age, weight and height so that doctors can prescribe safely. Doctors provide their medical registration number, state of registration and specialities, and may draw a signature in the app, which is applied to the prescriptions they issue. Pharmacies and diagnostic centres provide establishment details and licence numbers.</p>

    <h3>Health information</h3>
    <p>For patients: medications and schedules; a log of each dose taken or missed, and who marked it; prescriptions; medical history, including diagnosis, clinical notes, reason for visit and follow-up; diagnostic test orders and the reports uploaded against them; recordings and transcripts of consultations you agree to record; and your conversation history with the in-app assistant. If you link an ABHA (Ayushman Bharat Health Account), we store the ABHA number. For doctors and other providers: the clinical records you create for your patients. This is the core function of the app. Without it UMC cannot work.</p>

    <h3>Photographs and camera</h3>
    <p>Profile photos, and an optional screenshot when you send us feedback. Doctors may capture a signature image. The camera is also used to scan QR codes and barcodes, for example a prescription code at a pharmacy. Scanning happens on the device and no image is stored. The camera is used only when you open it. We never access it in the background.</p>

    <h3>Microphone and voice</h3>
    <p>Three features use the microphone, and each is started by you: recording a consultation (doctor and patient both see that it is on), dictating a voice note, and voice feedback. Consultation audio is uploaded so that it can be transcribed and turned into a structured note. The audio file is deleted once transcription completes, and any that remains is removed within 24 hours. Dictation in English uses your phone’s own speech recognition, and only the text reaches us. Dictation in Telugu or Hindi sends the audio to a speech-to-text provider listed in section 5. We never listen in the background.</p>

    <h3>Location</h3>
    <p>Location is used in two ways. First, when you set a home or delivery address, the app can take a one-time precise GPS reading to fill in the address. We store the coordinates with a coarse geohash so that nearby pharmacies and diagnostic centres can be found and distances shown. Second, during an active medicine delivery from a pharmacy, the app shares your live position with that pharmacy so the delivery can reach you. This stops, and the position is removed from the order, when the delivery ends or you stop tracking.</p>
    <p>We do not keep a location history, we do not track you at other times, and we never use location for advertising. You can decline location access. You can still type an address by hand, and everything except delivery tracking and distance sorting keeps working.</p>

    <h3>Contacts</h3>
    <p>Doctors can save a patient’s name and mobile number to their phone’s contact list, and open a WhatsApp conversation with a patient. When a doctor does this, the app writes that one contact to the phone using the standard Android or iOS permission. We do not read, upload or store your existing contact list. WhatsApp is operated by Meta. Once a conversation opens there, Meta’s own terms apply to it.</p>

    <h3>Device and notifications</h3>
    <p>A push-notification token so we can send medication reminders, missed-dose alerts to caregivers, appointment updates, and prescription and order updates. When you submit feedback, the app version and device model are attached so we can reproduce the problem. We do not use crash-reporting, analytics or advertising SDKs, and we do not collect an advertising identifier.</p>

    <h3>Payments</h3>
    <p>Payments for pharmacy orders, diagnostic tests and consultations are processed by Razorpay. We receive the payment status and a transaction reference. We never see or store your card or bank details. Providers who receive payouts complete identity verification (KYC) with Razorpay, which involves their PAN, legal name, contact details and address.</p>

    <!-- 3 -->
    <h2 id="why"><span class="n">03</span>Why we collect it</h2>
    <ul>
      <li>To provide the service: reminders, records, prescriptions, orders, and communication between a patient, their care circle and their providers.</li>
      <li>To authenticate you and keep accounts secure.</li>
      <li>To send the notifications described above.</li>
      <li>To transcribe, structure and translate clinical notes with the AI features you choose to use.</li>
      <li>To process payments and settle providers.</li>
      <li>To answer your support requests and fix problems you report.</li>
      <li>To meet legal obligations that apply to health records, payments and companies in India.</li>
    </ul>
    <p>We rely on your consent for the sensitive data you give us and for the optional permissions (location, microphone, camera, contacts, notifications), and on our legitimate need to operate, secure and improve the service for the rest. We do not use your data for advertising or profiling, and we do not sell it to anyone.</p>

    <!-- 4 -->
    <h2 id="who-sees"><span class="n">04</span>Who can see your data</h2>
    <p>Your health information is visible only to you and to the people in your care circle: the providers and caregivers that you, or your treating doctor, have connected to your record.</p>
    <ul>
      <li><strong>A patient</strong> sees their own record in full.</li>
      <li><strong>A caregiver</strong> sees the schedules and dose logs of the patients who invited them, and receives missed-dose alerts. Caregivers cannot mark a dose or edit medications.</li>
      <li><strong>A doctor</strong> sees the records of patients under their care.</li>
      <li><strong>A clinic assistant</strong> sees the appointment and patient details of the doctor they work for. They cannot prescribe.</li>
      <li><strong>A pharmacy</strong> sees only the prescription or order sent to it, the patient details needed to dispense and deliver it, and, during a delivery, the patient’s live location.</li>
      <li><strong>A diagnostic centre</strong> sees only the test orders assigned to it and the reports it uploads.</li>
      <li><strong>A school infirmary</strong> sees the medication schedule of enrolled students and logs the doses it administers.</li>
    </ul>
    <p>Basic profile information (name and role) is visible to other signed-in users so that, for example, a pharmacy can see which doctor issued a prescription.</p>
    <p>Our staff access identifiable health records only when needed to operate or support the service, and each access is limited to the task at hand.</p>
    <p>We may disclose information if required by law, a court order or a lawful request from a government authority, and to protect a person’s safety in a genuine emergency.</p>

    <!-- 5 -->
    <h2 id="third-parties"><span class="n">05</span>Service providers we use</h2>
    <p>We use service providers who process data on our behalf, under contract, and only for the purposes in this policy.</p>
    <div class="tablewrap">
    <table>
      <thead><tr><th>Provider</th><th>What it receives</th><th>Why</th></tr></thead>
      <tbody>
        <tr><td>Google Firebase and Google Cloud</td><td>Account and health data, stored in the Mumbai (asia-south1) region</td><td>Sign-in, database, file storage, push notifications, server functions</td></tr>
        <tr><td>Google Gemini</td><td>Consultation audio, voice notes, assistant messages, note text, feedback screenshots and, when you ask the assistant about a patient, that patient’s medical history</td><td>Transcription, structuring clinical notes, the in-app assistant</td></tr>
        <tr><td>Sarvam AI</td><td>Audio for Telugu and Hindi speech-to-text; note text for translation</td><td>Regional-language dictation and translation</td></tr>
        <tr><td>Google Maps Platform</td><td>Address text you type, GPS coordinates</td><td>Address lookup and distances</td></tr>
        <tr><td>Razorpay</td><td>Payment amount and reference; provider KYC details</td><td>Payments and provider payouts</td></tr>
        <tr><td>Google Sign-In, Apple Sign-In</td><td>Your email and name (Apple may supply a private relay address)</td><td>Authentication</td></tr>
        <tr><td>ABDM (National Health Authority)</td><td>Aadhaar or mobile number and one-time passwords you enter; your ABHA number</td><td>Creating or linking an ABHA, only when you start it</td></tr>
        <tr><td>WhatsApp (Meta)</td><td>Nothing from us. The app opens a pre-filled message on your own device</td><td>Inviting a patient or caregiver</td></tr>
      </tbody>
    </table>
    </div>
    <div class="note"><strong>About the AI features.</strong> Consultation transcription, note structuring, translation and the in-app assistant are powered by Google Gemini and, for Telugu and Hindi speech, by Sarvam AI. They receive only what the feature needs, process it to return a result to us, and do not use it to advertise to you. Each is bound by contract and by its own privacy terms. Consultation audio is deleted from our storage once it has been transcribed.</div>

    <!-- 6 -->
    <h2 id="abha"><span class="n">06</span>ABHA and the Ayushman Bharat Digital Mission</h2>
    <p>If you choose to create or link an ABHA, the app guides you through the National Health Authority’s ABDM flow. The Aadhaar or mobile number and the one-time passwords you enter are sent to ABDM to complete it, and we store the resulting ABHA number on your profile. This is optional. UMC works without it. ABDM’s own privacy policy governs what it does with your data.</p>

    <!-- 7 -->
    <h2 id="security"><span class="n">07</span>Where data is stored and how it is protected</h2>
    <p>Your data is stored on Google Cloud in the Mumbai (asia-south1) region of India. Some processing, such as the AI features, sign-in and push delivery, runs on our providers’ infrastructure, which may be outside India. Such transfers are made in accordance with Indian law.</p>
    <p>All traffic between the app and our servers is encrypted in transit using TLS. Data at rest is encrypted by the storage provider. Access is restricted by role and by membership in a patient’s care circle, and these limits are enforced on our servers, not only in the app. Adherence logs record who marked each dose, so a record cannot be changed without leaving a trace.</p>
    <p>No system is completely secure. If a breach affecting your personal data occurs, we will notify affected users and the Data Protection Board of India as the DPDP Act requires.</p>

    <!-- 8 -->
    <h2 id="retention"><span class="n">08</span>How long we keep it</h2>
    <ul>
      <li><strong>Account data</strong> is kept while your account is active.</li>
      <li><strong>Health records</strong> are kept for as long as the treating provider is required to retain them under Indian medical record-keeping rules, and then deleted or anonymised.</li>
      <li><strong>Consultation audio</strong> is deleted once transcribed, and in any case within 24 hours.</li>
      <li><strong>Live delivery location</strong> is removed when the delivery ends.</li>
      <li><strong>Feedback</strong> is kept until it is resolved and for a limited period afterwards.</li>
    </ul>

    <!-- 9 -->
    <h2 id="rights"><span class="n">09</span>Your rights</h2>
    <p>Under the DPDP Act you may:</p>
    <ul>
      <li>Access the personal data we hold about you.</li>
      <li>Correct information that is wrong or incomplete.</li>
      <li>Request deletion of your account and associated data (see section 10).</li>
      <li>Withdraw consent for optional features such as location, microphone or notifications, at any time, from your phone’s settings or the app.</li>
      <li>Nominate another person to exercise these rights on your behalf if you are unable to.</li>
      <li>Raise a grievance with our grievance officer (section 15).</li>
    </ul>
    <p>To make a request, email <a href="mailto:admin@unifiedmedicalcare.com">admin@unifiedmedicalcare.com</a> from the email address or mobile number registered on your account. We respond within 30 days. If you are not satisfied with our response, you may complain to the Data Protection Board of India.</p>
    <p>Where a record forms part of a medical record that a healthcare provider is legally obliged to retain, we may be unable to delete it before that period expires. We will tell you if that applies.</p>

    <!-- 10 -->
    <h2 id="delete-account"><span class="n">10</span>Deleting your account</h2>
    <p><strong>In the app:</strong> open the menu, go to <strong>Edit Account</strong>, and tap <strong>Delete Account</strong>. Your sign-in is removed on our servers straight away, and your data is handled as described below.</p>
    <p><strong>By email:</strong> write to <a href="mailto:admin@unifiedmedicalcare.com">admin@unifiedmedicalcare.com</a> with the subject “Delete my account” from the email or mobile number registered on the account. We confirm your identity, complete the deletion within 30 days, and confirm when it is done.</p>
    <p>What happens to your data:</p>
    <ul>
      <li><strong>If you are a patient</strong>, your account, profile, medications, schedules, dose logs, assistant chats and uploaded files are deleted. Where a provider served you, your name, address, location and clinical notes are removed from that provider’s copy of the record and any diagnostic report file is deleted. The provider keeps only an anonymised entry with the service, the test name and the amount, so that their accounts still reconcile.</li>
      <li><strong>If you are a doctor, pharmacy or diagnostic centre</strong>, your account and profile are deleted. The clinical records you created for patients remain with those patients, because they are the patient’s medical record, not yours.</li>
      <li><strong>If you are a caregiver, clinic assistant or infirmary user</strong>, your account and profile are deleted and you are removed from every patient record you were linked to.</li>
    </ul>

    <!-- 11 -->
    <h2 id="children"><span class="n">11</span>Children</h2>
    <p>UMC is intended for use by adults. Where a patient record belongs to a child, it is created and managed by a parent, legal guardian, the treating healthcare provider, or a school infirmary the guardian has enrolled the child with. We do not knowingly allow children to create their own accounts, and we do not use children’s data for any purpose other than their care.</p>

    <!-- 12 -->
    <h2 id="not-medical-device"><span class="n">12</span>Not a medical device</h2>
    <p>UMC is a record-keeping, reminder and communication tool. It does not diagnose, treat or provide medical advice, and it is not a substitute for professional clinical judgement. Transcripts and structured notes produced by the AI features are drafts for the treating doctor to review. In an emergency, contact a doctor or emergency services directly.</p>

    <!-- 13 -->
    <h2 id="permissions"><span class="n">13</span>App permissions</h2>
    <p>The Android app declares the permissions below. iOS asks for the equivalent access when a feature first needs it. Each is optional except internet access, and the app explains why before asking.</p>
    <div class="tablewrap">
    <table>
      <thead><tr><th>Permission</th><th>Used for</th></tr></thead>
      <tbody>
        <tr><td><code>INTERNET</code></td><td>Talking to our servers.</td></tr>
        <tr><td><code>POST_NOTIFICATIONS</code></td><td>Medication reminders, missed-dose alerts, appointment and order updates.</td></tr>
        <tr><td><code>CAMERA</code></td><td>Scanning QR codes and barcodes; taking a profile photo; capturing a signature.</td></tr>
        <tr><td><code>RECORD_AUDIO</code></td><td>Recording a consultation, dictating a voice note, voice feedback.</td></tr>
        <tr><td><code>ACCESS_FINE_LOCATION</code>, <code>ACCESS_COARSE_LOCATION</code></td><td>Filling in your address; sharing your position with the pharmacy during a delivery.</td></tr>
        <tr><td><code>WRITE_CONTACTS</code>, <code>READ_CONTACTS</code></td><td>Saving a patient as a contact on a doctor’s phone. The app writes one contact and does not read the list.</td></tr>
        <tr><td><code>READ_MEDIA_IMAGES</code>, <code>READ_MEDIA_VISUAL_USER_SELECTED</code>, <code>READ_EXTERNAL_STORAGE</code> (Android 12 and below)</td><td>Choosing a profile photo or a feedback screenshot from your gallery.</td></tr>
        <tr><td>Exact alarms</td><td>Firing medication reminders at the scheduled minute.</td></tr>
      </tbody>
    </table>
    </div>

    <!-- 14 -->
    <h2 id="changes"><span class="n">14</span>Changes to this policy</h2>
    <p>We may update this policy. The version and effective date at the top will change, and material changes will be notified in the app before they take effect. Continued use after a change means you accept the updated policy.</p>

    <!-- 15 -->
    <h2 id="contact"><span class="n">15</span>Grievance officer and contact</h2>
    <p>Under the Information Technology Act, 2000 and the DPDP Act, our grievance officer is:</p>
    <address>
      <strong>Anand Kamma</strong>, Director<br>
      ASHOKANAND CREATIONS PRIVATE LIMITED<br>
      H No 46/1L-4, Chanukyapuri Colony, KNL-Camp-B, Kurnool – 518002, Andhra Pradesh, India<br>
      <a href="mailto:admin@unifiedmedicalcare.com">admin@unifiedmedicalcare.com</a> · +91 63045 19244
    </address>
    <p style="margin-top:14px">Grievances are acknowledged within 24 hours and resolved within 30 days.</p>

  </article>

  <!-- ================= SIGNED COPY (web) ================= -->
  <aside class="web-only callout" id="signed-copy" hidden>
    <p class="kicker">Board-approved copy</p>
    <p>This policy was adopted by resolution of the Board of Directors. A signed copy on company letterhead is available for download.</p>
    <a class="btn" href="#" rel="noopener">Download the signed policy (PDF)</a>
  </aside>

  <footer class="web-only site">
    <span>© 2026 Unified Medical Care</span>
    <a href="/">unifiedmedicalcare.com</a>
    <span>ASHOKANAND CREATIONS PRIVATE LIMITED</span>
  </footer>

  <!-- ================= BOARD APPROVAL (print) ================= -->
  <section class="print-only approval">
    <h2><span class="n">Board approval</span>Adoption of the Privacy Policy</h2>
    <p class="statement">The foregoing Privacy Policy, Version 1.0, was approved by the Board of Directors of ASHOKANAND CREATIONS PRIVATE LIMITED (CIN U26209AP2025PTC120364) and adopted as the privacy policy of Unified Medical Care, covering its mobile application, provider web portal and website, with effect from 13 September 2026. The Directors confirm that the statements in it reflect the company’s data practices as at that date and undertake to keep it accurate.</p>
    <div class="sigs">
      <div class="sig">
        <div class="box"></div>
        <div class="name">Anand Kamma</div>
        <div class="meta">Director<br>DIN: 10280398<br>Date: ____________________</div>
      </div>
      <div class="sig">
        <div class="box"></div>
        <div class="name">Ashok Kamma</div>
        <div class="meta">Director<br>DIN: 10280418<br>Date: ____________________</div>
      </div>
    </div>
    <p class="seal">For and on behalf of ASHOKANAND CREATIONS PRIVATE LIMITED · Registered office: H No 46/1L-4, Chanukyapuri Colony, KNL-Camp-B, Kurnool – 518002, Andhra Pradesh</p>
  </section>

</div>
</body>
</html>
```
