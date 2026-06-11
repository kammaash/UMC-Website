import { collection, query, where } from 'firebase/firestore'
import { db } from '../../../shared/lib/firebase'
import { useAuth } from '../../../shared/auth/AuthContext'
import { useQueryData } from '../../../shared/data/useFirestore'
import { mapAppointment } from './mappers'

// Mirrors streamDoctorAppointments: where doctorUID == uid; sort/filter client-side.
export function useDoctorAppointments() {
  const { user } = useAuth()
  const q = user ? query(collection(db, 'appointments'), where('doctorUID', '==', user.uid)) : null
  return useQueryData(q, mapAppointment, [user?.uid])
}
