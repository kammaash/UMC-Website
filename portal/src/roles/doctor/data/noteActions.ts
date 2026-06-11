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
