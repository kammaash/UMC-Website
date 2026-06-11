// Mirrors the Flutter app's appointment_locks doc id: `{doctorUID}_{date}_{timeSlot}`.
export function slotLockId(doctorUID: string, date: string, timeSlot: string): string {
  return `${doctorUID}_${date}_${timeSlot}`
}
