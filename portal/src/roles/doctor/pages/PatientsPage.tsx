import { useMemo, useState } from 'react'
import {
  Page, PageHeader, SectionHeading, Card, Button, EmptyState, Loading,
} from '../../../shared/design/primitives'
import { Icon } from '../../../shared/design/icons'
import { formatTimestamp } from './format'
import type { CreatedPatient } from '../data/types'
import { usePatients } from '../data/usePatients'
import { usePatientNotes } from '../data/usePatientNotes'

/* ── helpers ───────────────────────────────────────────────────── */

function initialOf(name: string): string {
  const t = (name ?? '').trim()
  return t ? t.charAt(0).toUpperCase() : '?'
}

/** Mirror patient_details_view.dart `_formatHeight`. */
function formatHeight(height: number | null, unit: string | null): string | null {
  if (height == null) return null
  const h = Math.trunc(height)
  const u = (unit ?? 'CM').toUpperCase()
  if (u === 'FT') {
    const feet = Math.trunc(h / 12)
    const inches = h % 12
    return `${feet}' ${inches}"`
  }
  return `${h} cm`
}

/** Mirror patient_details_view.dart `_demographicsLine` — omits missing parts. */
function demographicsLine(p: CreatedPatient): string {
  const parts: string[] = []
  if (p.age != null) parts.push(`${p.age} yrs`)
  if (p.gender && p.gender.length > 0) parts.push(p.gender)
  const h = formatHeight(p.height, p.heightUnit)
  if (h) parts.push(h)
  if (p.weight != null) {
    const wu = (p.weightUnit || 'kg').toLowerCase()
    parts.push(`${p.weight} ${wu}`)
  }
  return parts.join(' · ')
}

/** Subtitle for the list tile: phone › email › demographics. */
function listSubtitle(p: CreatedPatient): string {
  if (p.phone && p.phone.length > 0) return p.phone
  if (p.email && p.email.length > 0) return p.email
  const demo = demographicsLine(p)
  return demo || 'No contact info'
}

const AVATAR_GRADIENT = 'linear-gradient(135deg, #d6d6d6 0%, #b8b8b8 100%)'

function Avatar({ name, size }: { name: string; size: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: 999, flexShrink: 0,
        background: AVATAR_GRADIENT,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--serif)', fontSize: size * 0.4, color: '#fff',
      }}
    >
      {initialOf(name)}
    </div>
  )
}

/* ── page ──────────────────────────────────────────────────────── */

export function PatientsPage() {
  const { data: patients, loading } = usePatients()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return patients
    return patients.filter((p) => (p.name ?? '').toLowerCase().includes(q))
  }, [patients, search])

  const selected = useMemo(
    () => (selectedId ? patients.find((p) => p.id === selectedId) ?? null : null),
    [patients, selectedId],
  )

  if (loading) return <Loading />

  return (
    <Page>
      <PageHeader
        eyebrow="My Patients"
        title="Patients"
        subtitle="People you've added or who have added you."
      />

      {selected
        ? <PatientDetail patient={selected} onBack={() => setSelectedId(null)} />
        : (
          <>
            <input
              className="umc-input"
              placeholder="Search patients"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {filtered.length === 0
              ? (
                <EmptyState
                  icon={<Icon name="people" size={64} />}
                  title="No patients yet"
                  subtitle="Patients who add you, or that you create, will appear here."
                />
              )
              : (
                <div className="umc-stack" style={{ marginTop: 20 }}>
                  {filtered.map((p) => (
                    <Card key={p.id} pressable onClick={() => setSelectedId(p.id)}>
                      <div className="umc-flex">
                        <Avatar name={p.name} size={44} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {p.name || 'Unnamed patient'}
                          </div>
                          <div style={{
                            fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-soft)',
                            marginTop: 2,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {listSubtitle(p)}
                          </div>
                        </div>
                        {/* status dot: green when the patient has added this doctor, else grey */}
                        <span style={{
                          width: 8, height: 8, borderRadius: 999, flexShrink: 0,
                          background: p.hasAddedDoctor ? '#4CAF50' : 'rgba(158,158,158,.5)',
                        }} />
                        <span style={{ color: 'var(--ink-faint)', display: 'flex' }}>
                          <Icon name="chevronRight" size={22} />
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
          </>
        )}
    </Page>
  )
}

/* ── detail view ───────────────────────────────────────────────── */

function PatientDetail({ patient, onBack }: { patient: CreatedPatient; onBack: () => void }) {
  const { data: notes, loading: notesLoading } = usePatientNotes(patient.id)
  const noteCount = notes.length
  const demo = demographicsLine(patient)

  const hasPhone = !!(patient.phone && patient.phone.length > 0)
  const hasEmail = !!(patient.email && patient.email.length > 0)

  return (
    <>
      <Button sm variant="ghost" icon={<Icon name="arrowBack" size={18} />} onClick={onBack}>
        All patients
      </Button>

      {/* Hero card */}
      <Card style={{ marginTop: 16 }}>
        <div className="umc-flex" style={{ alignItems: 'center', gap: 18 }}>
          <Avatar name={patient.name} size={80} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--serif)', fontSize: 30, color: 'var(--ink)', lineHeight: 1.1,
            }}>
              {patient.name || 'Unnamed patient'}
            </div>
            {demo && (
              <div style={{
                fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink-soft)', marginTop: 6,
              }}>
                {demo}
              </div>
            )}
          </div>
        </div>

        {/* Contact pills — tel:/mailto:/sms: when available, else disabled-looking */}
        <div className="umc-flex" style={{ marginTop: 18, flexWrap: 'wrap', gap: 10 }}>
          <ContactPill icon="phone" label="Call" href={hasPhone ? `tel:${patient.phone}` : undefined} />
          <ContactPill icon="mail" label="Email" href={hasEmail ? `mailto:${patient.email}` : undefined} />
          <ContactPill icon="message" label="Message" href={hasPhone ? `sms:${patient.phone}` : undefined} />
        </div>
      </Card>

      {/* Quick stats */}
      <div className="umc-grid c3" style={{ marginTop: 16 }}>
        <QuickStat value={String(noteCount)} label="Notes" />
        {/* Meds & Tests are not surfaced in this portal yet — placeholder until a later phase. */}
        <QuickStat value="—" label="Meds" />
        <QuickStat value="—" label="Tests" />
      </div>

      {/* Notes */}
      <div style={{ marginTop: 28 }}>
        <SectionHeading>Notes</SectionHeading>
        {notesLoading
          ? <Loading />
          : noteCount === 0
            ? <EmptyState icon={<Icon name="description" size={64} />} title="No notes yet" />
            : (
              <div className="umc-stack">
                {notes.map((n) => (
                  <Card key={n.id} section>
                    {n.diagnosis && (
                      <div style={{
                        fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600, color: 'var(--ink)',
                      }}>
                        {n.diagnosis}
                      </div>
                    )}
                    {n.notes && (
                      <div style={{
                        fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink-soft)', marginTop: 6,
                      }}>
                        {n.notes}
                      </div>
                    )}
                    {n.followUp && (
                      <div style={{
                        fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink)', marginTop: 8,
                      }}>
                        <span style={{ color: 'var(--ink-faint)' }}>Follow-up: </span>
                        {n.followUp}
                      </div>
                    )}
                    {formatTimestamp(n.createdAt) && (
                      <div style={{
                        fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-faint)', marginTop: 10,
                      }}>
                        {formatTimestamp(n.createdAt)}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
      </div>

      {/*
        Deferred to a later phase (do NOT build here):
        create-patient, add-medication, and order-diagnostics flows.
        This page is a read-only master-detail over usePatients / usePatientNotes.
      */}
    </>
  )
}

function ContactPill({ icon, label, href }: { icon: string; label: string; href?: string }) {
  const content = (
    <>
      <Icon name={icon} size={16} />
      {label}
    </>
  )
  if (!href) {
    return <Button sm variant="ghost" disabled>{content}</Button>
  }
  return (
    <a href={href} style={{ textDecoration: 'none' }}>
      <Button sm variant="ghost">{content}</Button>
    </a>
  )
}

function QuickStat({ value, label }: { value: string; label: string }) {
  return (
    <Card>
      <div className="umc-stat">
        <span className="umc-stat-val">{value}</span>
        <span className="umc-stat-lab">{label}</span>
      </div>
    </Card>
  )
}
