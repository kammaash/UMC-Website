# Doctor Portal — Phase 2: Data Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the typed data layer for the doctor portal — TypeScript models, pure Firestore mappers, live read hooks, and action functions — so the doctor pages (Phase 3) can read real data and perform every appointment-lifecycle / settings / notes action by consuming hooks, never touching Firebase directly.

**Architecture:** Reads use Firestore `onSnapshot` via two generic hooks in `src/shared/data/`. Writes are either **direct Firestore writes** (confirm, mark-done, settings, notes) or **Cloud Function calls** (`processCancellation` for cancel/reject/no-show, `dismissAppointmentByDoctor`, `settleDoctorPenaltyManually`) — each mirroring exactly what the Flutter app does. Pure data mappers and id helpers are TDD'd; hooks/actions are integration code verified by build + a live smoke test. **All doctor Cloud Functions are in the default `us-central1` region** (use the existing `functions` export — no region override).

**Tech Stack:** React, TypeScript, Firebase JS SDK (`firestore`, `functions`), Vitest.

**Companion docs:**
- Spec: `docs/superpowers/specs/2026-06-11-doctor-web-portal-design.md`  *(see §6 data model)*
- Phase 1 plan (DONE): `docs/superpowers/plans/2026-06-11-doctor-portal-phase1-foundation.md`

**Scope of THIS phase:** the data layer for **reads + appointment lifecycle + consultation settings + medical notes**. The **create flows** (create patient, prescribe medication, order diagnostics) are larger multi-doc writes and are deferred to **Phase 3a**; their field schemas are recorded in the spec/handoff for later.

**Work from:** `/Users/anandkammasmacbook/StudioProjects/UMC-Website` (git) and `/Users/anandkammasmacbook/StudioProjects/UMC-Website/portal` (npm). You are on branch `feat/doctor-portal`.

**Verbatim-accuracy mandate:** the field names, status strings, Cloud Function names, payload keys, and write maps below were extracted from the live Flutter app and MUST be reproduced exactly — the portal shares one backend with the phone app.

---

## File Structure (created in this phase)

```
portal/src/
  shared/
    lib/firebase.ts          # (exists) exports app, auth, db, functions
    data/
      useFirestore.ts        # generic useDocData / useQueryData hooks (onSnapshot)
      callable.ts            # typed httpsCallable wrapper (us-central1)
  roles/doctor/
    data/
      types.ts               # all doctor TS models + status unions
      mappers.ts             # pure DocumentData -> typed object mappers (TDD)
      mappers.test.ts
      ids.ts                 # pure id/key helpers (slot lock id) (TDD)
      ids.test.ts
      useDoctorProfile.ts    # users/{uid} + doctors/{uid}
      useAppointments.ts     # appointments where doctorUID == uid
      useConsultationSettings.ts
      usePatients.ts         # createdPatients
      usePatientNotes.ts     # createdPatients/{pg}/notes
      useFinance.ts          # finance/summary + transactions + pending + completed
      appointmentActions.ts  # confirm / markDone / reject / cancel / noShow / dismiss
      financeActions.ts      # settlePenalty
      settingsActions.ts     # saveConsultationSettings
      noteActions.ts         # createNote / updateNote
```

---

## Task 1: Typed callable wrapper (us-central1)

**Files:**
- Create: `portal/src/shared/data/callable.ts`

- [ ] **Step 1: Create the wrapper**

Create `portal/src/shared/data/callable.ts`:
```ts
import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'

// All doctor Cloud Functions are deployed in the default region (us-central1),
// which is what `functions` (getFunctions(app)) targets. Do NOT add a region.
export function callable<TReq extends object, TRes>(name: string) {
  const fn = httpsCallable<TReq, TRes>(functions, name)
  return async (data: TReq): Promise<TRes> => {
    const res = await fn(data)
    return res.data
  }
}
```

- [ ] **Step 2: Verify build**

Run from `portal/`: `npm run build` — Expected: success.

- [ ] **Step 3: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal && git commit -m "feat(portal/data): typed httpsCallable wrapper (us-central1)"
```

---

## Task 2: Generic Firestore read hooks

**Files:**
- Create: `portal/src/shared/data/useFirestore.ts`

These wrap `onSnapshot` so every domain hook is a thin typed call. Reused by all roles.

- [ ] **Step 1: Create the generic hooks**

Create `portal/src/shared/data/useFirestore.ts`:
```ts
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
```

- [ ] **Step 2: Verify build**

Run from `portal/`: `npm run build` — Expected: success.

- [ ] **Step 3: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal && git commit -m "feat(portal/data): generic onSnapshot read hooks (useDocData/useQueryData)"
```

---

## Task 3: TypeScript models (`types.ts`)

**Files:**
- Create: `portal/src/roles/doctor/data/types.ts`

Field names/types are exact mirrors of the Firestore docs the phone app reads.

- [ ] **Step 1: Create the types**

Create `portal/src/roles/doctor/data/types.ts`:
```ts
import type { Timestamp, GeoPoint } from 'firebase/firestore'

export type AppointmentStatus =
  | 'awaiting_doctor_confirmation' | 'confirmed' | 'active' | 'arrived' | 'completed'
  | 'cancelled_by_patient' | 'cancelled_by_doctor' | 'patient_no_show' | 'expired'

export interface Appointment {
  id: string
  doctorUID: string
  doctorName: string
  patientUID: string
  patientName: string
  patientGroupID: string
  patientPhone: string
  date: string            // 'YYYY-MM-DD'
  timeSlot: string        // 'HH:MM'
  slotDuration: number
  fee: number
  clinicName: string
  clinicAddress: string
  status: AppointmentStatus
  paymentStatus: string   // 'pending' | 'paid'
  escrowHeld: boolean
  paymentAmount: number | null
  reasonForVisit: string
  patientConfirmedDone: boolean
  doctorConfirmedDone: boolean
  cancelReason: string | null
  dismissedByDoctor: boolean
  doctorReminderSentAt: Timestamp | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export interface DoctorProfile {       // users/{uid}
  uid: string
  email: string
  fullName: string
  role: string
  phone: string
  registrationNumber: string
  stateOfRegistration: string
  specialities: string[]
}

export interface DoctorRecord {         // doctors/{uid}
  uid: string
  heldPayoutAmount: number
  razorpayAccountStatus: string         // 'not_setup' | 'pending_approval' | 'active'
  bankAccountNumberMasked: string
}

export interface ConsultationSettings { // doctors/{uid}/consultationSettings/settings
  fee: number
  slotDuration: number
  workingDays: string[]
  startTime: string
  endTime: string
  clinicName: string
  clinicAddress: string
  clinicLocation: GeoPoint | null
  isAcceptingAppointments: boolean
}

export interface CreatedPatient {        // doctors/{uid}/createdPatients/{patientGroupID}
  id: string                            // == patientGroupID
  name: string
  email: string
  phone: string
  gender: string
  age: number | null
  weight: number | null
  weightUnit: string
  height: number | null
  heightUnit: string | null
  hasAddedDoctor: boolean
  createdByDoctor: boolean
  createdAt: Timestamp | null
}

export interface DoctorNote {            // .../createdPatients/{pg}/notes/{id}
  id: string
  diagnosis: string
  notes: string
  followUp: string
  doctorUID: string
  doctorName: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export interface FinanceSummary {        // doctors/{uid}/finance/summary
  totalGrossVolume: number
  totalRevenue: number
  totalRefunds: number
  totalUmcCommission: number
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  outstandingPenalty: number
  totalPenaltiesLevied: number
  totalPenaltiesSettled: number
  byMonth: Record<string, { revenue?: number; refunds?: number; umcCommission?: number; orders?: number }>
}

export interface FinanceTransaction {    // doctors/{uid}/finance/transactions/records/{id}
  id: string
  type: string            // 'payout_released' | 'cancellation_compensation' | 'payout_held'
  orderId: string
  grossAmount: number
  netAmount: number
  umcCommission: number
  penaltyDeducted: number
  status: string
  releaseMode: string
  createdAt: Timestamp | null
}

export interface PenaltyRecord {         // doctors/{uid}/finance/{pending|completed}/records/{id}
  id: string
  orderId: string
  penaltyAmount: number
  umcFee: number
  status: string          // 'calculated' (pending) | 'settled' (completed)
  createdAt: Timestamp | null
}
```

- [ ] **Step 2: Verify build**

Run from `portal/`: `npm run build` — Expected: success.

- [ ] **Step 3: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal && git commit -m "feat(portal/data): doctor TypeScript models"
```

---

## Task 4: Pure mappers (TDD)

**Files:**
- Create: `portal/src/roles/doctor/data/mappers.ts`, `portal/src/roles/doctor/data/mappers.test.ts`

Pure functions `(id, DocumentData) -> typed object`, with safe defaults for missing fields (Firestore docs are sparse). These are the testable heart of the read layer.

- [ ] **Step 1: Write the failing test**

Create `portal/src/roles/doctor/data/mappers.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mapAppointment, mapCreatedPatient, mapNote, mapFinanceSummary, mapPenalty } from './mappers'

describe('mapAppointment', () => {
  it('maps fields and the doc id', () => {
    const a = mapAppointment('appt1', {
      doctorUID: 'd1', patientUID: 'p1', status: 'confirmed',
      date: '2026-06-20', timeSlot: '09:30', fee: 500, escrowHeld: true,
    })
    expect(a.id).toBe('appt1')
    expect(a.status).toBe('confirmed')
    expect(a.fee).toBe(500)
    expect(a.escrowHeld).toBe(true)
  })
  it('applies safe defaults for missing fields', () => {
    const a = mapAppointment('x', {})
    expect(a.patientConfirmedDone).toBe(false)
    expect(a.cancelReason).toBeNull()
    expect(a.paymentAmount).toBeNull()
    expect(a.fee).toBe(0)
  })
})

describe('mapCreatedPatient', () => {
  it('uses doc id as patientGroupID and defaults numbers to null', () => {
    const p = mapCreatedPatient('pg1', { name: 'Asha' })
    expect(p.id).toBe('pg1')
    expect(p.name).toBe('Asha')
    expect(p.age).toBeNull()
  })
})

describe('mapNote', () => {
  it('maps the three text fields', () => {
    const n = mapNote('n1', { diagnosis: 'HTN', notes: 'bp high', followUp: '2w' })
    expect(n).toMatchObject({ id: 'n1', diagnosis: 'HTN', notes: 'bp high', followUp: '2w' })
  })
})

describe('mapFinanceSummary', () => {
  it('defaults totals to 0 and byMonth to empty', () => {
    const f = mapFinanceSummary('summary', {})
    expect(f.totalRevenue).toBe(0)
    expect(f.byMonth).toEqual({})
  })
  it('preserves byMonth nested values', () => {
    const f = mapFinanceSummary('summary', { byMonth: { '2026_06': { revenue: 1200 } } })
    expect(f.byMonth['2026_06'].revenue).toBe(1200)
  })
})

describe('mapPenalty', () => {
  it('maps penalty fields', () => {
    const p = mapPenalty('pen1', { orderId: 'o1', penaltyAmount: 500, umcFee: 0, status: 'calculated' })
    expect(p).toMatchObject({ id: 'pen1', orderId: 'o1', penaltyAmount: 500, status: 'calculated' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `portal/`: `npm run test -- src/roles/doctor/data/mappers.test.ts`
Expected: FAIL — cannot find module `./mappers`.

- [ ] **Step 3: Write the implementation**

Create `portal/src/roles/doctor/data/mappers.ts`:
```ts
import type { Timestamp } from 'firebase/firestore'
import type {
  Appointment, AppointmentStatus, CreatedPatient, DoctorNote,
  FinanceSummary, FinanceTransaction, PenaltyRecord, ConsultationSettings,
  DoctorProfile, DoctorRecord,
} from './types'

type Data = Record<string, any>
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d)
const num = (v: unknown, d = 0) => (typeof v === 'number' ? v : d)
const numOrNull = (v: unknown) => (typeof v === 'number' ? v : null)
const bool = (v: unknown) => v === true
const ts = (v: unknown) => (v ?? null) as Timestamp | null

export function mapAppointment(id: string, d: Data): Appointment {
  return {
    id,
    doctorUID: str(d.doctorUID), doctorName: str(d.doctorName),
    patientUID: str(d.patientUID), patientName: str(d.patientName),
    patientGroupID: str(d.patientGroupID), patientPhone: str(d.patientPhone),
    date: str(d.date), timeSlot: str(d.timeSlot), slotDuration: num(d.slotDuration),
    fee: num(d.fee), clinicName: str(d.clinicName), clinicAddress: str(d.clinicAddress),
    status: (str(d.status, 'awaiting_doctor_confirmation') as AppointmentStatus),
    paymentStatus: str(d.paymentStatus, 'pending'), escrowHeld: bool(d.escrowHeld),
    paymentAmount: numOrNull(d.paymentAmount), reasonForVisit: str(d.reasonForVisit),
    patientConfirmedDone: bool(d.patientConfirmedDone), doctorConfirmedDone: bool(d.doctorConfirmedDone),
    cancelReason: typeof d.cancelReason === 'string' ? d.cancelReason : null,
    dismissedByDoctor: bool(d.dismissedByDoctor),
    doctorReminderSentAt: ts(d.doctorReminderSentAt),
    createdAt: ts(d.createdAt), updatedAt: ts(d.updatedAt),
  }
}

export function mapCreatedPatient(id: string, d: Data): CreatedPatient {
  return {
    id, name: str(d.name || d.fullName), email: str(d.email), phone: str(d.phone),
    gender: str(d.gender), age: numOrNull(d.age), weight: numOrNull(d.weight),
    weightUnit: str(d.weightUnit), height: numOrNull(d.height),
    heightUnit: typeof d.heightUnit === 'string' ? d.heightUnit : null,
    hasAddedDoctor: bool(d.hasAddedDoctor), createdByDoctor: bool(d.createdByDoctor),
    createdAt: ts(d.createdAt),
  }
}

export function mapNote(id: string, d: Data): DoctorNote {
  return {
    id, diagnosis: str(d.diagnosis), notes: str(d.notes), followUp: str(d.followUp),
    doctorUID: str(d.doctorUID), doctorName: str(d.doctorName),
    createdAt: ts(d.createdAt), updatedAt: ts(d.updatedAt),
  }
}

export function mapFinanceSummary(_id: string, d: Data): FinanceSummary {
  return {
    totalGrossVolume: num(d.totalGrossVolume), totalRevenue: num(d.totalRevenue),
    totalRefunds: num(d.totalRefunds), totalUmcCommission: num(d.totalUmcCommission),
    totalOrders: num(d.totalOrders), completedOrders: num(d.completedOrders),
    cancelledOrders: num(d.cancelledOrders), outstandingPenalty: num(d.outstandingPenalty),
    totalPenaltiesLevied: num(d.totalPenaltiesLevied), totalPenaltiesSettled: num(d.totalPenaltiesSettled),
    byMonth: (d.byMonth && typeof d.byMonth === 'object') ? d.byMonth : {},
  }
}

export function mapTransaction(id: string, d: Data): FinanceTransaction {
  return {
    id, type: str(d.type), orderId: str(d.orderId), grossAmount: num(d.grossAmount),
    netAmount: num(d.netAmount), umcCommission: num(d.umcCommission),
    penaltyDeducted: num(d.penaltyDeducted), status: str(d.status),
    releaseMode: str(d.releaseMode), createdAt: ts(d.createdAt),
  }
}

export function mapPenalty(id: string, d: Data): PenaltyRecord {
  return {
    id, orderId: str(d.orderId), penaltyAmount: num(d.penaltyAmount),
    umcFee: num(d.umcFee), status: str(d.status), createdAt: ts(d.createdAt),
  }
}

export function mapConsultationSettings(_id: string, d: Data): ConsultationSettings {
  return {
    fee: num(d.fee), slotDuration: num(d.slotDuration, 30),
    workingDays: Array.isArray(d.workingDays) ? d.workingDays : [],
    startTime: str(d.startTime), endTime: str(d.endTime),
    clinicName: str(d.clinicName), clinicAddress: str(d.clinicAddress),
    clinicLocation: d.clinicLocation ?? null,
    isAcceptingAppointments: bool(d.isAcceptingAppointments),
  }
}

export function mapDoctorProfile(id: string, d: Data): DoctorProfile {
  return {
    uid: id, email: str(d.email), fullName: str(d.fullName || d.name), role: str(d.role),
    phone: str(d.phone), registrationNumber: str(d.registrationNumber),
    stateOfRegistration: str(d.stateOfRegistration),
    specialities: Array.isArray(d.specialities) ? d.specialities.map(String) : [],
  }
}

export function mapDoctorRecord(id: string, d: Data): DoctorRecord {
  return {
    uid: id, heldPayoutAmount: num(d.heldPayoutAmount),
    razorpayAccountStatus: str(d.razorpayAccountStatus, 'not_setup'),
    bankAccountNumberMasked: str(d.bankAccountNumberMasked),
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `portal/`: `npm run test -- src/roles/doctor/data/mappers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal && git commit -m "feat(portal/data): pure Firestore mappers + tests"
```

---

## Task 5: Pure id/key helpers (TDD)

**Files:**
- Create: `portal/src/roles/doctor/data/ids.ts`, `portal/src/roles/doctor/data/ids.test.ts`

The appointment slot-lock doc id must match the app's format exactly, or cancellations won't free the slot.

- [ ] **Step 1: Write the failing test**

Create `portal/src/roles/doctor/data/ids.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { slotLockId } from './ids'

describe('slotLockId', () => {
  it('joins doctorUID, date, timeSlot with underscores', () => {
    expect(slotLockId('d1', '2026-06-20', '09:30')).toBe('d1_2026-06-20_09:30')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run from `portal/`: `npm run test -- src/roles/doctor/data/ids.test.ts` — Expected: FAIL (no module).

- [ ] **Step 3: Implement**

Create `portal/src/roles/doctor/data/ids.ts`:
```ts
// Mirrors the Flutter app's appointment_locks doc id: `{doctorUID}_{date}_{timeSlot}`.
export function slotLockId(doctorUID: string, date: string, timeSlot: string): string {
  return `${doctorUID}_${date}_${timeSlot}`
}
```

- [ ] **Step 4: Run to verify it passes**

Run from `portal/`: `npm run test -- src/roles/doctor/data/ids.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal && git commit -m "feat(portal/data): slotLockId helper + test"
```

---

## Task 6: Read hooks

**Files:**
- Create: `useDoctorProfile.ts`, `useAppointments.ts`, `useConsultationSettings.ts`, `usePatients.ts`, `usePatientNotes.ts`, `useFinance.ts` (all under `portal/src/roles/doctor/data/`)

Each hook resolves the current doctor uid from `useAuth().user`, builds a ref/query, and delegates to the generic hooks with the right mapper. Queries mirror the app exactly; per the app's convention, status filtering/sorting is done client-side in the pages, not in the query.

- [ ] **Step 1: Doctor profile + record**

Create `portal/src/roles/doctor/data/useDoctorProfile.ts`:
```ts
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
```

- [ ] **Step 2: Appointments**

Create `portal/src/roles/doctor/data/useAppointments.ts`:
```ts
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
```

- [ ] **Step 3: Consultation settings**

Create `portal/src/roles/doctor/data/useConsultationSettings.ts`:
```ts
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
```

- [ ] **Step 4: Patients + notes**

Create `portal/src/roles/doctor/data/usePatients.ts`:
```ts
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
```

Create `portal/src/roles/doctor/data/usePatientNotes.ts`:
```ts
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
```

- [ ] **Step 5: Finance (summary + transactions + pending + completed)**

Create `portal/src/roles/doctor/data/useFinance.ts`:
```ts
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
```

- [ ] **Step 6: Verify build**

Run from `portal/`: `npm run build` — Expected: success.

- [ ] **Step 7: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal && git commit -m "feat(portal/data): doctor read hooks (profile, appointments, settings, patients, notes, finance)"
```

---

## Task 7: Appointment actions

**Files:**
- Create: `portal/src/roles/doctor/data/appointmentActions.ts`

Each function reproduces the Flutter method's exact writes. `processCancellation` is a `us-central1` callable. Cancel/reject/no-show also remove the slot lock and release the patient–doctor guard, exactly as the app does.

- [ ] **Step 1: Create the actions**

Create `portal/src/roles/doctor/data/appointmentActions.ts`:
```ts
import {
  doc, updateDoc, deleteDoc, getDoc, runTransaction, serverTimestamp,
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
```

- [ ] **Step 2: Verify build**

Run from `portal/`: `npm run build` — Expected: success.

- [ ] **Step 3: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal && git commit -m "feat(portal/data): appointment lifecycle actions (confirm/done/reject/cancel/no-show/dismiss)"
```

---

## Task 8: Finance, settings, and notes actions

**Files:**
- Create: `portal/src/roles/doctor/data/financeActions.ts`, `settingsActions.ts`, `noteActions.ts`

- [ ] **Step 1: Penalty settle action**

Create `portal/src/roles/doctor/data/financeActions.ts`:
```ts
import { auth } from '../../../shared/lib/firebase'
import { callable } from '../../../shared/data/callable'

const settle = callable<
  { doctorId: string; penaltyRecordId: string },
  { success: boolean; alreadyDone: boolean; total: number; penaltyId: string }
>('settleDoctorPenaltyManually')

// Server requires request.auth.uid === doctorId — pass the current uid.
export async function settlePenalty(penaltyRecordId: string) {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Not signed in')
  return settle({ doctorId: uid, penaltyRecordId })
}
```

- [ ] **Step 2: Consultation settings save**

Create `portal/src/roles/doctor/data/settingsActions.ts`:
```ts
import { doc, setDoc, serverTimestamp, GeoPoint } from 'firebase/firestore'
import { db, auth } from '../../../shared/lib/firebase'

export interface SaveSettingsInput {
  fee: number
  slotDuration: number
  workingDays: string[]
  startTime: string
  endTime: string
  clinicName: string
  clinicAddress: string
  isAcceptingAppointments: boolean
  clinicLatitude?: number | null
  clinicLongitude?: number | null
}

// Mirrors saveConsultationSettings: set(..., { merge: true }); clinicLocation only when both coords present.
export async function saveConsultationSettings(input: SaveSettingsInput): Promise<void> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Not signed in')
  const data: Record<string, unknown> = {
    fee: input.fee, slotDuration: input.slotDuration, workingDays: input.workingDays,
    startTime: input.startTime, endTime: input.endTime, clinicName: input.clinicName,
    clinicAddress: input.clinicAddress, isAcceptingAppointments: input.isAcceptingAppointments,
    updatedAt: serverTimestamp(),
  }
  if (input.clinicLatitude != null && input.clinicLongitude != null) {
    data.clinicLocation = new GeoPoint(input.clinicLatitude, input.clinicLongitude)
  }
  await setDoc(doc(db, 'doctors', uid, 'consultationSettings', 'settings'), data, { merge: true })
}
```

- [ ] **Step 3: Notes create/update**

Create `portal/src/roles/doctor/data/noteActions.ts`:
```ts
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '../../../shared/lib/firebase'

export interface NoteInput { diagnosis: string; notes: string; followUp: string; doctorName: string }

function notesCol(patientGroupID: string) {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Not signed in')
  return collection(db, 'doctors', uid, 'createdPatients', patientGroupID, 'notes')
}

// Mirrors medical_notes_screen create (.add) — createdAt + updatedAt are serverTimestamps.
export async function createNote(patientGroupID: string, input: NoteInput): Promise<void> {
  const uid = auth.currentUser!.uid
  await addDoc(notesCol(patientGroupID), {
    diagnosis: input.diagnosis.trim(), notes: input.notes.trim(), followUp: input.followUp.trim(),
    doctorUID: uid, doctorName: input.doctorName,
    updatedAt: serverTimestamp(), createdAt: serverTimestamp(),
  })
}

// Mirrors edit (.update) — no createdAt on update.
export async function updateNote(patientGroupID: string, noteId: string, input: NoteInput): Promise<void> {
  const uid = auth.currentUser!.uid
  await updateDoc(doc(notesCol(patientGroupID), noteId), {
    diagnosis: input.diagnosis.trim(), notes: input.notes.trim(), followUp: input.followUp.trim(),
    doctorUID: uid, doctorName: input.doctorName, updatedAt: serverTimestamp(),
  })
}
```

- [ ] **Step 4: Verify build + run full test suite**

Run from `portal/`:
```bash
npm run build      # Expected: success
npm run test       # Expected: all tests pass (8 from Phase 1 + mappers + ids)
```

- [ ] **Step 5: Commit**

```bash
cd /Users/anandkammasmacbook/StudioProjects/UMC-Website
git add portal && git commit -m "feat(portal/data): finance settle, settings save, notes create/update actions"
```

---

## Task 9: Live smoke verification (MANUAL)

Hooks and actions are integration code; verify against the real backend before Phase 3 builds UI on them.

- [ ] **Step 1: Temporary read probe**

In `HomePage.tsx` (doctor), temporarily render counts from the hooks:
```tsx
import { useDoctorAppointments } from '../data/useAppointments'
import { useFinanceSummary } from '../data/useFinance'
// inside the component:
const appts = useDoctorAppointments()
const fin = useFinanceSummary()
return <pre>{JSON.stringify({ appts: appts.data.length, loading: appts.loading,
  revenue: fin.data?.totalRevenue, err: appts.error?.message }, null, 2)}</pre>
```

- [ ] **Step 2: Run and observe**

`cd portal && npm run dev`, sign in as the doctor test account (`iyYwg9woPdg6OiTTFBaROF6zrL13`). Expected: `loading` flips to false, `appts` shows a count (>0 if that doctor has appointments), `revenue` is a number, `err` is undefined. A `Missing or insufficient permissions` error means a Firestore rule needs checking for that path.

- [ ] **Step 3: (Optional) action probe**

If there is a safe, disposable appointment in `awaiting_doctor_confirmation`, wire a temporary button to `confirmAppointment(id)` and confirm the status flips live (the list updates via onSnapshot). Do NOT test cancel/no-show on real patient appointments — those move money and notify patients.

- [ ] **Step 4: Revert the probe**

Restore `HomePage.tsx` to its stub. The probe is verification scaffolding, not shipped code.

- [ ] **Step 5: Commit (only if HomePage was left changed intentionally)**

Normally nothing to commit here (probe reverted).

---

## Phase 2 Done — Definition of Done

- `npm run test` passes (Phase 1 tests + mappers + ids).
- `npm run build` green.
- Every doctor read surface has a typed hook; every appointment-lifecycle / settings / notes action has a function that mirrors the Flutter app's exact writes and Cloud Function calls (all `us-central1`).
- Smoke test confirms live reads work for a signed-in doctor.
- Components still import nothing from `firebase` directly — only these hooks/actions.

**Next:** Phase 3 — wire the doctor pages (Schedule, Patients, Notes, Finance, Settings, Home) to these hooks/actions with plain styling. Phase 3a adds the create flows (create patient, prescribe medication, order diagnostics) — field schemas are in the spec/handoff.
