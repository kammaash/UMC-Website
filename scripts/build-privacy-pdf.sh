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

python3 - "$OUT" <<'PY'
import sys
from pypdf import PdfReader
r = PdfReader(sys.argv[1])
n = len(r.pages)
last = r.pages[-1].extract_text() or ""
first = r.pages[0].extract_text() or ""
ok = ("U26209AP2025PTC120364" in first) and ("DIN: 10280398" in last) and ("DIN: 10280418" in last)
print(f"{sys.argv[1]}: {n} pages; letterhead on p1 and both signature cells on last page: {ok}")
sys.exit(0 if ok else 1)
PY
