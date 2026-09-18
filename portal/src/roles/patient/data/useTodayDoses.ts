// useTodayDoses.ts — live "today" for a claimed group: the group doc (its
// timezone), the tablets, and today's medicationLogs, folded by the pure
// buildTodayDoses. Re-evaluates every 30 s so "upcoming" turns "due" and the
// day rolls over without a reload. All three reads are membership-gated in
// rules and the OTP-claimed patient is patient_uid.
import { useEffect, useMemo, useState } from 'react'
import { collection, doc, query, where } from 'firebase/firestore'
import { db } from '../../../shared/lib/firebase'
import { useDocData, useQueryData } from '../../../shared/data/useFirestore'
import { buildTodayDoses, headingDate, localParts, type Dose, type LogDoc, type TabletDoc } from './doses'

export interface TodayDoses {
  loading: boolean
  error: Error | null
  doses: Dose[]
  zone: string
  dateLabel: string
  nowMinutes: number
}

export function useTodayDoses(gid: string | null): TodayDoses {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    const onVisible = () => { if (document.visibilityState === 'visible') setNow(new Date()) }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  const group = useDocData(gid ? doc(db, 'patientGroups', gid) : null, (_id, d) => ({ timezone: (d.timezone as string) || '' }))
  const local = useMemo(() => localParts(now, group.data?.timezone), [now, group.data?.timezone])

  const tablets = useQueryData<TabletDoc>(
    gid ? collection(db, 'patientGroups', gid, 'tablets') : null,
    (id, d) => ({ id, medication: d.medication ?? null, schedule: d.schedule ?? null, caregiverSettings: d.caregiverSettings ?? null }),
    [gid],
  )
  const logs = useQueryData<LogDoc>(
    gid ? query(collection(db, 'patientGroups', gid, 'medicationLogs'), where('date', '==', local.dateStr)) : null,
    (id, d) => ({ id, status: d.status as string | undefined, takenAt: d.takenAt ?? null }),
    [gid, local.dateStr],
  )

  const doses = useMemo(() => buildTodayDoses(tablets.data, logs.data, local), [tablets.data, logs.data, local])
  return {
    loading: group.loading || tablets.loading || logs.loading,
    error: group.error || tablets.error || logs.error,
    doses,
    zone: local.zone,
    dateLabel: headingDate(now, local.zone),
    nowMinutes: local.minutes,
  }
}
