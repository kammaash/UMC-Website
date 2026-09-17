import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from 'firebase/auth'
import { RemindersPage } from './RemindersPage'
import * as AuthModule from '../../shared/auth/AuthContext'
import * as claimActions from './data/reminderClaim'

vi.mock('./data/reminderAuth', () => ({
  sendOtp: vi.fn(), confirmOtp: vi.fn(), resetOtp: vi.fn(), signOutReminders: vi.fn(),
}))
vi.mock('./data/reminderClaim', () => ({
  previewClaim: vi.fn(), claimGroup: vi.fn(), usersDocExists: vi.fn(),
  deleteOrphanAccount: vi.fn().mockResolvedValue(undefined), signOutExisting: vi.fn().mockResolvedValue(undefined),
}))

const patientB = { uid: 'u1', phoneNumber: '+917799440022' } as unknown as User

function renderWith(authValue: Partial<ReturnType<typeof AuthModule.useAuth>>) {
  vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
    status: 'signed-out', user: null, profile: null,
    ...authValue,
  } as ReturnType<typeof AuthModule.useAuth>)
  return render(<RemindersPage />)
}

beforeEach(() => { vi.clearAllMocks() })

describe('RemindersPage — sign-in shell', () => {
  it('shows only a loading line until the auth state is known', () => {
    renderWith({ status: 'unknown' })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('Continue with phone →')).not.toBeInTheDocument()
  })
  it('offers phone sign-in when signed out', () => {
    renderWith({ status: 'signed-out' })
    expect(screen.getByText('Your medicine reminders')).toBeInTheDocument()
    expect(screen.getByText('Continue with phone →')).toBeInTheDocument()
  })
})

describe('RemindersPage — claim step', () => {
  it('previews with no arguments and shows the confirm card with patient + doctor', async () => {
    vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: true, groupId: 'G1', patientName: 'Patient B', doctorName: 'Ranganath', isPrimary: true })
    renderWith({ status: 'signed-in', user: patientB, profile: null })
    expect(await screen.findByText('Is this you?')).toBeInTheDocument()
    expect(screen.getByText('Patient B')).toBeInTheDocument()
    expect(screen.getByText(/Set up by Dr Ranganath/)).toBeInTheDocument()
    expect(claimActions.previewClaim).toHaveBeenCalledTimes(1)
    expect(claimActions.claimGroup).not.toHaveBeenCalled()
  })
  it('claims only after "Yes, that\'s me" and then shows the set-up screen', async () => {
    vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: true, groupId: 'G1', patientName: 'Patient B', doctorName: '', isPrimary: true })
    vi.mocked(claimActions.claimGroup).mockResolvedValue({ ok: true, groupId: 'G1', fullName: 'Patient B' })
    renderWith({ status: 'signed-in', user: patientB, profile: null })
    await userEvent.click(await screen.findByText("Yes, that's me →"))
    expect(claimActions.claimGroup).toHaveBeenCalledWith('G1')
    expect(await screen.findByText("You're set up, Patient")).toBeInTheDocument()
  })
  it('surfaces a claimGroup failure with a retry', async () => {
    vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: true, groupId: 'G1', patientName: 'Patient B', isPrimary: true })
    vi.mocked(claimActions.claimGroup).mockRejectedValue({ code: 'functions/permission-denied' })
    renderWith({ status: 'signed-in', user: patientB, profile: null })
    await userEvent.click(await screen.findByText("Yes, that's me →"))
    expect(await screen.findByText(/not for your phone number/)).toBeInTheDocument()
    expect(screen.getByText('Try again →')).toBeInTheDocument()
  })
  it('no match + no users doc → deletes the orphan account (never signOut only)', async () => {
    vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: false })
    vi.mocked(claimActions.usersDocExists).mockResolvedValue(false)
    renderWith({ status: 'signed-in', user: patientB, profile: null })
    await waitFor(() => expect(claimActions.deleteOrphanAccount).toHaveBeenCalledTimes(1))
    expect(claimActions.signOutExisting).not.toHaveBeenCalled()
    expect(claimActions.claimGroup).not.toHaveBeenCalled()
  })
  it('no match + existing users doc → plain sign-out, account untouched', async () => {
    vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: false })
    vi.mocked(claimActions.usersDocExists).mockResolvedValue(true)
    renderWith({ status: 'signed-in', user: patientB, profile: { role: 'patient' } })
    await waitFor(() => expect(claimActions.signOutExisting).toHaveBeenCalledTimes(1))
    expect(claimActions.deleteOrphanAccount).not.toHaveBeenCalled()
  })
  it('no match + unreadable users doc → fails safe to sign-out', async () => {
    vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: false })
    vi.mocked(claimActions.usersDocExists).mockRejectedValue(new Error('offline'))
    renderWith({ status: 'signed-in', user: patientB, profile: null })
    await waitFor(() => expect(claimActions.signOutExisting).toHaveBeenCalledTimes(1))
    expect(claimActions.deleteOrphanAccount).not.toHaveBeenCalled()
  })
  it('a returning patient (users doc has patientGroupID) skips the confirm card', async () => {
    vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: false })
    renderWith({ status: 'signed-in', user: patientB, profile: { role: 'patient', patientGroupID: 'G0', fullName: 'Patient B' } })
    expect(await screen.findByText("You're set up, Patient")).toBeInTheDocument()
    expect(claimActions.claimGroup).not.toHaveBeenCalled()
    expect(claimActions.usersDocExists).not.toHaveBeenCalled()
  })
})
