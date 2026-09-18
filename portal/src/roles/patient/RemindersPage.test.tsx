import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from 'firebase/auth'
import { RemindersPage } from './RemindersPage'
import * as AuthModule from '../../shared/auth/AuthContext'
import * as claimActions from './data/reminderClaim'
import * as pushActions from './data/reminderPush'
import * as authActions from './data/reminderAuth'
import { formatIndianPhone } from './data/phoneFormat'

vi.mock('./data/reminderAuth', () => ({
  sendOtp: vi.fn(), confirmOtp: vi.fn(), resetOtp: vi.fn(), signOutReminders: vi.fn(),
}))
vi.mock('./data/reminderClaim', () => ({
  previewClaim: vi.fn(), claimGroup: vi.fn(), usersDocExists: vi.fn(),
  deleteOrphanAccount: vi.fn().mockResolvedValue(undefined), signOutExisting: vi.fn().mockResolvedValue(undefined),
  syncPatientName: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./data/useTodayDoses', () => ({
  useTodayDoses: vi.fn(() => ({ loading: false, error: null, doses: [], zone: 'Asia/Kolkata', dateLabel: 'Thu, 17 Sept', nowMinutes: 600 })),
}))
vi.mock('./data/reminderDoses', () => ({ markDoseTaken: vi.fn() }))
// The phone's 1s hold is tested in InstallPanel.test.tsx; here the Apple
// panel opens at once.
vi.mock('./setupTiming', () => ({ SETUP_HOLD_MS: 0 }))
// The name→avatar sequence's own timing (incl. the 8s hold) is tested in
// useGreetingMorph.test.ts. Here the hold is 0 by default, so the avatar is
// reachable at once; tests about the "You're set up, <name>" heading call
// holdGreeting() so the name stays put while they look at it. A hoisted
// object rather than plain values, so a test can change it.
const morphTiming = vi.hoisted(() => ({ GREETING_HOLD_MS: 0, MORPH_MS: 0, CORNER_HOLD_MS: 0, PEEK_HOLD_MS: 0 }))
vi.mock('./greetingMorphTiming', () => morphTiming)
const holdGreeting = () => { morphTiming.GREETING_HOLD_MS = 999_999 }
// The 1s hold and the scroll are RevealSetup's own (RevealSetup.test.tsx);
// here it only marks where it wraps.
vi.mock('./RevealSetup', () => ({
  RevealSetup: ({ children }: { children: React.ReactNode }) => <div data-reveal="">{children}</div>,
}))

vi.mock('./data/reminderPush', () => ({
  currentPlatform: vi.fn(), pushSupported: vi.fn().mockResolvedValue(true), permissionState: vi.fn(),
  requestPermission: vi.fn(), registerPushToken: vi.fn().mockResolvedValue('registered'),
  deactivatePushToken: vi.fn().mockResolvedValue(undefined),
  listenForeground: vi.fn(() => () => {}), installPwaHead: vi.fn(),
  PushSetupError: class extends Error { constructor(public reason: string) { super(reason) } },
}))

const patientB = { uid: 'u1', phoneNumber: '+917799440022' } as unknown as User
const ANDROID = { os: 'android', browser: 'chromium', safariVersion: null, iosVersion: null, standalone: false, gate: 'ok', tokenPlatform: 'android-chrome' } as const
const IOS_TAB = { os: 'iphone', browser: 'safari', safariVersion: 17, iosVersion: [17, 5], standalone: false, gate: 'ios-add-to-home', tokenPlatform: 'other' } as const
const IPAD_TAB = { ...IOS_TAB, os: 'ipad' } as const
const MAC_TAB = { os: 'mac', browser: 'safari', safariVersion: 26, iosVersion: null, standalone: false, gate: 'ios-add-to-home', tokenPlatform: 'other' } as const
const MAC_CHROME_TAB = { ...MAC_TAB, browser: 'chromium', safariVersion: null } as const
const IOS26_TAB = { ...IOS_TAB, safariVersion: 26, iosVersion: [18, 6] } as const
const IPAD26_TAB = { ...IOS26_TAB, os: 'ipad' } as const
const IOS_CHROME_TAB = { ...IOS_TAB, browser: 'chromium', safariVersion: null } as const

// the number on the arrow, and the text of the step with that number
const arrowStep = () => document.querySelector<HTMLElement>('.umc-sketch')?.dataset.step ?? null
const stepText = (n: string) => screen.getAllByRole('listitem')[Number(n) - 1].textContent ?? ''
// the symbols drawn inside step n, e.g. ['more', 'share']
const glyphsIn = (n: number) => [...screen.getAllByRole('listitem')[n - 1].querySelectorAll<HTMLElement>('[data-glyph]')].map((g) => g.dataset.glyph)
const tipGlyph = () => document.querySelector<SVGElement>('.umc-sketch [data-glyph]')?.dataset.glyph ?? null

const arrowAt = () => document.querySelector('.umc-sketch')?.getAttribute('data-at') ?? null
const claimedProfile = { role: 'patient', patientGroupID: 'G0', fullName: 'Patient B' }

function renderWith(authValue: Partial<ReturnType<typeof AuthModule.useAuth>>) {
  vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
    status: 'signed-out', user: null, profile: null,
    ...authValue,
  } as ReturnType<typeof AuthModule.useAuth>)
  return render(<RemindersPage />)
}

beforeEach(() => {
  morphTiming.GREETING_HOLD_MS = 0
  vi.clearAllMocks()
  sessionStorage.clear()
  localStorage.clear()
  vi.mocked(pushActions.currentPlatform).mockReturnValue(ANDROID)
  vi.mocked(pushActions.pushSupported).mockResolvedValue(true)
  vi.mocked(pushActions.permissionState).mockReturnValue('default')
  vi.mocked(pushActions.registerPushToken).mockResolvedValue('registered')
  vi.mocked(pushActions.deactivatePushToken).mockResolvedValue(undefined)
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

  it('lets the code be verified after the phone step succeeds (modal remounts on step change)', async () => {
    const user = userEvent.setup()
    vi.mocked(authActions.sendOtp).mockResolvedValue(undefined)
    renderWith({ status: 'signed-out' })

    await user.click(screen.getByText('Continue with phone'))
    await user.type(screen.getByRole('textbox'), '9999900001')
    await user.click(screen.getByRole('button', { name: /send code/i }))

    const verify = await screen.findByRole('button', { name: /verify/i })
    const boxes = screen.getAllByRole('textbox')
    for (const [i, box] of boxes.entries()) await user.type(box, String(i))

    // The phone-step submit leaves PhoneOtp's internal `submitting` state
    // true (by design, to keep the spinner through the step change); only a
    // remount (via `key={otpStep}` on OtpModal) clears it. Without that key,
    // this button stays stuck disabled/spinning forever.
    await waitFor(() => expect(verify).toBeEnabled())
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
  it('however the doctor typed the name, the confirm card and the heading show it title-cased', async () => {
    holdGreeting() // looks at the heading while the name is still in it
    vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: true, groupId: 'G1', patientName: 'PATIENT VIJAY KUMAR', doctorName: '', isPrimary: true })
    vi.mocked(claimActions.claimGroup).mockResolvedValue({ ok: true, groupId: 'G1', fullName: 'PATIENT VIJAY KUMAR' })
    renderWith({ status: 'signed-in', user: patientB, profile: null })
    expect(await screen.findByText('Patient vijay Kumar')).toBeInTheDocument()
    await userEvent.click(screen.getByText("Yes, that's me"))
    expect(await screen.findByRole('heading', { name: "You're set up, Patient vijay Kumar" })).toBeInTheDocument()
  })
  it('claims only after "Yes, that\'s me" and then shows the set-up screen', async () => {
    holdGreeting() // looks at the heading while the name is still in it
    vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: true, groupId: 'G1', patientName: 'Patient B', doctorName: '', isPrimary: true })
    vi.mocked(claimActions.claimGroup).mockResolvedValue({ ok: true, groupId: 'G1', fullName: 'Patient B' })
    renderWith({ status: 'signed-in', user: patientB, profile: null })
    await userEvent.click(await screen.findByText("Yes, that's me"))
    expect(claimActions.claimGroup).toHaveBeenCalledWith('G1')
    expect(await screen.findByRole('heading', { name: "You're set up, Patient B" })).toBeInTheDocument()
    // claimGroup's own response never persists a name — the page fills it in.
    expect(claimActions.syncPatientName).toHaveBeenCalledWith('u1', undefined, 'Patient B')
  })
  it('"Not me" on the confirm card cleans up the still-orphan account, never just signs out blindly', async () => {
    vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: true, groupId: 'G1', patientName: 'Patient B', doctorName: '', isPrimary: true })
    vi.mocked(claimActions.usersDocExists).mockResolvedValue(false)
    renderWith({ status: 'signed-in', user: patientB, profile: null })
    await userEvent.click(await screen.findByText('Not me — sign out'))
    await waitFor(() => expect(claimActions.deleteOrphanAccount).toHaveBeenCalledTimes(1))
    expect(claimActions.signOutExisting).not.toHaveBeenCalled()
    expect(claimActions.claimGroup).not.toHaveBeenCalled()
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
  it('no match + no users doc → the full-screen "not registered" takeover shows, not a plain banner', async () => {
    vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: false })
    vi.mocked(claimActions.usersDocExists).mockResolvedValue(false)
    renderWith({ status: 'signed-in', user: patientB, profile: null })
    expect(await screen.findByText('Uh oh!')).toBeInTheDocument()
    expect(screen.getByText(/app where you'll be able to register yourself/)).toBeInTheDocument()
    const dismiss = screen.getByRole('button', { name: 'Understood' })
    await userEvent.click(dismiss)
    expect(screen.queryByText('Uh oh!')).not.toBeInTheDocument()
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
  it('a returning patient (users doc has patientGroupID) skips the confirm card and is welcomed back', async () => {
    holdGreeting() // looks at the heading while the name is still in it
    vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: false })
    renderWith({ status: 'signed-in', user: patientB, profile: { role: 'patient', patientGroupID: 'G0', fullName: 'Patient B' } })
    expect(await screen.findByRole('heading', { name: 'Welcome back, Patient B' })).toBeInTheDocument()
    expect(claimActions.claimGroup).not.toHaveBeenCalled()
    expect(claimActions.usersDocExists).not.toHaveBeenCalled()
  })
  it('a returning patient with a stale/missing name gets it filled in from the lookup, best-effort', async () => {
    holdGreeting() // looks at the heading while the name is still in it
    vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: true, groupId: 'G0', patientName: 'Patient B', isPrimary: true })
    renderWith({ status: 'signed-in', user: patientB, profile: { role: 'patient', patientGroupID: 'G0' } })
    await screen.findByText('Welcome back')
    expect(claimActions.syncPatientName).toHaveBeenCalledWith('u1', '', 'Patient B')
  })
})

describe('RemindersPage — signing out and back in', () => {
  it('the next sign-in says "Welcome back", and the name moves to the corner again', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: true, groupId: 'G1', patientName: 'Patient B', doctorName: '', isPrimary: true })
    vi.mocked(claimActions.claimGroup).mockResolvedValue({ ok: true, groupId: 'G1', fullName: 'Patient B' })
    // first time: claims via the confirm card, runs through to the avatar
    const { rerender } = renderWith({ status: 'signed-in', user: patientB, profile: null })
    await userEvent.click(await screen.findByText("Yes, that's me"))
    expect(await screen.findByRole('heading', { name: 'Reminders' })).toBeInTheDocument()
    await screen.findByRole('button', { name: 'Account details' })

    // signs out: nothing of theirs is left in the header on the sign-in screen
    vi.mocked(AuthModule.useAuth).mockReturnValue({ status: 'signed-out', user: null, profile: null } as ReturnType<typeof AuthModule.useAuth>)
    rerender(<RemindersPage />)
    expect(await screen.findByText('Continue with phone')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Account details' })).not.toBeInTheDocument()
    expect(document.querySelector('.umc-rem-status')).toBeNull()

    // signs back in (their users doc now carries the claimed group)
    holdGreeting()
    vi.mocked(AuthModule.useAuth).mockReturnValue({ status: 'signed-in', user: patientB, profile: claimedProfile } as ReturnType<typeof AuthModule.useAuth>)
    rerender(<RemindersPage />)
    expect(await screen.findByRole('heading', { name: 'Welcome back, Patient B' })).toBeInTheDocument()
    expect(screen.queryByText("Yes, that's me")).not.toBeInTheDocument() // no confirm card again
  })
  it('the name leaves "Welcome back" for the corner, leaving "Reminders"', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    expect(await screen.findByRole('heading', { name: 'Reminders' })).toBeInTheDocument()
    expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument()
  })
})

describe('RemindersPage — the number lives in Account details, not on the dashboard', () => {
  it('never shows "Your number" on the claimed screen (settled or not) — the account sheet has it', async () => {
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByRole('button', { name: /Enable Reminders/ }) // not settled yet
    expect(screen.queryByText('Your number')).not.toBeInTheDocument()
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByText(/Reminders are on/) // settled
    expect(screen.queryByText('Your number')).not.toBeInTheDocument()
  })
})

describe('RemindersPage — push registration (claimed screen)', () => {
  it('permission not yet asked → "Allow reminders" button; tap asks, then registers with the gid + platform', async () => {
    vi.mocked(pushActions.requestPermission).mockResolvedValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByRole('button', { name: /Enable Reminders/ })
    await userEvent.click(screen.getByRole('button', { name: /Enable Reminders/ }))
    expect(pushActions.requestPermission).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(pushActions.registerPushToken).toHaveBeenCalledWith('G0', 'android-chrome'))
    expect(await screen.findByText(/Reminders are on/)).toBeInTheDocument()
  })
  it('permission already granted → registers silently on open (refreshes lastSeenAt), no button', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await waitFor(() => expect(pushActions.registerPushToken).toHaveBeenCalledWith('G0', 'android-chrome'))
    expect(pushActions.requestPermission).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /Enable Reminders/ })).not.toBeInTheDocument()
  })
  it('permission refused at the prompt → blocked message, no registration', async () => {
    vi.mocked(pushActions.requestPermission).mockResolvedValue('denied')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByRole('button', { name: /Enable Reminders/ })
    await userEvent.click(screen.getByRole('button', { name: /Enable Reminders/ }))
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
  it('the app has taken reminders over → says so, never claims reminders are on here', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    vi.mocked(pushActions.registerPushToken).mockResolvedValue('app-owns')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    expect(await screen.findByText(/reminders come from the UMC app/)).toBeInTheDocument()
    expect(screen.queryByText(/Reminders are on/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Enable Reminders/ })).not.toBeInTheDocument()
    // The page is still the patient's way to check and mark doses.
    expect(screen.getByText(/No medicines are scheduled for today/)).toBeInTheDocument()
  })
  it('iPhone in a browser tab → Add to Home Screen steps instead of the button', async () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS_TAB)
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    expect(await screen.findByText(/Add to Home Screen/)).toBeInTheDocument()
    // the steps may NAME the button (the Allow step does); it must not BE here
    expect(screen.queryByRole('button', { name: /Enable Reminders/ })).not.toBeInTheDocument()
    expect(pushActions.registerPushToken).not.toHaveBeenCalled()
  })
})

// The live status light beside the header's corner avatar — a passive
// readout of the same PushState the banners/steps above already render,
// so it is checked against those states rather than owning any of its own.
describe('RemindersPage — live reminders-status badge', () => {
  const badge = () => document.querySelector('.umc-rem-status')
  it('stays hidden until push has resolved one way or the other', async () => {
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByRole('button', { name: /Enable Reminders/ }) // Android ask steps — not yet answered
    expect(badge()).toBeNull()
  })
  it('reminders enabled → green, labelled on', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByText(/Reminders are on/)
    expect(badge()).toHaveClass('is-on')
    expect(badge()).not.toHaveClass('is-off')
    expect(badge()).toHaveAttribute('title', 'Reminders are on')
  })
  it('the app owns reminders instead → still green (this phone is still covered)', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    vi.mocked(pushActions.registerPushToken).mockResolvedValue('app-owns')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByText(/reminders come from the UMC app/)
    expect(badge()).toHaveClass('is-on')
  })
  it('notifications blocked → red, labelled off', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('denied')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByText(/Notifications are blocked/)
    expect(badge()).toHaveClass('is-off')
    expect(badge()).not.toHaveClass('is-on')
    expect(badge()).toHaveAttribute('title', 'Reminders are off')
  })
  it('gated onto an iPhone tab (no push in a plain tab) → red', async () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS_TAB)
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByText(/Add to Home Screen/)
    expect(badge()).toHaveClass('is-off')
  })
  it('steps aside (fades, not just slides — the peeked name can be any length) while the avatar is peeked, so the two never overlap', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    const avatarBtn = await screen.findByRole('button', { name: 'Account details' })
    expect(badge()).not.toHaveClass('is-peeked')
    await userEvent.hover(avatarBtn)
    expect(badge()).toHaveClass('is-peeked')
    await userEvent.unhover(avatarBtn)
    expect(badge()).not.toHaveClass('is-peeked')
  })
  it('peeking the avatar reveals the full name, not just the initial the resting corner label uses', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    const avatarBtn = await screen.findByRole('button', { name: 'Account details' })
    await userEvent.hover(avatarBtn)
    expect(document.querySelector('.umc-rem-corner-name.is-peek')?.textContent).toBe('Patient B')
  })
})

describe('RemindersPage — Android notification steps (claimed screen)', () => {
  it('shows every step at once — no Next, no Done — ending on the button that opens the prompt', async () => {
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByRole('button', { name: /Enable Reminders/ })
    const steps = screen.getAllByRole('listitem').map((li) => li.textContent ?? '')
    expect(steps).toHaveLength(3)
    expect(steps[1]).toMatch(/Allow/)
    expect(steps[2]).toMatch(/ask once more/)
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Done/ })).toBeNull()
    expect(screen.queryByText(/Step \d of/)).toBeNull()
    expect(pushActions.requestPermission).not.toHaveBeenCalled()
  })
  it('prompt dismissed without an answer → steps stay, the button can be tapped again', async () => {
    vi.mocked(pushActions.requestPermission).mockResolvedValue('default')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByRole('button', { name: /Enable Reminders/ })
    await userEvent.click(screen.getByRole('button', { name: /Enable Reminders/ }))
    expect(await screen.findByRole('button', { name: /Enable Reminders/ })).toBeInTheDocument()
    expect(pushActions.registerPushToken).not.toHaveBeenCalled()
  })
  it('blocked → site-settings steps, ending on a re-check', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('denied')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByText(/Notifications are blocked/)
    const steps = screen.getAllByRole('listitem').map((li) => li.textContent ?? '')
    expect(steps[0]).toMatch(/left of the web address/)
    expect(steps[1]).toMatch(/Notifications/)
    expect(steps[2]).toMatch(/Settings.*Apps/)
    expect(screen.getByRole('button', { name: "I've turned them on" })).toBeInTheDocument()
  })
  it('re-check after unblocking → registers', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('denied')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByText(/Notifications are blocked/)
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    await userEvent.click(screen.getByRole('button', { name: "I've turned them on" }))
    await waitFor(() => expect(pushActions.registerPushToken).toHaveBeenCalledWith('G0', 'android-chrome'))
    expect(await screen.findByText(/Reminders are on/)).toBeInTheDocument()
  })
  it('re-check while still blocked → says so, no registration', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('denied')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByText(/Notifications are blocked/)
    await userEvent.click(screen.getByRole('button', { name: "I've turned them on" }))
    expect(await screen.findByText(/Still blocked\. Check/)).toBeInTheDocument()
    expect(pushActions.registerPushToken).not.toHaveBeenCalled()
  })
  it('coming back from Settings with notifications allowed → registers without a tap', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('denied')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByText(/Notifications are blocked/)
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    await waitFor(() => expect(pushActions.registerPushToken).toHaveBeenCalledWith('G0', 'android-chrome'))
  })
  it('elsewhere (not Android) keeps the plain button', async () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue({ ...ANDROID, os: 'other', tokenPlatform: 'other' })
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    expect(await screen.findByRole('button', { name: /Enable Reminders/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })
})

// After sign-in there is no Done (decision 2026-09-19): "You're all set!"
// plays only once a tap has actually switched reminders on — permission
// granted and the token saved — then folds itself away.
describe('RemindersPage — "You\'re all set!" once reminders are confirmed on', () => {
  afterEach(() => { vi.useRealTimers() })
  it('Android: Enable Reminders → Allow → saved → all set, then it folds away', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldAdvanceTime: true })
    vi.mocked(pushActions.requestPermission).mockResolvedValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    const tap = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await tap.click(await screen.findByRole('button', { name: /Enable Reminders/ }))
    expect(await screen.findByText("You're all set!")).toBeInTheDocument()
    expect(pushActions.registerPushToken).toHaveBeenCalledWith('G0', 'android-chrome')
    act(() => { vi.advanceTimersByTime(4000) })
    expect(screen.queryByText("You're all set!")).toBeNull()
    expect(screen.getByText('Reminders are on.')).toBeInTheDocument()
  })
  it('the plain button (installed iPhone app, desktop) celebrates too', async () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue({ ...ANDROID, os: 'other', tokenPlatform: 'other' })
    vi.mocked(pushActions.requestPermission).mockResolvedValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await userEvent.click(await screen.findByRole('button', { name: /Enable Reminders/ }))
    expect(await screen.findByText("You're all set!")).toBeInTheDocument()
  })
  it('not before the save is confirmed — a failed save shows the error, no celebration', async () => {
    vi.mocked(pushActions.requestPermission).mockResolvedValue('granted')
    vi.mocked(pushActions.registerPushToken).mockRejectedValue(new Error('boom'))
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await userEvent.click(await screen.findByRole('button', { name: /Enable Reminders/ }))
    expect(await screen.findByText(/Couldn't turn on reminders/)).toBeInTheDocument()
    expect(screen.queryByText("You're all set!")).toBeNull()
  })
  it('never on the silent refresh a returning patient gets on open', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByText('Reminders are on.')
    expect(screen.queryByText("You're all set!")).toBeNull()
  })
  it('never when the UMC app owns reminders here', async () => {
    vi.mocked(pushActions.requestPermission).mockResolvedValue('granted')
    vi.mocked(pushActions.registerPushToken).mockResolvedValue('app-owns')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await userEvent.click(await screen.findByRole('button', { name: /Enable Reminders/ }))
    await screen.findByText(/reminders come from the UMC app/)
    expect(screen.queryByText("You're all set!")).toBeNull()
  })
  it('the Home Screen steps shown after sign-in have no Done', async () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS26_TAB)
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByText(/Add to Home Screen/)
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.queryByRole('button', { name: /Done/ })).toBeNull()
  })
})

describe('RemindersPage — the setup section arrives on its own on phones', () => {
  it('Android: the notification steps pop in by themselves', async () => {
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByRole('button', { name: /Enable Reminders/ })
    expect(document.querySelector('[data-reveal] .umc-install-card')).not.toBeNull()
  })
  it('iPhone/iPad morph out of the pill instead — never wrapped', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS26_TAB)
    renderWith({ status: 'signed-out' })
    expect(document.querySelector('.umc-install-card')).not.toBeNull()
    expect(document.querySelector('[data-reveal]')).toBeNull()
  })
  it('a Mac gets its steps straight away, in place', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(MAC_TAB)
    renderWith({ status: 'signed-out' })
    expect(document.querySelector('.umc-install-card')).not.toBeNull()
    expect(document.querySelector('[data-reveal]')).toBeNull()
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

// "Not you? Sign out" moved off the dashboard itself and into the account
// details sheet (decision 2026-09-19) — opened via the icon next to the greeting.
const openAccountSheet = async () => { await userEvent.click(await screen.findByRole('button', { name: 'Account details' })) }

describe('RemindersPage — sign-out turns this phone off', () => {
  it('turns the push token off BEFORE signing out (rules need uid == patient_uid)', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByText(/Reminders are on/)

    await openAccountSheet()
    await userEvent.click(screen.getByText('Not you? Sign out'))

    await waitFor(() => expect(authActions.signOutReminders).toHaveBeenCalledTimes(1))
    expect(pushActions.deactivatePushToken).toHaveBeenCalledWith('G0')
    expect(vi.mocked(pushActions.deactivatePushToken).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(authActions.signOutReminders).mock.invocationCallOrder[0])
  })

  it('refuses to sign out while the token is still on — the next patient on this phone would get these doses', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    vi.mocked(pushActions.deactivatePushToken).mockRejectedValue(new Error('offline'))
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByText(/Reminders are on/)

    await openAccountSheet()
    await userEvent.click(screen.getByText('Not you? Sign out'))

    expect(await screen.findByText(/Couldn't turn reminders off on this phone/)).toBeInTheDocument()
    expect(authActions.signOutReminders).not.toHaveBeenCalled()
  })

  it('does not touch the token when this browser never had reminders on', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('denied')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByText(/Notifications are blocked/)

    await openAccountSheet()
    await userEvent.click(screen.getByText('Not you? Sign out'))

    await waitFor(() => expect(authActions.signOutReminders).toHaveBeenCalledTimes(1))
    expect(pushActions.deactivatePushToken).not.toHaveBeenCalled()
  })
})

describe('RemindersPage — account details sheet', () => {
  it('shows name, phone and doctor, and opens/closes from the icon next to the greeting', async () => {
    vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: true, groupId: 'G1', patientName: 'Patient B', doctorName: 'Ranganath', isPrimary: true })
    vi.mocked(claimActions.claimGroup).mockResolvedValue({ ok: true, groupId: 'G1', fullName: 'Patient B' })
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: null })
    await userEvent.click(await screen.findByText("Yes, that's me"))

    expect(screen.queryByText('Account details')).not.toBeInTheDocument()
    await openAccountSheet()
    const sheet = screen.getByRole('dialog')
    expect(within(sheet).getByText('Account details')).toBeInTheDocument()
    expect(within(sheet).getByText('Patient B')).toBeInTheDocument()
    expect(within(sheet).getByText('Dr Ranganath')).toBeInTheDocument()
    expect(within(sheet).getByText(formatIndianPhone(patientB.phoneNumber))).toBeInTheDocument()

    await userEvent.click(within(sheet).getByText('Close'))
    expect(screen.queryByText('Account details')).not.toBeInTheDocument()
  })

  it('falls back to a dash when there is no doctor name to show (returning patient, preview blind to an already-claimed group)', async () => {
    vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: false })
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: { role: 'patient', patientGroupID: 'G0', fullName: 'Patient B' } })

    await openAccountSheet()
    expect(screen.getByText('Account details')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
  })
})

describe('RemindersPage — once settled: "Reminders", the corner initial, and the setup banner tucking away', () => {
  it('the heading becomes bare "Reminders" and the corner shows only the capitalised initial', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    expect(await screen.findByRole('heading', { name: 'Reminders' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Patient B/ })).not.toBeInTheDocument()
    // the corner's own name label (not the account sheet's, which isn't open)
    expect(document.querySelector('.umc-rem-corner-name')?.textContent).toBe('P')
  })

  it('reminders on → no banner at all, just the green light in the header (still announced to screen readers)', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    expect(await screen.findByRole('status')).toHaveTextContent('Reminders are on.')
    expect(screen.getByRole('status')).toHaveClass('umc-sr-only')
    expect(document.querySelector('.umc-rem-ok')).toBeNull()
    expect(document.querySelector('.umc-rem-setup-collapse')).toBeNull()
    expect(document.querySelector('.umc-rem-status')).toHaveClass('is-on')
  })
  it('the "UMC app owns reminders" note still collapses out of the way once settled', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    vi.mocked(pushActions.registerPushToken).mockResolvedValue('app-owns')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    await screen.findByText(/reminders come from the UMC app/)
    await waitFor(() => expect(document.querySelector('.umc-rem-setup-collapse')).toHaveClass('is-tucked'))
  })

  it('does not tuck away a denied/gated/erroring push state — those still need the patient', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('denied')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    expect(await screen.findByText(/Notifications are blocked/)).toBeInTheDocument()
    expect(document.querySelector('.umc-rem-setup-collapse')).toBeNull()
  })
})

describe('RemindersPage — today\'s doses on the claimed screen', () => {
  it('renders the dose list once claimed (empty state here)', async () => {
    vi.mocked(pushActions.permissionState).mockReturnValue('granted')
    renderWith({ status: 'signed-in', user: patientB, profile: claimedProfile })
    expect(await screen.findByText(/No medicines are scheduled for today/)).toBeInTheDocument()
  })
})

// Safari 26 moved things: Share went behind ⋯ on iPhone, behind More on iPad,
// and Add to Home Screen grew an "Open as Web App" switch — which, if off,
// makes a plain bookmark that can never receive a reminder.
// All the steps at once (decision 2026-09-18): the patient can read the whole
// route before Safari's share sheet covers the page. On iPhone and iPad,
// where to look and what to tap are one step.
describe('RemindersPage — the install steps are all on screen at once', () => {
  it('shows every step straight away, with no Next', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS26_TAB)
    renderWith({ status: 'signed-out' })
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
  })
  it.each([
    ['iPhone, Safari 26+', IOS26_TAB, 5],
    ['iPhone, older Safari', IOS_TAB, 4],
    ['iPad, Safari 26+', IPAD26_TAB, 5],
    ['iPad, older Safari', IPAD_TAB, 4],
  ] as const)('%s: where to look and what to tap are one step', (_, platform, count) => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(platform)
    renderWith({ status: 'signed-out' })
    expect(screen.getAllByRole('listitem')).toHaveLength(count)
    expect(stepText('1')).toMatch(/tap/i)
    expect(stepText('2')).not.toMatch(/tap the (⋯|Share) button/)
  })
  it('has a single Done in the footer', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS26_TAB)
    renderWith({ status: 'signed-out' })
    const done = screen.getByRole('button', { name: 'Done' })
    expect(done.closest('.umc-install-foot')).not.toBeNull()
    expect(done.closest('li')).toBeNull()
  })
  it('never says Continue — that word belongs to the sign-in button below', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS26_TAB)
    renderWith({ status: 'signed-out' })
    expect(screen.queryAllByRole('button', { name: /^Continue/ }).map((b) => b.textContent)).toEqual([expect.stringMatching(/Continue with phone/)])
  })
  it.each([
    ['iPhone, Safari 26+', IOS26_TAB],
    ['iPhone, older Safari', IOS_TAB],
    ['iPad, Safari 26+', IPAD26_TAB],
    ['iPad, older Safari', IPAD_TAB],
    ['Mac, Safari', MAC_TAB],
    ['Mac, Chrome', MAC_CHROME_TAB],
  ] as const)('%s: ends by tapping Allow on the notifications prompt', (_, platform) => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(platform)
    renderWith({ status: 'signed-out' })
    const last = screen.getAllByRole('listitem').at(-1)!.textContent ?? ''
    expect(last).toMatch(/Enable Reminders/)
    expect(last).toMatch(/Allow/)
  })
})

// Finishing the steps: Done → a short "You're all set!" → the panel folds
// itself away into the pill.
describe('RemindersPage — finishing the setup steps', () => {
  afterEach(() => { vi.useRealTimers() })
  const toLastStep = (platform: typeof IOS26_TAB) => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(platform)
    renderWith({ status: 'signed-out' })
  }
  it('Done says "You\'re all set!"', () => {
    toLastStep(IOS26_TAB)
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByRole('status')).toHaveTextContent("You're all set!")
  })
  it('then closes the steps by itself, leaving the pill to reopen them', () => {
    toLastStep(IOS26_TAB)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    act(() => { vi.advanceTimersByTime(4000) })
    expect(screen.queryByText("You're all set!")).toBeNull()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.getByRole('button', { name: /set up reminders/i })).toBeInTheDocument()
  })
})

// Sign-in waits until the steps have been gone through once — and says why.
describe('RemindersPage — Continue with phone waits for the setup steps', () => {
  afterEach(() => { vi.useRealTimers() })
  const signIn = () => screen.getByRole('button', { name: /Continue with phone/ })
  it('is greyed out, with the reason under it, while the steps are unfinished', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS26_TAB)
    renderWith({ status: 'signed-out' })
    expect(signIn()).toBeDisabled()
    expect(signIn()).toHaveAccessibleDescription(/setup steps above first/i)
  })
  it('opens up once Done is tapped', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS26_TAB)
    renderWith({ status: 'signed-out' })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(signIn()).toBeEnabled()
    expect(screen.queryByText(/setup steps above first/i)).toBeNull()
  })
  it('remembers, on a later visit, that the steps were gone through', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS26_TAB)
    localStorage.setItem('umc-install-done', '1')
    renderWith({ status: 'signed-out' })
    expect(signIn()).toBeEnabled()
  })
  it('is never held back where there are no setup steps (Android)', () => {
    renderWith({ status: 'signed-out' })
    expect(signIn()).toBeEnabled()
  })
  it('collapsing the panel does not count as going through it', async () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS26_TAB)
    renderWith({ status: 'signed-out' })
    await userEvent.click(screen.getByRole('button', { name: /hide these steps/i }))
    await screen.findByRole('button', { name: /set up reminders/i })
    expect(signIn()).toBeDisabled()
  })
})

describe('RemindersPage — the steps match the Safari in front of the patient', () => {
  it('iPhone, Safari 26+: ⋯ at the bottom right, then Share', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS26_TAB)
    renderWith({ status: 'signed-out' })
    expect(stepText('1')).toMatch(/bottom-right/i)
  })
  it('iPhone, Safari 26+: makes sure Open as Web App is on', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS26_TAB)
    renderWith({ status: 'signed-out' })
    expect(screen.getByText(/Open as Web App/)).toBeInTheDocument()
  })
  it('iPad, Safari 26+: Share, then More, and Open as Web App on', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IPAD26_TAB)
    renderWith({ status: 'signed-out' })
    expect(screen.getByText(/View More/)).toBeInTheDocument()
    expect(screen.getByText(/Open as Web App/)).toBeInTheDocument()
  })
  it('older Safari has no such switch, so it is never mentioned', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS_TAB)
    renderWith({ status: 'signed-out' })
    expect(screen.queryByText(/Open as Web App/)).not.toBeInTheDocument()
  })
})

// Each step shows the symbol it asks the patient to tap, next to its name —
// and the pencil line ends in a drawing of the one waiting at that edge.
describe('RemindersPage — the steps show the symbol to tap', () => {
  it('iPhone, Safari 26+: ⋯ and Share, then Add to Home Screen, then the Web App switch', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS26_TAB)
    renderWith({ status: 'signed-out' })
    expect(glyphsIn(1)).toEqual(['more', 'share', 'share'])
    expect(glyphsIn(2)).toEqual(['add-home'])
    expect(glyphsIn(3)).toEqual(['toggle'])
  })
  it('iPhone, older Safari: Share, then Add to Home Screen', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS_TAB)
    renderWith({ status: 'signed-out' })
    expect(glyphsIn(1)).toEqual(['share'])
    expect(glyphsIn(2)).toEqual(['add-home'])
  })
  it('iPad, Safari 26+: Share, then Add to Home Screen, then the Web App switch', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IPAD26_TAB)
    renderWith({ status: 'signed-out' })
    expect(glyphsIn(1)).toEqual(['share'])
    expect(glyphsIn(2)).toEqual(['add-home'])
    expect(glyphsIn(3)).toEqual(['toggle'])
  })
  it('Mac Chrome: the install icon', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(MAC_CHROME_TAB)
    renderWith({ status: 'signed-out' })
    expect(glyphsIn(2)).toContain('install')
  })
  it('the symbols are pictures of words already there, so screen readers skip them', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS26_TAB)
    renderWith({ status: 'signed-out' })
    const g = screen.getAllByRole('listitem')[1].querySelector('[data-glyph]')!
    expect(g.getAttribute('aria-hidden')).toBe('true')
  })
  it.each([
    ['iPhone, Safari 26+ — ⋯', IOS26_TAB, 'more'],
    ['iPhone, older Safari — Share', IOS_TAB, 'share'],
    ['iPad — Share', IPAD26_TAB, 'share'],
  ] as const)('%s: the line ends in a drawing of that symbol', (_, platform, glyph) => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(platform)
    renderWith({ status: 'signed-out' })
    expect(tipGlyph()).toBe(glyph)
  })
})

describe('RemindersPage — the install panel speaks each Apple device\'s language', () => {
  it('an iPhone is told to look at the BOTTOM of the screen', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS_TAB)
    renderWith({ status: 'signed-out' })
    expect(stepText('1')).toMatch(/bottom of Safari/i)
    expect(screen.queryByText(/top right/i)).not.toBeInTheDocument()
  })
  it('an iPad is told to look at the TOP RIGHT, not the bottom', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IPAD_TAB)
    renderWith({ status: 'signed-out' })
    expect(stepText('1')).toMatch(/top-right/i)
    expect(screen.queryByText(/bottom of your browser/i)).not.toBeInTheDocument()
  })
  it('a Mac gets Add to Dock, never Add to Home Screen', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(MAC_TAB)
    renderWith({ status: 'signed-out' })
    expect(screen.getByText(/Add to Dock/)).toBeInTheDocument()
    expect(screen.queryByText(/Add to Home Screen/)).not.toBeInTheDocument()
  })
  // The words have to send the patient where the arrow points — and on a Mac
  // that is a different corner in each browser.
  it('Mac Safari is sent up to the menu bar, and never told about Chrome', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(MAC_TAB)
    renderWith({ status: 'signed-out' })
    expect(screen.getByText(/menu bar at the very top left/i)).toBeInTheDocument()
    expect(screen.queryByText(/Install/)).not.toBeInTheDocument()
  })
  it('Mac Chrome is sent to the address bar, and never told about File → Add to Dock', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(MAC_CHROME_TAB)
    renderWith({ status: 'signed-out' })
    expect(screen.getByText(/right-hand end of the address bar/i)).toBeInTheDocument()
    expect(screen.queryByText(/Add to Dock/)).not.toBeInTheDocument()
  })
  it('Mac Firefox, which cannot install web apps, is sent to Safari instead', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue({ ...MAC_TAB, browser: 'firefox' })
    renderWith({ status: 'signed-out' })
    expect(screen.getByText(/open this page in Safari/i)).toBeInTheDocument()
    expect(arrowAt()).toBeNull()
  })
})

describe('RemindersPage — dismissing the install panel never strands the patient', () => {
  it('closing it hides the steps but leaves a way back in', async () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS_TAB)
    renderWith({ status: 'signed-out' })
    await userEvent.click(screen.getByRole('button', { name: /hide these steps/i }))
    // The panel shrinks out before it goes, so the pill is what settles first.
    expect(await screen.findByRole('button', { name: /set up reminders/i })).toBeInTheDocument()
    expect(screen.queryByText(/Add to Home Screen/)).not.toBeInTheDocument()
  })
  it('the way back in actually works', async () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS_TAB)
    renderWith({ status: 'signed-out' })
    await userEvent.click(screen.getByRole('button', { name: /hide these steps/i }))
    await userEvent.click(await screen.findByRole('button', { name: /set up reminders/i }))
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument()
  })
  it('a refresh in the same session keeps it collapsed, rather than nagging', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS_TAB)
    sessionStorage.setItem('umc-install-collapsed', '1')
    renderWith({ status: 'signed-out' })
    expect(screen.queryByText(/Add to Home Screen/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /set up reminders/i })).toBeInTheDocument()
  })
  it('sign-in stays reachable while the panel is collapsed', async () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS_TAB)
    renderWith({ status: 'signed-out' })
    await userEvent.click(screen.getByRole('button', { name: /hide these steps/i }))
    expect(await screen.findByRole('button', { name: /set up reminders/i })).toBeInTheDocument()
    expect(screen.getByText('Continue with phone')).toBeInTheDocument()
  })
})

// The arrow is the instruction, so it has to be pinned to the edge of the
// screen nearest the button — and carry the number of the step it is for.
describe('RemindersPage — the sketched arrow aims at the real button', () => {
  it('iPhone, older Safari: down at Share in the middle of the toolbar', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS_TAB)
    renderWith({ status: 'signed-out' })
    expect(arrowAt()).toBe('bottom-center')
  })
  it('iPhone, Safari 26+: down at ⋯, bottom right', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS26_TAB)
    renderWith({ status: 'signed-out' })
    expect(arrowAt()).toBe('bottom-right')
  })
  it('iPad: up at the top-right toolbar', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IPAD_TAB)
    renderWith({ status: 'signed-out' })
    expect(arrowAt()).toBe('top-right')
  })
  it('no arrow on a Mac, in any browser', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(MAC_TAB)
    renderWith({ status: 'signed-out' })
    expect(arrowAt()).toBeNull()
  })
  it('no arrow on a Mac in Chrome either', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(MAC_CHROME_TAB)
    renderWith({ status: 'signed-out' })
    expect(arrowAt()).toBeNull()
  })
  it('no arrow in Chrome on an iPhone, which is sent to Safari instead', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS_CHROME_TAB)
    renderWith({ status: 'signed-out' })
    expect(arrowAt()).toBeNull()
    expect(screen.getByText(/open this page in Safari/i)).toBeInTheDocument()
  })
  it.each([
    ['iPhone, older Safari', IOS_TAB, /Share/],
    ['iPhone, Safari 26+', IOS26_TAB, /⋯/],
    ['iPad, older Safari', IPAD_TAB, /Share/],
    ['iPad, Safari 26+', IPAD26_TAB, /Share/],
  ] as const)('%s: one line, from step 1 — the tap on the button — to that button', (_, platform, button) => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(platform)
    renderWith({ status: 'signed-out' })
    expect(arrowStep()).toBe('1')
    expect(stepText('1')).toMatch(button)
    // the later steps happen inside Safari's share sheet — nothing to point at
    expect(document.querySelectorAll('.umc-sketch')).toHaveLength(1)
  })
  // The line is drawn FROM the step's own bullet, so the bullet it is anchored
  // to has to be that step's — not merely a label claiming so.
  it('is anchored to the bullet of the very step it serves', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS26_TAB)
    renderWith({ status: 'signed-out' })
    const anchors = document.querySelectorAll('[data-sketch-anchor]')
    expect(anchors).toHaveLength(1)
    const li = anchors[0].closest('li')!
    expect(screen.getAllByRole('listitem').indexOf(li) + 1).toBe(Number(arrowStep()))
  })
  it('is drawn once when the panel opens — nothing on the page keeps looping it', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS26_TAB)
    renderWith({ status: 'signed-out' })
    expect(document.querySelector('.umc-sketch-trace')).toBeNull()
  })
  it('never covers the screen on Android, which has no button to point at', () => {
    renderWith({ status: 'signed-out' })
    expect(arrowAt()).toBeNull()
  })
  it('goes away with the steps when the panel is collapsed', async () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS_TAB)
    renderWith({ status: 'signed-out' })
    await userEvent.click(screen.getByRole('button', { name: /hide these steps/i }))
    expect(await screen.findByRole('button', { name: /set up reminders/i })).toBeInTheDocument()
    expect(arrowAt()).toBeNull()
  })
  it('is decoration for screen readers — the steps carry the meaning', () => {
    vi.mocked(pushActions.currentPlatform).mockReturnValue(IOS_TAB)
    renderWith({ status: 'signed-out' })
    expect(document.querySelector('.umc-sketch')?.getAttribute('aria-hidden')).toBe('true')
  })
})
