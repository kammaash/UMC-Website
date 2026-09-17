import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from 'firebase/auth'
import { RemindersPage } from './RemindersPage'
import * as AuthModule from '../../shared/auth/AuthContext'
import * as claimActions from './data/reminderClaim'
import * as pushActions from './data/reminderPush'

vi.mock('./data/reminderAuth', () => ({
  sendOtp: vi.fn(), confirmOtp: vi.fn(), resetOtp: vi.fn(), signOutReminders: vi.fn(),
}))
vi.mock('./data/reminderClaim', () => ({
  previewClaim: vi.fn(), claimGroup: vi.fn(), usersDocExists: vi.fn(),
  deleteOrphanAccount: vi.fn().mockResolvedValue(undefined), signOutExisting: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./data/useTodayDoses', () => ({
  useTodayDoses: vi.fn(() => ({ loading: false, error: null, doses: [], zone: 'Asia/Kolkata', dateLabel: 'Thu, 17 Sept', nowMinutes: 600 })),
}))
vi.mock('./data/reminderDoses', () => ({ markDoseTaken: vi.fn() }))

vi.mock('./data/reminderPush', () => ({
  currentPlatform: vi.fn(), pushSupported: vi.fn().mockResolvedValue(true), permissionState: vi.fn(),
  requestPermission: vi.fn(), registerPushToken: vi.fn().mockResolvedValue(undefined),
  listenForeground: vi.fn(() => () => {}), installPwaHead: vi.fn(),
  PushSetupError: class extends Error { constructor(public reason: string) { super(reason) } },
}))

const patientB = { uid: 'u1', phoneNumber: '+917799440022' } as unknown as User
const ANDROID = { os: 'android', iosVersion: null, standalone: false, gate: 'ok', tokenPlatform: 'android-chrome' } as const
const IOS_TAB = { os: 'ios', iosVersion: [17, 5], standalone: false, gate: 'ios-add-to-home', tokenPlatform: 'other' } as const
const claimedProfile = { role: 'patient', patientGroupID: 'G0', fullName: 'Patient B' }

function renderWith(authValue: Partial<ReturnType<typeof AuthModule.useAuth>>) {
  vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
    status: 'signed-out', user: null, profile: null,
    ...authValue,
  } as ReturnType<typeof AuthModule.useAuth>)
  return render(<RemindersPage />)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(pushActions.currentPlatform).mockReturnValue(ANDROID)
  vi.mocked(pushActions.pushSupported).mockResolvedValue(true)
  vi.mocked(pushActions.permissionState).mockReturnValue('default')
  vi.mocked(pushActions.registerPushToken).mockResolvedValue(undefined)
})

describe('RemindersPage — sign-in shell', () => {
  it('shows only a loading line until the auth state is known', () => {
    renderWith({ status: 'unknown' })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('Continue with phone')).not.toBeInTheDocument()
  })
  it('offers phone sign-in when signed out', () => {
    renderWith({ status: 'signed-out' })
    expect(screen.getByText('Your medicine reminders')).toBeInTheDocument()
    expect(screen.getByText('Continue with phone')).toBeInTheDocument()
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
    await userEvent.click(await screen.findByText("Yes, that's me"))
    expect(claimActions.claimGroup).toHaveBeenCalledWith('G1')
    expect(await screen.findByText("You're set up, Patient")).toBeInTheDocument()
  })
  it('surfaces a claimGroup failure with a retry', async () => {
    vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: true, groupId: 'G1', patientName: 'Patient B', isPrimary: true })
    vi.mocked(claimActions.claimGroup).mockRejectedValue({ code: 'functions/permission-denied' })
    renderWith({ status: 'signed-in', user: patientB, profile: null })
    await userEvent.click(await screen.findByText("Yes, that's me"))
    expect(await screen.findByText(/not for your phone number/)).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
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

describe('RemindersPage — push registration (claimed screen)', () => {
  it('permission not yet asked → "Allow reminders" button; tap asks, then registers with the gid + platform', async () => {
    vi.mocked(pushActions.requestPermission).mockResolvedValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await userEvent.click(await screen.findByText('Allow reminders'))
    expect(pushActions.requestPermission).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(pushActions.registerPushToken).toHaveBeenCalledWith('G0', 'android-chrome'))
    expect(await screen.findByText(/Reminders are on/)).toBeInTheDocument()
  })
  it('permission already granted → registers silently on open (refreshes lastSeenAt), no button', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await waitFor(() => expect(pushActions.registerPushToken).toHaveBeenCalledWith('G0', 'android-chrome'))
    expect(pushActions.requestPermission).not.toHaveBeenCalled()
    expect(screen.queryByText('Allow reminders')).not.toBeInTheDocument()
  })
  it('permission refused at the prompt → blocked message, no registration', async () => {
    vi.mocked(pushActions.requestPermission).mockResolvedValue('denied')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await userEvent.click(await screen.findByText('Allow reminders'))
    expect(await screen.findByText(/Notifications are blocked/)).toBeInTheDocument()
    expect(pushActions.registerPushToken).not.toHaveBeenCalled()
  })
  it('registration failure → message with retry', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    vi.mocked(pushActions.registerPushToken).mockRejectedValue(new Error('boom'))
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    expect(await screen.findByText(/Couldn't turn on reminders/)).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })
  it('iPhone in a browser tab → Add to Home Screen steps instead of the button', async () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS_TAB)
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    expect(await screen.findByText(/Add to Home Screen/)).toBeInTheDocument()
    expect(screen.queryByText('Allow reminders')).not.toBeInTheDocument()
    expect(pushActions.registerPushToken).not.toHaveBeenCalled()
  })
})

describe('RemindersPage — iPhone gate before sign-in', () => {
  it('shows the Add to Home Screen steps on the welcome screen, sign-in still available', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS_TAB)
    renderWith({ status: 'signed-out' })
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument()
    expect(screen.getByText(/sign in there/)).toBeInTheDocument()
    expect(screen.getByText('Continue with phone')).toBeInTheDocument()
  })
  it('does not show the steps on Android', () => {
    renderWith({ status: 'signed-out' })
    expect(screen.queryByText(/Add to Home Screen/)).not.toBeInTheDocument()
  })
})

describe('RemindersPage — today\'s doses on the claimed screen', () => {
  it('renders the dose list once claimed (empty state here)', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    expect(await screen.findByText(/No medicines are scheduled for today/)).toBeInTheDocument()
  })
})
