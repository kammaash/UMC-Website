// strings.ts — every word the reminders page shows a patient, as one typed
// shape. en.tsx and te.tsx each fill it in; a missing line is a type error,
// never a blank on a patient's screen.
//
// What is deliberately NOT translated, in any language:
//   • the names of buttons the PHONE draws (Allow, Block, Share, Add to Home
//     Screen, Settings…) — they appear on screen in the phone's own language,
//     so the steps name them exactly as the patient will see them;
//   • medicine names and dose times, which are the doctor's own words;
//   • iPhone / iPad / Mac / Safari / Chrome / UMC.
import type { ReactNode } from 'react'
import type { DoseStatus } from '../data/doses'
import type { ClaimErrorReason } from '../data/claimDecision'
import type { PhoneAuthReason, OtpAuthReason } from '../../../shared/auth/phoneAuthErrors'

export type AppleDevice = 'iPhone' | 'iPad' | 'Mac'
export type NoticeKey = 'existing-account' | 'other-account' | 'sign-out-failed'
export type PushErrorReason = 'vapid-missing' | 'no-token' | 'write-failed' | 'generic'

export interface Strings {
  docTitle: string
  language: string            // the switch's name, for screen readers and the account sheet
  loading: string

  landing: {
    heading: string
    lead: ReactNode
    continueWithPhone: string
    held: string
    noteSms: string
    noteHomeScreen: string
    noteDock: string
    iosTooOld: string
  }
  notices: Record<NoticeKey, string>

  otp: {
    phoneTitle: string
    phoneDesc: string
    codeTitle: string
    codeDesc: string
    send: string
    verify: string
    cancel: string
    sendErrors: Record<PhoneAuthReason, string>
    codeErrors: Record<OtpAuthReason, string>
  }

  claim: {
    looking: string
    claiming: string
    errorHeading: string
    tryAgain: string
    signOut: string
    errors: Record<ClaimErrorReason | 'lookup-failed' | 'account-failed', string>
  }

  unregistered: {
    heading: string
    lead: string
    askDoctor: string
    nonPatient: string
    soonBadge: string
    soonText: string
    understood: string
  }

  dash: {
    setUp: string             // "You're set up" — the name follows after a comma
    welcomeBack: string
    reminders: string
    checking: string
    registering: string
    allSetLine: string
    remindersOn: string
    remindersOff: string
    appOwns: string
    lastStepTap: ReactNode
    enable: string
    blocked: string
    onlyFromDock: string
    onlyFromHomeScreen: (device: AppleDevice) => string
    iosTooOld: string
    unsupported: string
    accountDetails: string
    signOutBlocked: string
    pushErrors: Record<PushErrorReason, string>
  }

  allSetTitle: string

  notify: {
    blockedLabel: string
    blockedSteps: ReactNode[]
    stillBlocked: string
    turnedOn: string
  }

  install: {
    pill: string
    hide: string
    done: string
    addToHomeLabel: (device: AppleDevice) => string
    addToDockLabel: string
    needSafariLabel: (device: AppleDevice) => string
    needSafariMacLabel: string
    doneHome: string
    doneDock: string
    doneSafari: string
    safariOnly: ReactNode
    openInSafari: ReactNode
    cannotDock: ReactNode
    // step 1, one line each
    lookBottomRight: ReactNode
    lookBottom: ReactNode
    lookTopRight: ReactNode
    tapMore: ReactNode
    tapShare: ReactNode
    thenTapShare: ReactNode
    noMoreButton: ReactNode
    // the rest
    scrollListAddHome: ReactNode
    scrollMenuAddHome: ReactNode
    viewMoreAddHome: ReactNode
    chooseAddHome: ReactNode
    webApp: ReactNode
    openIcon: (signIn: boolean) => ReactNode
    launchApp: (signIn: boolean) => ReactNode
    allow: (device: AppleDevice) => ReactNode
    macMenuBar: ReactNode
    macAddToDock: ReactNode
    macOpenFromDock: (signIn: boolean) => ReactNode
    macAddressBar: ReactNode
    macInstall: ReactNode
  }

  doses: {
    sectionLabel: string
    today: (date: string) => string
    takenCount: (taken: number, total: number) => string
    loadError: string
    loading: string
    emptyTitle: string
    emptySub: string
    noReminder: string
    saveFailed: string
    status: Record<DoseStatus, string>
    ariaDone: (name: string, time: string, status: string) => string
    ariaMark: (name: string, time: string) => string
  }

  account: {
    title: string
    name: string
    phone: string
    doctor: string
    dr: (name: string) => string
    turningOff: string
    signOut: string
    close: string
  }
}
