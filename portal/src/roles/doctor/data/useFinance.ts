import { doc, collection, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '../../../shared/lib/firebase'
import { useAuth } from '../../../shared/auth/AuthContext'
import { useDocData, useQueryData } from '../../../shared/data/useFirestore'
import { mapFinanceSummary, mapTransaction, mapPenalty } from './mappers'

export function useFinanceSummary() {
  const { user } = useAuth()
  const ref = user ? doc(db, 'doctors', user.uid, 'finance', 'summary') : null
  return useDocData(ref, mapFinanceSummary)
}

export function useFinanceTransactions() {
  const { user } = useAuth()
  const q = user
    ? query(
        collection(db, 'doctors', user.uid, 'finance', 'transactions', 'records'),
        where('type', 'in', ['payout_released', 'cancellation_compensation']),
        orderBy('createdAt', 'desc'), limit(50),
      )
    : null
  return useQueryData(q, mapTransaction, [user?.uid])
}

export function usePendingPenalties() {
  const { user } = useAuth()
  const q = user
    ? query(collection(db, 'doctors', user.uid, 'finance', 'pending', 'records'), orderBy('createdAt', 'desc'))
    : null
  return useQueryData(q, mapPenalty, [user?.uid])
}

export function useCompletedPenalties() {
  const { user } = useAuth()
  const q = user
    ? query(
        collection(db, 'doctors', user.uid, 'finance', 'completed', 'records'),
        orderBy('createdAt', 'desc'), limit(30),
      )
    : null
  return useQueryData(q, mapPenalty, [user?.uid])
}
