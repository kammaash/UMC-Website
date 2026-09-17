// phoneFormat.ts — display helper for the OTP-proven number.
// Firebase reports it as E.164 ("+917799440022"); patients recognise
// "+91 77994 40022". Anything that isn't an Indian mobile is shown as is.

export function formatIndianPhone(e164: string | null | undefined): string {
  const s = (e164 || '').trim()
  const m = /^\+91(\d{5})(\d{5})$/.exec(s)
  return m ? `+91 ${m[1]} ${m[2]}` : s
}
