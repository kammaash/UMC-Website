import { collection, query, orderBy } from 'firebase/firestore'
import { db } from '../../../shared/lib/firebase'
import { useAuth } from '../../../shared/auth/AuthContext'
import { useQueryData } from '../../../shared/data/useFirestore'
import { mapCreatedPatient } from './mappers'

export function usePatients() {
  const { user } = useAuth()
  const q = user
    ? query(collection(db, 'doctors', user.uid, 'createdPatients'), orderBy('createdAt', 'desc'))
    : null
  return useQueryData(q, mapCreatedPatient, [user?.uid])
}
