// en.tsx — the reminders page in English. The wording here is the page's
// original wording, moved out of the components unchanged (2026-09-29).
import { Glyph } from '../glyphs'
import { PHONE_AUTH_MESSAGES, OTP_AUTH_MESSAGES } from '../../../shared/auth/phoneAuthErrors'
import type { Strings } from './strings'

const signInThere = (signIn: boolean) => (signIn ? ' and sign in there' : '')

export const en: Strings = {
  docTitle: 'UMC — Medicine reminders',
  language: 'Language',
  loading: 'Loading…',

  landing: {
    heading: 'Your medicine reminders',
    lead: (
      <>
        Your doctor has set up your medicines here. Sign in with
        <strong> the phone number your doctor has</strong>, and this page will
        remind you when each dose is due.
      </>
    ),
    continueWithPhone: 'Continue with phone',
    held: 'Go through the setup steps above first.',
    noteSms: "You'll get a 6-digit code by SMS · No app needed",
    noteHomeScreen: 'Sign in from the Home Screen app · 6-digit code by SMS',
    noteDock: 'Sign in from the Dock app · 6-digit code by SMS',
    iosTooOld: 'Reminders need iOS 16.4 or newer. Update your iPhone in Settings → General → Software Update, then come back.',
  },
  notices: {
    'existing-account': 'This number already has a UMC account. Open the UMC app — your reminders are there.',
    'other-account': 'This record is already set up on another account. Ask your doctor to check.',
    'sign-out-failed': "Couldn't sign out. Please try again.",
  },

  otp: {
    phoneTitle: 'Your number',
    phoneDesc: 'Enter your Indian mobile number',
    codeTitle: 'Check your phone',
    codeDesc: 'Enter the 6-digit code',
    send: 'Send code →',
    verify: 'Verify →',
    cancel: 'Cancel',
    sendErrors: PHONE_AUTH_MESSAGES,
    codeErrors: OTP_AUTH_MESSAGES,
  },

  claim: {
    looking: 'Finding your record…',
    claiming: 'Setting up your reminders…',
    errorHeading: 'Something went wrong',
    tryAgain: 'Try again',
    signOut: 'Sign out',
    errors: {
      'account-failed': "Couldn't load your account. Check your connection and try again.",
      'lookup-failed': "Couldn't look up your record. Check your connection and try again.",
      'failed-precondition': 'This record is already set up on another account, or no longer exists. Ask your doctor to check.',
      'permission-denied': 'This record is not for your phone number. Ask your doctor to check the number they saved.',
      'unauthenticated': 'Your sign-in expired. Please sign in again.',
      'generic': "Couldn't finish setting up. Check your connection and try again.",
    },
  },

  unregistered: {
    heading: 'Uh oh!',
    lead: "We don't have you on our list yet.",
    askDoctor: "Ask your doctor about UMC to get registered — once they've added you, this same page will have your reminders ready.",
    nonPatient: 'This number is already registered in the UMC app as a non-patient.',
    soonBadge: 'Coming soon',
    soonText: "A UMC app where you'll be able to register yourself and join the UMC Network. Stay tuned!",
    understood: 'Understood',
  },

  dash: {
    setUp: "You're set up",
    welcomeBack: 'Welcome back',
    reminders: 'Reminders',
    checking: 'Checking this phone…',
    registering: 'Turning on reminders…',
    allSetLine: 'Reminders are on. This phone will ring when each dose is due.',
    remindersOn: 'Reminders are on',
    remindersOff: 'Reminders are off',
    appOwns: "Your reminders come from the UMC app on this phone, so this page won't send its own. You can still check and mark your medicines here.",
    lastStepTap: <>Last step: let this phone ring for your medicines. Tap below, then tap <strong>Allow</strong>.</>,
    enable: 'Enable Reminders',
    blocked: "Notifications are blocked for this site. Allow them in your browser's site settings, then reopen this page.",
    onlyFromDock: 'On a Mac, reminders only work from the Dock app.',
    onlyFromHomeScreen: (device) => `On ${device === 'iPad' ? 'an iPad' : 'an iPhone'}, reminders only work from the Home Screen app.`,
    iosTooOld: 'Reminders need iOS 16.4 or newer. Update your iPhone in Settings → General → Software Update, then reopen this page.',
    unsupported: "This browser can't show reminders. On Android open this page in Chrome; on iPhone/Mac add it to the Home Screen/Dock.",
    accountDetails: 'Account details',
    signOutBlocked: "Couldn't turn reminders off on this phone. Check your connection and try again.",
    pushErrors: {
      'vapid-missing': "Reminders aren't available on this site yet. Please tell your doctor.",
      'no-token': "Couldn't set up notifications on this phone. Try again in a moment.",
      'write-failed': "Couldn't save your reminder setting. Check your connection and try again.",
      'generic': "Couldn't turn on reminders. Please try again.",
    },
  },

  allSetTitle: "You're all set!",

  notify: {
    blockedLabel: 'Notifications are blocked for this site',
    blockedSteps: [
      <>Tap the small button <Glyph name="tune" /> just left of the web address, <strong>unifiedmedicalcare.com</strong>. (It may be a lock 🔒.)</>,
      <>Tap <strong>Permissions</strong> if you see it, then switch <strong>Notifications</strong> on <Glyph name="toggle" /></>,
      <>Still blocked? Open your phone's <strong>Settings</strong> → <strong>Apps</strong> → your browser (e.g. <strong>Chrome</strong>) → <strong>Notifications</strong>, and switch them on.</>,
      <>Come back to this page and tap <strong>I've turned them on</strong>.</>,
    ],
    stillBlocked: 'Still blocked. Check the steps above, then try again.',
    turnedOn: "I've turned them on",
  },

  install: {
    pill: 'Set up reminders',
    hide: 'Hide these steps',
    done: 'Done',
    addToHomeLabel: (device) => `Add this to your ${device}'s Home Screen`,
    addToDockLabel: "Add this to your Mac's Dock",
    needSafariLabel: (device) => `Reminders need Safari on your ${device}`,
    needSafariMacLabel: 'Reminders need Safari on a Mac',
    doneHome: 'Open UMC Reminders from your Home Screen whenever you are ready.',
    doneDock: 'Open UMC Reminders from your Dock whenever you are ready.',
    doneSafari: 'See you in Safari.',
    safariOnly: <>These steps only work in Safari, the browser with the blue compass icon.</>,
    openInSafari: <>Open this page in Safari, and follow the steps there. <Glyph name="phone-vibrate" /></>,
    cannotDock: <>This browser can't add web apps to your Dock, so it can't show reminders.</>,
    lookBottomRight: <>Look at the bottom-right of Safari.</>,
    lookBottom: <>Look at the bottom of Safari.</>,
    lookTopRight: <>Look at the top-right of Safari.</>,
    tapMore: <>Tap <strong>⋯</strong> <Glyph name="more" /> beside the address bar.</>,
    tapShare: <>Tap <strong>Share</strong> <Glyph name="share" />.</>,
    thenTapShare: <>Then tap <strong>Share</strong> <Glyph name="share" />.</>,
    noMoreButton: <>No ⋯ button? Tap <strong>Share</strong> <Glyph name="share" /> in the bottom toolbar.</>,
    scrollListAddHome: <>Scroll down the list and tap <strong>Add to Home Screen</strong> <Glyph name="add-home" /></>,
    scrollMenuAddHome: <>Scroll down the menu and tap <strong>Add to Home Screen</strong> <Glyph name="add-home" /></>,
    viewMoreAddHome: <>Tap <strong>View More</strong> (or <strong>More</strong>), then <strong>Add to Home Screen</strong> <Glyph name="add-home" /></>,
    chooseAddHome: <>Choose <strong>Add to Home Screen</strong> <Glyph name="add-home" /> from the list.</>,
    webApp: <>Make sure <strong>Open as Web App</strong> <Glyph name="toggle" /> is switched on, then tap <strong>Add</strong>.</>,
    openIcon: (signIn) => <>Open the new app icon from your Home Screen{signInThere(signIn)}.</>,
    launchApp: (signIn) => <>Launch the app straight from your Home Screen{signInThere(signIn)}.</>,
    allow: (device) => <>In the app, tap <strong>Enable Reminders</strong> <Glyph name="phone-vibrate" />, then tap <strong>Allow</strong> when your {device} asks to send notifications.</>,
    macMenuBar: <>Look up at the menu bar at the very top left of your screen.</>,
    macAddToDock: <>Click <strong>File</strong>, then <strong>Add to Dock</strong> 📥</>,
    macOpenFromDock: (signIn) => <>Open <strong>UMC Reminders</strong> from your Dock{signInThere(signIn)}.</>,
    macAddressBar: <>Look at the right-hand end of the address bar, at the top of this window.</>,
    macInstall: <>Click the install icon <Glyph name="install" />, then <strong>Install</strong>. No icon? Use the <strong>⋮</strong> menu → <strong>Cast, save, and share</strong> → <strong>Install page as app</strong>.</>,
  },

  doses: {
    sectionLabel: "Today's medicines",
    today: (date) => `Today · ${date}`,
    takenCount: (taken, total) => `${taken} of ${total} taken`,
    loadError: "Couldn't load your medicines. Check your connection and reopen this page.",
    loading: 'Loading your medicines…',
    emptyTitle: 'No medicines are scheduled for today',
    emptySub: 'When your doctor adds one, it appears here.',
    noReminder: 'No reminder',
    saveFailed: "Couldn't save. Try again.",
    // 'completed' is the app's own wording for a finished course (courseCompletedLabel)
    status: { upcoming: 'Upcoming', due: 'Due', taken: 'Taken', taken_late: 'Taken late', missed: 'Missed', completed: 'Cycle complete' },
    ariaDone: (name, time, status) => `${name} at ${time}, ${status}`,
    ariaOver: (name, status) => `${name}, ${status}`,
    ariaMark: (name, time) => `Mark ${name} at ${time} as taken`,
  },

  account: {
    title: 'Account details',
    name: 'Name',
    phone: 'Phone',
    doctor: 'Doctor',
    dr: (name) => `Dr ${name}`,
    turningOff: 'Turning reminders off…',
    signOut: 'Not you? Sign out',
    close: 'Close',
  },
}
