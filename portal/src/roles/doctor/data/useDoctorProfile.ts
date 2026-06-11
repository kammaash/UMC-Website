import { doc } from 'firebase/firestore'
import { db } from '../../../shared/lib/firebase'
import { useAuth } from '../../../shared/auth/AuthContext'
import { useDocData } from '../../../shared/data/useFirestore'
import { mapDoctorProfile, mapDoctorRecord } from './mappers'

export function useDoctorProfile() {
  const { user } = useAuth()
  return useDocData(user ? doc(db, 'users', user.uid) : null, mapDoctorProfile)
}

export function useDoctorRecord() {
  const { user } = useAuth()
  return useDocData(user ? doc(db, 'doctors', user.uid) : null, mapDoctorRecord)
}
