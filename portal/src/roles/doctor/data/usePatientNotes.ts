import { collection, query, orderBy } from 'firebase/firestore'
import { db } from '../../../shared/lib/firebase'
import { useAuth } from '../../../shared/auth/AuthContext'
import { useQueryData } from '../../../shared/data/useFirestore'
import { mapNote } from './mappers'

export function usePatientNotes(patientGroupID: string | null) {
  const { user } = useAuth()
  const q = (user && patientGroupID)
    ? query(
        collection(db, 'doctors', user.uid, 'createdPatients', patientGroupID, 'notes'),
        orderBy('createdAt', 'desc'),
      )
    : null
  return useQueryData(q, mapNote, [user?.uid, patientGroupID])
}
