import { doc, setDoc, serverTimestamp, GeoPoint } from 'firebase/firestore'
import { db, auth } from '../../../shared/lib/firebase'

export interface SaveSettingsInput {
  fee: number
  slotDuration: number
  workingDays: string[]
  startTime: string
  endTime: string
  clinicName: string
  clinicAddress: string
  isAcceptingAppointments: boolean
  clinicLatitude?: number | null
  clinicLongitude?: number | null
}

// Mirrors the phone app: set(..., { merge: true }); writes clinicLocation GeoPoint
// only when both coordinates are present (the web picker supplies them).
export async function saveConsultationSettings(input: SaveSettingsInput): Promise<void> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Not signed in')
  const data: Record<string, unknown> = {
    fee: input.fee, slotDuration: input.slotDuration, workingDays: input.workingDays,
    startTime: input.startTime, endTime: input.endTime, clinicName: input.clinicName,
    clinicAddress: input.clinicAddress, isAcceptingAppointments: input.isAcceptingAppointments,
    updatedAt: serverTimestamp(),
  }
  if (input.clinicLatitude != null && input.clinicLongitude != null) {
    data.clinicLocation = new GeoPoint(input.clinicLatitude, input.clinicLongitude)
  }
  await setDoc(doc(db, 'doctors', uid, 'consultationSettings', 'settings'), data, { merge: true })
}
