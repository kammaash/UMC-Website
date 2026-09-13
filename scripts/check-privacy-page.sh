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
