import { useEffect, useState } from 'react'
import {
  onSnapshot, type DocumentReference, type Query,
  type DocumentData,
} from 'firebase/firestore'

export interface Async<T> { data: T | null; loading: boolean; error: Error | null }

export function useDocData<T>(
  ref: DocumentReference<DocumentData> | null,
  map: (id: string, data: DocumentData) => T,
): Async<T> {
  const [state, setState] = useState<Async<T>>({ data: null, loading: true, error: null })
  // key off the doc path so we re-subscribe when the target changes
  const path = ref ? ref.path : null
  useEffect(() => {
    if (!ref) { setState({ data: null, loading: false, error: null }); return }
    setState((s) => ({ ...s, loading: true }))
    return onSnapshot(
      ref,
      (snap) => setState({
        data: snap.exists() ? map(snap.id, snap.data()) : null,
        loading: false, error: null,
      }),
      (error) => setState({ data: null, loading: false, error }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])
  return state
}

export function useQueryData<T>(
  query: Query<DocumentData> | null,
  map: (id: string, data: DocumentData) => T,
  deps: unknown[] = [],
): Async<T[]> & { data: T[] } {
  const [state, setState] = useState<{ data: T[]; loading: boolean; error: Error | null }>(
    { data: [], loading: true, error: null },
  )
  useEffect(() => {
    if (!query) { setState({ data: [], loading: false, error: null }); return }
    setState((s) => ({ ...s, loading: true }))
    return onSnapshot(
      query,
      (snap) => setState({ data: snap.docs.map((d) => map(d.id, d.data())), loading: false, error: null }),
      (error) => setState({ data: [], loading: false, error }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}
