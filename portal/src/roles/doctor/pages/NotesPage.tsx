import { useMemo, useState } from 'react'
import { Page, PageHeader, Button, Field, EmptyState, Loading, Modal } from '../../../shared/design/primitives'
import { Icon } from '../../../shared/design/icons'
import { useAuth } from '../../../shared/auth/AuthContext'
import { usePatients } from '../data/usePatients'
import { usePatientNotes } from '../data/usePatientNotes'
import { createNote, updateNote, type NoteInput } from '../data/noteActions'
import { formatTimestamp } from './format'
import type { DoctorNote } from '../data/types'

/*
 * Doctor Medical Notes — web port of medical_notes_screen.dart (Notes tab only).
 * Notes are scoped per patient (doctors/{uid}/createdPatients/{pg}/notes) and
 * update live via the usePatientNotes onSnapshot subscription.
 * Consumes only the doctor data hooks/actions — never imports firebase directly.
 *
 * NOTE: the phone app's voice-note dictation (VoiceNoteInput → AI structuring)
 * is out of scope for the web portal; the create/edit form is text-entry only.
 */

/* A labelled note sub-section: small colored icon + label, then serif content. */
function NoteSection({ icon, label, color, content }: {
  icon: string; label: string; color: string; content: string
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        border: `1px solid color-mix(in srgb, ${color} 16%, transparent)`,
        background: 'color-mix(in srgb, var(--card) 72%, transparent)',
      }}
    >
      <div className="umc-flex" style={{ gap: 6 }}>
        <Icon name={icon} size={14} color={color} />
        <span style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 700, color }}>{label}</span>
      </div>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)', lineHeight: 1.5, margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>
        {content}
      </p>
    </div>
  )
}

function NoteCard({ note, onEdit }: { note: DoctorNote; onEdit: () => void }) {
  const hasAny = note.diagnosis || note.notes || note.followUp
  return (
    <div className="umc-card">
      <div className="umc-flex" style={{ justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-faint)' }}>
          {formatTimestamp(note.createdAt)}
        </span>
        <Button variant="ghost" sm icon={<Icon name="edit" size={16} />} onClick={onEdit}>
          Edit
        </Button>
      </div>
      {hasAny && (
        <div className="umc-stack" style={{ marginTop: 14, gap: 12 }}>
          {note.diagnosis && (
            <NoteSection icon="description" label="Diagnosis" color="#42A5F5" content={note.diagnosis} />
          )}
          {note.notes && (
            <NoteSection icon="description" label="Notes" color="#9E9E9E" content={note.notes} />
          )}
          {note.followUp && (
            <NoteSection icon="checkCircle" label="Follow-up" color="#4CAF50" content={note.followUp} />
          )}
        </div>
      )}
    </div>
  )
}

interface DraftState { open: boolean; note: DoctorNote | null }

function NoteModal({ patientGroupID, patientName, doctorName, editing, onClose }: {
  patientGroupID: string
  patientName: string
  doctorName: string
  editing: DoctorNote | null
  onClose: () => void
}) {
  const [diagnosis, setDiagnosis] = useState(editing?.diagnosis ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [followUp, setFollowUp] = useState(editing?.followUp ?? '')
  const [showError, setShowError] = useState(false)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    const input: NoteInput = {
      diagnosis: diagnosis.trim(), notes: notes.trim(), followUp: followUp.trim(), doctorName,
    }
    if (!input.diagnosis && !input.notes && !input.followUp) {
      setShowError(true)
      return
    }
    setBusy(true)
    try {
      if (editing) await updateNote(patientGroupID, editing.id, input)
      else await createNote(patientGroupID, input)
      onClose() // list refreshes live via onSnapshot
    } catch {
      setBusy(false)
    }
  }

  return (
    <Modal title={editing ? 'Edit Note' : 'Add Note'} subtitle={patientName} onClose={onClose}>
      <div className="umc-stack" style={{ gap: 16 }}>
        <Field label="Diagnosis / Condition">
          <input
            className="umc-input"
            placeholder="e.g., Hypertension, Type 2 Diabetes"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
          />
        </Field>
        <Field label="Notes / Observations">
          <textarea
            className="umc-textarea"
            placeholder="Clinical observations, symptoms, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <Field label="Follow-up Instructions">
          <textarea
            className="umc-textarea"
            placeholder="Next steps, lifestyle changes, etc."
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
          />
        </Field>
        {showError && (
          <p style={{ fontFamily: 'var(--sans)', fontSize: 12, fontStyle: 'italic', color: 'var(--error-400)', margin: 0 }}>
            Fill at least one field
          </p>
        )}
        <Button full loading={busy} onClick={save}>
          {editing ? 'Update Note' : 'Save Note'}
        </Button>
      </div>
    </Modal>
  )
}

export function NotesPage() {
  const { profile } = useAuth()
  const doctorName = profile?.fullName ?? ''

  const { data: patients, loading: patientsLoading } = usePatients()
  const [selectedId, setSelectedId] = useState<string>('')
  const { data: notes, loading: notesLoading } = usePatientNotes(selectedId || null)

  const [draft, setDraft] = useState<DraftState>({ open: false, note: null })

  const patientName = useMemo(
    () => patients.find((p) => p.id === selectedId)?.name ?? '',
    [patients, selectedId],
  )

  if (patientsLoading) return <Loading />

  return (
    <Page>
      <PageHeader
        eyebrow="Medical Notes"
        title="Notes"
        subtitle="Diagnoses, observations, and follow-ups per patient."
        action={
          <Button
            icon={<Icon name="plus" size={18} />}
            disabled={!selectedId}
            onClick={() => setDraft({ open: true, note: null })}
          >
            New note
          </Button>
        }
      />

      <Field label="Patient">
        <select
          className="umc-select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">Select a patient…</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Field>

      <div style={{ marginTop: 24 }}>
        {!selectedId ? (
          <EmptyState
            icon={<Icon name="person" size={64} />}
            title="Select a patient to view notes"
            subtitle="Pick a patient above to see their diagnoses, observations, and follow-ups."
          />
        ) : notesLoading ? (
          <Loading />
        ) : notes.length === 0 ? (
          <EmptyState
            icon={<Icon name="description" size={64} />}
            title="No notes yet"
            subtitle="Tap “New note” to add the first one."
          />
        ) : (
          <div className="umc-stack">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} onEdit={() => setDraft({ open: true, note })} />
            ))}
          </div>
        )}
      </div>

      {draft.open && selectedId && (
        <NoteModal
          patientGroupID={selectedId}
          patientName={patientName}
          doctorName={doctorName}
          editing={draft.note}
          onClose={() => setDraft({ open: false, note: null })}
        />
      )}
    </Page>
  )
}
