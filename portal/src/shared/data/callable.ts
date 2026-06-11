import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'

// All doctor Cloud Functions are deployed in the default region (us-central1),
// which is what `functions` (getFunctions(app)) targets. Do NOT add a region.
export function callable<TReq extends object, TRes>(name: string) {
  const fn = httpsCallable<TReq, TRes>(functions, name)
  return async (data: TReq): Promise<TRes> => {
    const res = await fn(data)
    return res.data
  }
}
