// phoneAuthErrors.ts — Firebase phone-auth error codes → the short messages
// shown inside the OTP modal. Kept apart from PhoneOtp.tsx so that file exports
// only a component (react-refresh/only-export-components). Extracted verbatim
// from LoginPage.tsx on 2026-09-17; behaviour unchanged.
//
// Split in two on 2026-09-29: the code → reason step is language-free, so the
// patient reminders page can word each reason in the patient's own language.
// The English wording below is what the member portal shows.

function firebaseErrCode(err: unknown): string {
  return err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : ''
}

export type PhoneAuthReason =
  | 'invalid-number' | 'too-many-attempts' | 'sms-limit' | 'verification-failed' | 'unauthorized-domain' | 'generic'
export type OtpAuthReason = 'wrong-code' | 'code-expired' | 'code-missing' | 'generic'

export function phoneAuthReason(err: unknown): PhoneAuthReason {
  switch (firebaseErrCode(err)) {
    case 'auth/invalid-phone-number':
    case 'auth/missing-phone-number':  return 'invalid-number'
    case 'auth/too-many-requests':     return 'too-many-attempts'
    case 'auth/quota-exceeded':        return 'sms-limit'
    case 'auth/captcha-check-failed':
    case 'auth/invalid-app-credential': return 'verification-failed'
    case 'auth/unauthorized-domain':   return 'unauthorized-domain'
    default:                           return 'generic'
  }
}
export function otpAuthReason(err: unknown): OtpAuthReason {
  switch (firebaseErrCode(err)) {
    case 'auth/invalid-verification-code': return 'wrong-code'
    case 'auth/code-expired':              return 'code-expired'
    case 'auth/missing-verification-code': return 'code-missing'
    default:                               return 'generic'
  }
}

export const PHONE_AUTH_MESSAGES: Record<PhoneAuthReason, string> = {
  'invalid-number':      'That phone number looks invalid. Check it and try again.',
  'too-many-attempts':   'Too many attempts. Please wait a bit, then try again.',
  'sms-limit':           'SMS limit reached. Please try again later.',
  'verification-failed': 'Verification failed. Please try again.',
  'unauthorized-domain': 'This site isn’t authorized for phone sign-in.',
  'generic':             'We couldn’t send a code to that number. Check it and try again.',
}
export const OTP_AUTH_MESSAGES: Record<OtpAuthReason, string> = {
  'wrong-code':   'That code isn’t right. Please re-enter it.',
  'code-expired': 'That code expired. Request a new one.',
  'code-missing': 'Please enter the 6-digit code.',
  'generic':      'We couldn’t verify that code. Please try again.',
}

// Maps a Firebase auth error to a short, human-readable reason shown inside the
// phone popup. Falls back to a generic line for anything unmapped.
export function phoneAuthMessage(err: unknown): string {
  return PHONE_AUTH_MESSAGES[phoneAuthReason(err)]
}
export function otpAuthMessage(err: unknown): string {
  return OTP_AUTH_MESSAGES[otpAuthReason(err)]
}
