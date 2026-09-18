// formatName.ts — display helper for a patient's name as the doctor typed
// it into the app. Firestore carries it exactly as entered — any case at
// all — so this normalises it for display: only the first letter of the
// first word and the first letter of the last word are capitalised;
// everything else, including a middle name, is lowercase. Never touches
// what gets written back to Firestore (syncPatientName) — display only.
export function formatPatientName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  if (words.length === 1) return cap(words[0])
  return [cap(words[0]), ...words.slice(1, -1).map((w) => w.toLowerCase()), cap(words[words.length - 1])].join(' ')
}
