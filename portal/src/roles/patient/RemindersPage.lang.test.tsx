// The page's language: Telugu unless the patient or the link says otherwise,
// and the switch that changes it. (RemindersPage.test.tsx covers what the
// page DOES, in English — test/setup.ts pins that for every other test.)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from 'firebase/auth'
import { RemindersPage } from './RemindersPage'
import * as AuthModule from '../../shared/auth/AuthContext'
import * as claimActions from './data/reminderClaim'
import * as pushActions from './data/reminderPush'
import * as authActions from './data/reminderAuth'
import { initLang } from './i18n/langStore'
import { en } from './i18n/en'
import { te } from './i18n/te'

vi.mock('./data/reminderAuth', () => ({
  sendOtp: vi.fn(), confirmOtp: vi.fn(), resetOtp: vi.fn(), signOutReminders: vi.fn(),
}))
vi.mock('./data/reminderClaim', () => ({
  previewClaim: vi.fn(), claimGroup: vi.fn(), usersDocExists: vi.fn(),
  deleteOrphanAccount: vi.fn().mockResolvedValue(undefined), signOutExisting: vi.fn().mockResolvedValue(undefined),
  syncPatientName: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('./data/useTodayDoses', () => ({
  useTodayDoses: vi.fn(() => ({ loading: false, error: null, doses: [], zone: 'Asia/Kolkata', dateLabel: '17 సెప్టెం, గురు', nowMinutes: 600 })),
}))
vi.mock('./data/reminderDoses', () => ({ markDoseTaken: vi.fn() }))
vi.mock('./setupTiming', () => ({ SETUP_HOLD_MS: 0 }))
vi.mock('./greetingMorphTiming', () => ({ GREETING_HOLD_MS: 0, MORPH_MS: 0, CORNER_HOLD_MS: 0, PEEK_HOLD_MS: 0 }))
vi.mock('./RevealSetup', () => ({
  RevealSetup: ({ children }: { children: React.ReactNode }) => <div data-reveal="">{children}</div>,
}))
vi.mock('./data/reminderPush', () => ({
  currentPlatform: vi.fn(), pushSupported: vi.fn().mockResolvedValue(true), permissionState: vi.fn(),
  requestPermission: vi.fn(), requestAppInstall: vi.fn().mockResolvedValue('unavailable'),
  registerPushToken: vi.fn().mockResolvedValue('registered'),
  deactivatePushToken: vi.fn().mockResolvedValue(undefined),
  listenForeground: vi.fn(() => () => {}), installPwaHead: vi.fn(),
  PushSetupError: class extends Error { constructor(public reason: string) { super(reason) } },
}))

const ANDROID = { os: 'android', browser: 'chromium', safariVersion: null, iosVersion: null, standalone: false, gate: 'ok', tokenPlatform: 'android-chrome' } as const
const patient = { uid: 'u1', phoneNumber: '+917799440022' } as unknown as User
const claimedProfile = { role: 'patient', patientGroupID: 'G0', fullName: 'Patient B' }

function renderWith(authValue: Partial<ReturnType<typeof AuthModule.useAuth>>) {
  vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
    status: 'signed-out', user: null, profile: null,
    ...authValue,
  } as ReturnType<typeof AuthModule.useAuth>)
  return render(<RemindersPage />)
}
// a first visit: nothing remembered, and whatever the link carried
function arriveWith(search: string, saved?: string) {
  localStorage.clear()
  if (saved) localStorage.setItem('umc-lang', saved)
  window.history.replaceState(null, '', `/reminders/${search}`)
  initLang()
}
const langSelect = () => screen.getByRole('combobox', { name: /భాష|Language/ }) as HTMLSelectElement

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  vi.mocked(pushActions.currentPlatform).mockReturnValue(ANDROID)
  vi.mocked(pushActions.pushSupported).mockResolvedValue(true)
  vi.mocked(pushActions.permissionState).mockReturnValue('granted')
  vi.mocked(pushActions.registerPushToken).mockResolvedValue('registered')
  vi.mocked(claimActions.previewClaim).mockResolvedValue({ found: false })
  arriveWith('')
})
afterEach(() => { window.history.replaceState(null, '', '/') })

describe('RemindersPage — language', () => {
  it('opens in Telugu for a patient who scanned the QR (no language on the link)', () => {
    renderWith({ status: 'signed-out' })
    expect(screen.getByRole('heading', { name: te.landing.heading })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: new RegExp(te.landing.continueWithPhone) })).toBeInTheDocument()
    expect(screen.queryByText(en.landing.heading)).not.toBeInTheDocument()
    expect(langSelect().value).toBe('te')
    // the default is not written down: only a choice is
    expect(localStorage.getItem('umc-lang')).toBeNull()
  })

  it('marks the page as Telugu for the browser and screen readers', () => {
    const { container, unmount } = renderWith({ status: 'signed-out' })
    expect(container.querySelector('.umc-rem-root')).toHaveAttribute('lang', 'te')
    expect(document.documentElement.lang).toBe('te')
    expect(document.title).toBe(te.docTitle)
    unmount()
    expect(document.documentElement.lang).not.toBe('te')
  })

  it('offers Telugu and English, each written in its own script', () => {
    renderWith({ status: 'signed-out' })
    const options = within(langSelect()).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['తెలుగు', 'English'])
  })

  it('switches to English on the spot and remembers it on this phone', async () => {
    const user = userEvent.setup()
    renderWith({ status: 'signed-out' })
    await user.selectOptions(langSelect(), 'en')
    expect(screen.getByRole('heading', { name: en.landing.heading })).toBeInTheDocument()
    expect(screen.queryByText(te.landing.heading)).not.toBeInTheDocument()
    expect(localStorage.getItem('umc-lang')).toBe('en')
  })

  it('switches back to Telugu', async () => {
    const user = userEvent.setup()
    arriveWith('', 'en')
    renderWith({ status: 'signed-out' })
    expect(screen.getByRole('heading', { name: en.landing.heading })).toBeInTheDocument()
    await user.selectOptions(langSelect(), 'te')
    expect(screen.getByRole('heading', { name: te.landing.heading })).toBeInTheDocument()
    expect(localStorage.getItem('umc-lang')).toBe('te')
  })

  it("opens in the WhatsApp invite's language, and keeps it for later visits", () => {
    arriveWith('?lang=en')
    renderWith({ status: 'signed-out' })
    expect(screen.getByRole('heading', { name: en.landing.heading })).toBeInTheDocument()
    // a notification tap arrives at ?dose=… with no language on it
    expect(localStorage.getItem('umc-lang')).toBe('en')
  })

  it("keeps the patient's own choice over the link's", () => {
    arriveWith('?lang=en', 'te')
    renderWith({ status: 'signed-out' })
    expect(screen.getByRole('heading', { name: te.landing.heading })).toBeInTheDocument()
  })

  it('falls back to Telugu for a language the page does not have yet', () => {
    arriveWith('?lang=hi')
    renderWith({ status: 'signed-out' })
    expect(screen.getByRole('heading', { name: te.landing.heading })).toBeInTheDocument()
    expect(localStorage.getItem('umc-lang')).toBeNull()
  })

  it('asks for the phone number and the code in Telugu', async () => {
    const user = userEvent.setup()
    vi.mocked(authActions.sendOtp).mockResolvedValue(undefined)
    renderWith({ status: 'signed-out' })
    await user.click(screen.getByRole('button', { name: new RegExp(te.landing.continueWithPhone) }))
    expect(screen.getByRole('heading', { name: te.otp.phoneTitle })).toBeInTheDocument()
    await user.type(screen.getByRole('textbox'), '9999900001')
    await user.click(screen.getByRole('button', { name: te.otp.send }))
    expect(await screen.findByRole('heading', { name: te.otp.codeTitle })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: te.otp.verify })).toBeInTheDocument()
  })

  it('words a sign-in failure in Telugu', async () => {
    const user = userEvent.setup()
    vi.mocked(authActions.sendOtp).mockRejectedValue({ code: 'auth/too-many-requests' })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderWith({ status: 'signed-out' })
    await user.click(screen.getByRole('button', { name: new RegExp(te.landing.continueWithPhone) }))
    await user.type(screen.getByRole('textbox'), '9999900001')
    await user.click(screen.getByRole('button', { name: te.otp.send }))
    expect(await screen.findByRole('alert')).toHaveTextContent(te.otp.sendErrors['too-many-attempts'])
  })

  it('re-words a message already on screen when the language changes', async () => {
    const user = userEvent.setup()
    vi.mocked(claimActions.previewClaim).mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderWith({ status: 'signed-in', user: patient, profile: null })
    expect(await screen.findByRole('alert')).toHaveTextContent(te.claim.errors['lookup-failed'])
    await user.selectOptions(langSelect(), 'en')
    expect(screen.getByRole('alert')).toHaveTextContent(en.claim.errors['lookup-failed'])
  })

  it('moves the switch into the account sheet once the patient is on their dashboard', async () => {
    const user = userEvent.setup()
    renderWith({ status: 'signed-in', user: patient, profile: claimedProfile })
    const avatar = await screen.findByRole('button', { name: te.dash.accountDetails })
    // the corner now holds the status light and the avatar, not the switch
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    await user.click(avatar)
    const sheet = screen.getByRole('dialog')
    expect(within(sheet).getByRole('heading', { name: te.account.title })).toBeInTheDocument()
    await user.selectOptions(within(sheet).getByRole('combobox', { name: te.language }), 'en')
    expect(within(sheet).getByRole('heading', { name: en.account.title })).toBeInTheDocument()
    expect(screen.getByText(en.doses.emptyTitle)).toBeInTheDocument()
  })
})

describe('the Telugu wording', () => {
  it('has as many steps as the English in every set of instructions', () => {
    expect(te.notify.askSteps).toHaveLength(en.notify.askSteps.length)
    expect(te.notify.blockedSteps).toHaveLength(en.notify.blockedSteps.length)
  })
  it('names the phone\'s own buttons exactly as the phone shows them', () => {
    render(<ol>{te.notify.askSteps.map((s, i) => <li key={i}>{s}</li>)}</ol>)
    const steps = screen.getAllByRole('listitem')
    expect(within(steps[1]).getByText('Allow')).toBeInTheDocument()
    expect(within(steps[1]).getByText('Block')).toBeInTheDocument()
  })
  it('tells the patient to tap the button by the name it carries on screen', () => {
    render(<p>{te.notify.askSteps[0]}</p>)
    expect(screen.getByText(te.dash.enable)).toBeInTheDocument()
  })
})
