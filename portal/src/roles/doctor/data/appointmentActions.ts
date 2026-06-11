import {
  doc, updateDoc, deleteDoc, runTransaction, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../../shared/lib/firebase'
import { callable } from '../../../shared/data/callable'
import { slotLockId } from './ids'
import type { Appointment } from './types'

// The fields each action needs are already present on the Appointment the UI holds.
type ApptRef = Pick<Appointment, 'id' | 'doctorUID' | 'patientUID' | 'date' | 'timeSlot'>

const processCancellation = callable<
  { featureArea: string; orderId: string; cancelledBy: string; patientUid: string; providerId: string },
  unknown
>('processCancellation')

const dismissByDoctor = callable<{ appointmentId: string }, { success: boolean }>('dismissAppointmentByDoctor')

async function removeSlotLock(a: ApptRef): Promise<void> {
  if (!a.date || !a.timeSlot) return
  await deleteDoc(doc(db, 'appointment_locks', slotLockId(a.doctorUID, a.date, a.timeSlot))).catch(() => {})
}

// Deletes users/{patientUID}/active_doctor_guards/{doctorUID} iff it still points at this appointment.
async function releaseGuard(a: ApptRef): Promise<void> {
  const ref = doc(db, 'users', a.patientUID, 'active_doctor_guards', a.doctorUID)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (snap.exists() && snap.data().appointmentId === a.id) tx.delete(ref)
  }).catch(() => {})
}

// confirmByDoctor — direct write
export async function confirmAppointment(appointmentId: string): Promise<void> {
  await updateDoc(doc(db, 'appointments', appointmentId), {
    status: 'confirmed',
    doctorConfirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// markConsultationDoneByDoctor — transaction with dual-confirm branch
export async function markDoneByDoctor(a: ApptRef): Promise<void> {
  const ref = doc(db, 'appointments', a.id)
  let justCompleted = false
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    const patientConfirmed = snap.data().patientConfirmedDone === true
    if (patientConfirmed) {
      tx.update(ref, {
        doctorConfirmedDone: true, status: 'completed',
        completedAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })
      justCompleted = true
    } else {
      tx.update(ref, { doctorConfirmedDone: true, updatedAt: serverTimestamp() })
    }
  })
  if (justCompleted) { await removeSlotLock(a); await releaseGuard(a) }
}

// rejectByDoctor — CF + post-write cancelReason
export async function rejectAppointment(a: ApptRef, reason?: string): Promise<void> {
  await removeSlotLock(a)
  await processCancellation({
    featureArea: 'consultation', orderId: a.id, cancelledBy: 'provider',
    patientUid: a.patientUID, providerId: a.doctorUID,
  })
  await updateDoc(doc(db, 'appointments', a.id), {
    cancelReason: reason ?? 'rejected', updatedAt: serverTimestamp(),
  })
  await releaseGuard(a)
}

// cancelByDoctor — CF only (no extra appointment write)
export async function cancelAppointment(a: ApptRef): Promise<void> {
  await removeSlotLock(a)
  await processCancellation({
    featureArea: 'consultation', orderId: a.id, cancelledBy: 'provider',
    patientUid: a.patientUID, providerId: a.doctorUID,
  })
  await releaseGuard(a)
}

// markPatientNoShow — CF with cancelledBy: 'no_show'
export async function markNoShow(a: ApptRef): Promise<void> {
  await removeSlotLock(a)
  await processCancellation({
    featureArea: 'consultation', orderId: a.id, cancelledBy: 'no_show',
    patientUid: a.patientUID, providerId: a.doctorUID,
  })
  await releaseGuard(a)
}

// dismissAppointmentByDoctor — CF
export async function dismissAppointment(appointmentId: string): Promise<void> {
  await dismissByDoctor({ appointmentId })
}
