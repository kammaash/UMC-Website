// reminderAuth.ts — phone OTP sign-in actions for the reminders page.
//
// The page never touches firebase directly (portal rule: pages import only
// data/ modules). These wrap the same calls the member portal's LoginPage
// makes inline — an invisible RecaptchaVerifier attached to the OtpModal's
// hidden #umc-recaptcha container, then signInWithPhoneNumber → confirm.
//
// Deliberately NOT reused from LoginPage: that page's post-OTP member gate
// deletes any auth account without a users/{uid} doc, which is exactly the
// state a doctor-created patient is in until claimGroup (piece 3) writes one.
import {
  RecaptchaVerifier, signInWithPhoneNumber, signOut,
  type ConfirmationResult, type User,
} from 'firebase/auth'
import { auth } from '../../../shared/lib/firebase'

let verifier: RecaptchaVerifier | null = null
let pending: ConfirmationResult | null = null

// Sends the SMS code. Throws the Firebase error on failure (the caller maps
// it with phoneAuthMessage). The verifier is rebuilt on every send: the modal
// remounts between steps (key={otpStep}) and again on each reopen, so a
// verifier kept from an earlier send is bound to a #umc-recaptcha node that
// no longer exists — reusing it fails the first Send after "Try another
// number". A consumed/failed reCAPTCHA can't be reused anyway.
export async function sendOtp(phoneE164: string): Promise<void> {
  try { verifier?.clear() } catch { /* ignore */ }
  verifier = new RecaptchaVerifier(auth, 'umc-recaptcha', { size: 'invisible' })
  try {
    pending = await signInWithPhoneNumber(auth, phoneE164, verifier)
  } catch (err) {
    try { verifier.clear() } catch { /* ignore */ }
    verifier = null
    throw err
  }
}

// Confirms the 6-digit code against the pending SMS. Throws the Firebase
// error on a wrong/expired code (mapped by otpAuthMessage); resolves with the
// now signed-in user.
export async function confirmOtp(code: string): Promise<User> {
  if (!pending) throw new Error('no-pending-otp')
  const cred = await pending.confirm(code)
  pending = null
  return cred.user
}

// Drops the verifier + pending code, e.g. when the modal is cancelled, so the
// next open starts clean.
export function resetOtp(): void {
  try { verifier?.clear() } catch { /* ignore */ }
  verifier = null
  pending = null
}

export async function signOutReminders(): Promise<void> {
  resetOtp()
  await signOut(auth)
}
