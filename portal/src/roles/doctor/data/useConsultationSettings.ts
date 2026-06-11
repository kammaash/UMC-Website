import { doc } from 'firebase/firestore'
import { db } from '../../../shared/lib/firebase'
import { useAuth } from '../../../shared/auth/AuthContext'
import { useDocData } from '../../../shared/data/useFirestore'
import { mapConsultationSettings } from './mappers'

export function useConsultationSettings() {
  const { user } = useAuth()
  const ref = user ? doc(db, 'doctors', user.uid, 'consultationSettings', 'settings') : null
  return useDocData(ref, mapConsultationSettings)
}
