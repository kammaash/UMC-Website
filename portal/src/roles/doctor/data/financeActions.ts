import { auth } from '../../../shared/lib/firebase'
import { callable } from '../../../shared/data/callable'

const settle = callable<
  { doctorId: string; penaltyRecordId: string },
  { success: boolean; alreadyDone: boolean; total: number; penaltyId: string }
>('settleDoctorPenaltyManually')

// Server requires request.auth.uid === doctorId — pass the current uid.
export async function settlePenalty(penaltyRecordId: string) {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Not signed in')
  return settle({ doctorId: uid, penaltyRecordId })
}
