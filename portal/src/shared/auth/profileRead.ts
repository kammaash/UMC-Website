// profileRead.ts — a limit on how long the sign-in profile read may take.
//
// Firestore normally fails a read by itself when the phone is offline. On a
// connection that is up but going nowhere it can also simply never answer,
// and a page waiting on it would show "Loading…" for ever. Long enough for a
// slow mobile connection; short enough that a patient is still looking.
export const PROFILE_READ_TIMEOUT_MS = 15_000

export function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const limit = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms)
  })
  return Promise.race([work, limit]).finally(() => { if (timer) clearTimeout(timer) })
}
