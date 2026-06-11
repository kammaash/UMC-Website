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
