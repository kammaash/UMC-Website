// phoneAuthErrors.ts — Firebase phone-auth error codes → the short messages
// shown inside the OTP modal. Kept apart from PhoneOtp.tsx so that file exports
// only a component (react-refresh/only-export-components). Extracted verbatim
// from LoginPage.tsx on 2026-09-17; behaviour unchanged.

// Maps a Firebase auth error to a short, human-readable reason shown inside the
// phone popup. Falls back to a generic line for anything unmapped.
function firebaseErrCode(err: unknown): string {
  return err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : ''
}
export function phoneAuthMessage(err: unknown): string {
  switch (firebaseErrCode(err)) {
    case 'auth/invalid-phone-number':
    case 'auth/missing-phone-number':  return 'That phone number looks invalid. Check it and try again.'
    case 'auth/too-many-requests':     return 'Too many attempts. Please wait a bit, then try again.'
    case 'auth/quota-exceeded':        return 'SMS limit reached. Please try again later.'
    case 'auth/captcha-check-failed':
    case 'auth/invalid-app-credential': return 'Verification failed. Please try again.'
    case 'auth/unauthorized-domain':   return 'This site isn’t authorized for phone sign-in.'
    default:                           return 'We couldn’t send a code to that number. Check it and try again.'
  }
}
export function otpAuthMessage(err: unknown): string {
  switch (firebaseErrCode(err)) {
    case 'auth/invalid-verification-code': return 'That code isn’t right. Please re-enter it.'
    case 'auth/code-expired':              return 'That code expired. Request a new one.'
    case 'auth/missing-verification-code': return 'Please enter the 6-digit code.'
    default:                               return 'We couldn’t verify that code. Please try again.'
  }
}
