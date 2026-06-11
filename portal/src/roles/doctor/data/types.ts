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
