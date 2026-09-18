// reminderDoses.ts — the page's "Taken" write. The SAME doc the app's
// markAsTaken writes (medication_tracking_service.dart:293-309) and that
// markDoseFromPush writes for the notification button: same id, same fields,
// set() without merge so a scheduler-written 'missed' log flips to taken and
// onMedicationLogResolved retracts the caregiver alert. markedBySource
// distinguishes the surface: 'patient_web' here, 'patient_web_push' for the
// button, 'patient_app' in the app. Rules: write requires uid == patient_uid.
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../../shared/lib/firebase'
import { isTakenLate, type Dose } from './doses'

export async function markDoseTaken(gid: string, uid: string, dose: Dose, nowMinutes: number, now: Date = new Date()): Promise<void> {
  const takenLate = isTakenLate(dose, nowMinutes)
  await setDoc(doc(db, 'patientGroups', gid, 'medicationLogs', dose.logId), {
    tabletId: dose.tabletId,
    medicationName: dose.medicationName,
    scheduledTime: dose.scheduledTime,
    takenAt: Timestamp.fromDate(now),
    date: dose.date,
    status: takenLate ? 'taken_late' : 'taken',
    takenLate,
    createdAt: serverTimestamp(),
    markedBy: uid,
    markedBySource: 'patient_web',
  })
}
