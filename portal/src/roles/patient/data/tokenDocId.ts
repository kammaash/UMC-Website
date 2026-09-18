// tokenDocId.ts — webPushTokens/{tokenHash}: SHA-256 hex of the raw FCM token,
// byte-for-byte what functions/webReminderHelpers.js tokenDocId() computes, so
// the sender and the page address the same doc and re-registration is
// idempotent.
export async function tokenDocId(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(String(token))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
