// te.tsx — the reminders page in Telugu, the language it opens in.
//
// Written plainly, the way a clinic's front desk would say it: everyday
// words, the English ones people already use (ఫోన్, డాక్టర్, రిమైండర్, కోడ్)
// kept as they are spoken. Buttons the PHONE draws — Allow, Block, Share,
// Add to Home Screen, Settings — stay in English, because that is how they
// appear on the patient's screen (see strings.ts).
//
// Drafted 2026-09-29; to be read through by a fluent speaker before release.
import { Glyph } from '../glyphs'
import type { Strings } from './strings'

const signInThere = (signIn: boolean) => (signIn ? ', అక్కడ సైన్ ఇన్ చేయండి' : '')

export const te: Strings = {
  docTitle: 'UMC — మందుల రిమైండర్లు',
  language: 'భాష',
  loading: 'లోడ్ అవుతోంది…',

  landing: {
    heading: 'మీ మందుల రిమైండర్లు',
    lead: (
      <>
        మీ డాక్టర్ మీ మందులను ఇక్కడ నమోదు చేశారు.
        <strong> మీ డాక్టర్ దగ్గర ఉన్న మీ ఫోన్ నంబర్‌తో</strong> సైన్ ఇన్ చేయండి.
        మందు వేసుకునే సమయం అయినప్పుడల్లా ఈ పేజీ మీకు గుర్తు చేస్తుంది.
      </>
    ),
    continueWithPhone: 'ఫోన్ నంబర్ ఇవ్వండి',
    held: 'ముందుగా పైన ఉన్న సెటప్ దశలను పూర్తి చేయండి.',
    noteSms: 'SMS ద్వారా 6 అంకెల కోడ్ వస్తుంది · యాప్ అవసరం లేదు',
    noteHomeScreen: 'హోమ్ స్క్రీన్ యాప్ నుండి సైన్ ఇన్ చేయండి · SMS ద్వారా 6 అంకెల కోడ్',
    noteDock: 'Dock యాప్ నుండి సైన్ ఇన్ చేయండి · SMS ద్వారా 6 అంకెల కోడ్',
    iosTooOld: 'రిమైండర్లకు iOS 16.4 లేదా అంతకంటే కొత్తది అవసరం. Settings → General → Software Update లో మీ iPhone ను అప్‌డేట్ చేసి, తిరిగి రండి.',
  },
  notices: {
    'existing-account': 'ఈ నంబర్‌కు ఇప్పటికే UMC ఖాతా ఉంది. UMC యాప్ తెరవండి — మీ రిమైండర్లు అక్కడ ఉన్నాయి.',
    'other-account': 'ఈ రికార్డు ఇప్పటికే వేరే ఖాతాలో సెటప్ అయి ఉంది. మీ డాక్టర్‌ను ఒకసారి చూడమని అడగండి.',
    'sign-out-failed': 'సైన్ అవుట్ కాలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.',
  },

  otp: {
    phoneTitle: 'మీ నంబర్',
    phoneDesc: 'మీ మొబైల్ నంబర్ నమోదు చేయండి',
    codeTitle: 'మీ ఫోన్ చూడండి',
    codeDesc: '6 అంకెల కోడ్ నమోదు చేయండి',
    send: 'కోడ్ పంపండి →',
    verify: 'నిర్ధారించండి →',
    cancel: 'రద్దు',
    sendErrors: {
      'invalid-number': 'ఈ ఫోన్ నంబర్ సరిగా లేదు. సరిచూసి మళ్ళీ ప్రయత్నించండి.',
      'too-many-attempts': 'చాలాసార్లు ప్రయత్నించారు. కొంతసేపు ఆగి, మళ్ళీ ప్రయత్నించండి.',
      'sms-limit': 'SMS పరిమితి దాటింది. దయచేసి కొంతసేపటి తర్వాత ప్రయత్నించండి.',
      'verification-failed': 'ధృవీకరణ విఫలమైంది. దయచేసి మళ్ళీ ప్రయత్నించండి.',
      'unauthorized-domain': 'ఈ సైట్‌లో ఫోన్ సైన్ ఇన్‌కు అనుమతి లేదు.',
      'generic': 'ఆ నంబర్‌కు కోడ్ పంపలేకపోయాము. సరిచూసి మళ్ళీ ప్రయత్నించండి.',
    },
    codeErrors: {
      'wrong-code': 'ఆ కోడ్ సరైనది కాదు. దయచేసి మళ్ళీ నమోదు చేయండి.',
      'code-expired': 'ఆ కోడ్ గడువు ముగిసింది. కొత్త కోడ్ కోసం మళ్ళీ అడగండి.',
      'code-missing': 'దయచేసి 6 అంకెల కోడ్ నమోదు చేయండి.',
      'generic': 'ఆ కోడ్‌ను నిర్ధారించలేకపోయాము. దయచేసి మళ్ళీ ప్రయత్నించండి.',
    },
  },

  claim: {
    looking: 'మీ వివరాలు వెతుకుతున్నాము…',
    claiming: 'మీ రిమైండర్లు సిద్ధం చేస్తున్నాము…',
    errorHeading: 'ఏదో పొరపాటు జరిగింది',
    tryAgain: 'మళ్ళీ ప్రయత్నించండి',
    signOut: 'సైన్ అవుట్',
    errors: {
      'lookup-failed': 'మీ వివరాలు కనుగొనలేకపోయాము. ఇంటర్నెట్ కనెక్షన్ చూసుకుని మళ్ళీ ప్రయత్నించండి.',
      'failed-precondition': 'ఈ రికార్డు ఇప్పటికే వేరే ఖాతాలో సెటప్ అయి ఉంది, లేదా ఇప్పుడు లేదు. మీ డాక్టర్‌ను ఒకసారి చూడమని అడగండి.',
      'permission-denied': 'ఈ రికార్డు మీ ఫోన్ నంబర్‌ది కాదు. మీ డాక్టర్ నమోదు చేసిన నంబర్‌ను సరిచూడమని అడగండి.',
      'unauthenticated': 'మీ సైన్ ఇన్ గడువు ముగిసింది. దయచేసి మళ్ళీ సైన్ ఇన్ చేయండి.',
      'generic': 'సెటప్ పూర్తి కాలేదు. ఇంటర్నెట్ కనెక్షన్ చూసుకుని మళ్ళీ ప్రయత్నించండి.',
    },
  },

  unregistered: {
    heading: 'అయ్యో!',
    lead: 'మా జాబితాలో మీ పేరు ఇంకా లేదు.',
    askDoctor: 'నమోదు కోసం మీ డాక్టర్‌ను UMC గురించి అడగండి — వారు మిమ్మల్ని చేర్చిన తర్వాత, ఇదే పేజీలో మీ రిమైండర్లు సిద్ధంగా ఉంటాయి.',
    nonPatient: 'ఈ నంబర్ ఇప్పటికే UMC యాప్‌లో రోగిగా కాకుండా వేరే విధంగా నమోదై ఉంది.',
    soonBadge: 'త్వరలో',
    soonText: 'మీరే స్వయంగా నమోదు చేసుకుని UMC నెట్‌వర్క్‌లో చేరగలిగే UMC యాప్ త్వరలో వస్తోంది. వేచి ఉండండి!',
    understood: 'అర్థమైంది',
  },

  dash: {
    setUp: 'అంతా సిద్ధం',
    welcomeBack: 'మళ్ళీ స్వాగతం',
    reminders: 'రిమైండర్లు',
    checking: 'ఈ ఫోన్‌ను పరిశీలిస్తున్నాము…',
    registering: 'రిమైండర్లు ఆన్ చేస్తున్నాము…',
    allSetLine: 'రిమైండర్లు ఆన్ అయ్యాయి. మందు వేసుకునే సమయానికి ఈ ఫోన్ మోగుతుంది.',
    remindersOn: 'రిమైండర్లు ఆన్‌లో ఉన్నాయి',
    remindersOff: 'రిమైండర్లు ఆఫ్‌లో ఉన్నాయి',
    appOwns: 'ఈ ఫోన్‌లో మీ రిమైండర్లు UMC యాప్ నుండి వస్తాయి, కాబట్టి ఈ పేజీ వేరుగా పంపదు. మీ మందులను ఇక్కడ చూడవచ్చు, వేసుకున్నట్టు గుర్తించవచ్చు.',
    lastStepTap: <>చివరి దశ: మీ మందుల కోసం ఈ ఫోన్ మోగేలా అనుమతించండి. కింద నొక్కి, తర్వాత <strong>Allow</strong> నొక్కండి.</>,
    enable: 'రిమైండర్లు ఆన్ చేయండి',
    blocked: 'ఈ సైట్‌కు నోటిఫికేషన్లు బ్లాక్ అయ్యాయి. మీ బ్రౌజర్ సైట్ సెట్టింగ్స్‌లో వాటిని అనుమతించి, ఈ పేజీని మళ్ళీ తెరవండి.',
    onlyFromDock: 'Mac లో రిమైండర్లు Dock యాప్ నుండి మాత్రమే పనిచేస్తాయి.',
    onlyFromHomeScreen: (device) => `${device} లో రిమైండర్లు హోమ్ స్క్రీన్ యాప్ నుండి మాత్రమే పనిచేస్తాయి.`,
    iosTooOld: 'రిమైండర్లకు iOS 16.4 లేదా అంతకంటే కొత్తది అవసరం. Settings → General → Software Update లో మీ iPhone ను అప్‌డేట్ చేసి, ఈ పేజీని మళ్ళీ తెరవండి.',
    unsupported: 'ఈ బ్రౌజర్ రిమైండర్లను చూపలేదు. Android లో ఈ పేజీని Chrome లో తెరవండి; iPhone/Mac లో దీన్ని Home Screen/Dock కు జోడించండి.',
    accountDetails: 'ఖాతా వివరాలు',
    signOutBlocked: 'ఈ ఫోన్‌లో రిమైండర్లు ఆఫ్ చేయలేకపోయాము. ఇంటర్నెట్ కనెక్షన్ చూసుకుని మళ్ళీ ప్రయత్నించండి.',
    pushErrors: {
      'vapid-missing': 'ఈ సైట్‌లో రిమైండర్లు ఇంకా అందుబాటులో లేవు. దయచేసి మీ డాక్టర్‌కు తెలియజేయండి.',
      'no-token': 'ఈ ఫోన్‌లో నోటిఫికేషన్లు సెటప్ చేయలేకపోయాము. కొద్దిసేపటి తర్వాత మళ్ళీ ప్రయత్నించండి.',
      'write-failed': 'మీ రిమైండర్ సెట్టింగ్ సేవ్ కాలేదు. ఇంటర్నెట్ కనెక్షన్ చూసుకుని మళ్ళీ ప్రయత్నించండి.',
      'generic': 'రిమైండర్లు ఆన్ కాలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.',
    },
  },

  allSetTitle: 'అంతా సిద్ధం!',

  notify: {
    blockedLabel: 'ఈ సైట్‌కు నోటిఫికేషన్లు బ్లాక్ అయ్యాయి',
    blockedSteps: [
      <>వెబ్ అడ్రస్ <strong>unifiedmedicalcare.com</strong> కు ఎడమ పక్కన ఉన్న చిన్న బటన్ <Glyph name="tune" /> నొక్కండి. (అది తాళం 🔒 గుర్తుగా ఉండవచ్చు.)</>,
      <><strong>Permissions</strong> కనిపిస్తే దాన్ని నొక్కి, <strong>Notifications</strong> ను ఆన్ చేయండి <Glyph name="toggle" /></>,
      <>ఇంకా బ్లాక్‌లోనే ఉందా? మీ ఫోన్ <strong>Settings</strong> → <strong>Apps</strong> → మీ బ్రౌజర్ (ఉదా. <strong>Chrome</strong>) → <strong>Notifications</strong> తెరిచి, వాటిని ఆన్ చేయండి.</>,
      <>ఈ పేజీకి తిరిగి వచ్చి <strong>ఆన్ చేశాను</strong> నొక్కండి.</>,
    ],
    stillBlocked: 'ఇంకా బ్లాక్‌లోనే ఉంది. పైన ఉన్న దశలను సరిచూసి, మళ్ళీ ప్రయత్నించండి.',
    turnedOn: 'ఆన్ చేశాను',
  },

  install: {
    pill: 'రిమైండర్లు సెటప్ చేయండి',
    hide: 'ఈ దశలను దాచండి',
    done: 'పూర్తయింది',
    addToHomeLabel: (device) => `దీన్ని మీ ${device} హోమ్ స్క్రీన్‌కు జోడించండి`,
    addToDockLabel: 'దీన్ని మీ Mac లోని Dock కు జోడించండి',
    needSafariLabel: (device) => `మీ ${device} లో రిమైండర్లకు Safari అవసరం`,
    needSafariMacLabel: 'Mac లో రిమైండర్లకు Safari అవసరం',
    doneHome: 'మీకు వీలైనప్పుడు హోమ్ స్క్రీన్ నుండి UMC Reminders తెరవండి.',
    doneDock: 'మీకు వీలైనప్పుడు Dock నుండి UMC Reminders తెరవండి.',
    doneSafari: 'Safari లో కలుద్దాం.',
    safariOnly: <>ఈ దశలు Safari లో మాత్రమే పనిచేస్తాయి — అది నీలి రంగు దిక్సూచి గుర్తు ఉన్న బ్రౌజర్.</>,
    openInSafari: <>ఈ పేజీని Safari లో తెరిచి, అక్కడ దశలను అనుసరించండి. <Glyph name="phone-vibrate" /></>,
    cannotDock: <>ఈ బ్రౌజర్ వెబ్ యాప్‌లను మీ Dock కు జోడించలేదు, కాబట్టి రిమైండర్లను చూపలేదు.</>,
    lookBottomRight: <>Safari లో కింద కుడి వైపు చూడండి.</>,
    lookBottom: <>Safari లో కింది భాగం చూడండి.</>,
    lookTopRight: <>Safari లో పైన కుడి వైపు చూడండి.</>,
    tapMore: <>అడ్రస్ బార్ పక్కన ఉన్న <strong>⋯</strong> <Glyph name="more" /> నొక్కండి.</>,
    tapShare: <><strong>Share</strong> <Glyph name="share" /> నొక్కండి.</>,
    thenTapShare: <>తర్వాత <strong>Share</strong> <Glyph name="share" /> నొక్కండి.</>,
    noMoreButton: <>⋯ బటన్ లేదా? కింది టూల్‌బార్‌లో ఉన్న <strong>Share</strong> <Glyph name="share" /> నొక్కండి.</>,
    scrollListAddHome: <>జాబితాలో కిందికి స్క్రోల్ చేసి <strong>Add to Home Screen</strong> <Glyph name="add-home" /> నొక్కండి</>,
    scrollMenuAddHome: <>మెనూలో కిందికి స్క్రోల్ చేసి <strong>Add to Home Screen</strong> <Glyph name="add-home" /> నొక్కండి</>,
    viewMoreAddHome: <><strong>View More</strong> (లేదా <strong>More</strong>) నొక్కి, తర్వాత <strong>Add to Home Screen</strong> <Glyph name="add-home" /> నొక్కండి</>,
    chooseAddHome: <>జాబితా నుండి <strong>Add to Home Screen</strong> <Glyph name="add-home" /> ఎంచుకోండి.</>,
    webApp: <><strong>Open as Web App</strong> <Glyph name="toggle" /> ఆన్‌లో ఉందో చూసుకుని, <strong>Add</strong> నొక్కండి.</>,
    openIcon: (signIn) => <>హోమ్ స్క్రీన్‌లో వచ్చిన కొత్త యాప్ ఐకాన్‌ను తెరవండి{signInThere(signIn)}.</>,
    launchApp: (signIn) => <>హోమ్ స్క్రీన్ నుండి నేరుగా యాప్‌ను తెరవండి{signInThere(signIn)}.</>,
    allow: (device) => <>యాప్‌లో <strong>రిమైండర్లు ఆన్ చేయండి</strong> <Glyph name="phone-vibrate" /> నొక్కండి. నోటిఫికేషన్లు పంపవచ్చా అని మీ {device} అడిగినప్పుడు <strong>Allow</strong> నొక్కండి.</>,
    macMenuBar: <>మీ స్క్రీన్ పైన ఎడమ మూలలో ఉన్న మెనూ బార్ చూడండి.</>,
    macAddToDock: <><strong>File</strong> క్లిక్ చేసి, తర్వాత <strong>Add to Dock</strong> 📥 క్లిక్ చేయండి</>,
    macOpenFromDock: (signIn) => <>మీ Dock నుండి <strong>UMC Reminders</strong> తెరవండి{signInThere(signIn)}.</>,
    macAddressBar: <>ఈ విండో పైన ఉన్న అడ్రస్ బార్ కుడి చివర చూడండి.</>,
    macInstall: <>ఇన్‌స్టాల్ ఐకాన్ <Glyph name="install" /> క్లిక్ చేసి, తర్వాత <strong>Install</strong> క్లిక్ చేయండి. ఐకాన్ లేదా? <strong>⋮</strong> మెనూ → <strong>Cast, save, and share</strong> → <strong>Install page as app</strong> వాడండి.</>,
  },

  doses: {
    sectionLabel: 'ఈ రోజు మందులు',
    today: (date) => `ఈ రోజు · ${date}`,
    takenCount: (taken, total) => `${total} లో ${taken} వేసుకున్నారు`,
    loadError: 'మీ మందులు లోడ్ కాలేదు. ఇంటర్నెట్ కనెక్షన్ చూసుకుని ఈ పేజీని మళ్ళీ తెరవండి.',
    loading: 'మీ మందులు లోడ్ అవుతున్నాయి…',
    emptyTitle: 'ఈ రోజుకు మందులేవీ లేవు',
    emptySub: 'మీ డాక్టర్ మందు చేర్చినప్పుడు, అది ఇక్కడ కనిపిస్తుంది.',
    noReminder: 'రిమైండర్ లేదు',
    saveFailed: 'సేవ్ కాలేదు. మళ్ళీ ప్రయత్నించండి.',
    status: {
      upcoming: 'రాబోతోంది', due: 'వేసుకోవాలి', taken: 'వేసుకున్నారు',
      taken_late: 'ఆలస్యంగా వేసుకున్నారు', missed: 'వేసుకోలేదు',
    },
    ariaDone: (name, time, status) => `${name}, ${time}, ${status}`,
    ariaMark: (name, time) => `${time} కు ${name} వేసుకున్నట్టు గుర్తించండి`,
  },

  account: {
    title: 'ఖాతా వివరాలు',
    name: 'పేరు',
    phone: 'ఫోన్',
    doctor: 'డాక్టర్',
    dr: (name) => `డా. ${name}`,
    turningOff: 'రిమైండర్లు ఆఫ్ చేస్తున్నాము…',
    signOut: 'మీరు కాదా? సైన్ అవుట్ చేయండి',
    close: 'మూసివేయండి',
  },
}
