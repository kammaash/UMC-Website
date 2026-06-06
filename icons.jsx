// icons.jsx — line-icon set (monochrome) + role data. Exports to window.
const I = ({ d, children, sw = 1.6 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d ? <path d={d} /> : children}
  </svg>
);

const Icons = {
  bell: () => <I d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />,
  alarm: () => <I><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M5 3 2 6M22 6l-3-3" /></I>,
  users: () => <I><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></I>,
  pill: () => <I><path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7zM8.5 8.5l7 7" /></I>,
  shield: () => <I d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  pin: () => <I><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></I>,
  chart: () => <I><path d="M3 3v18h18M7 15l3-4 3 2 4-6" /></I>,
  stethoscope: () => <I><path d="M4.8 3v4a4 4 0 0 0 8 0V3M2.8 3h4M10.8 3h4M8.8 15a6 6 0 0 0 12 0v-3" /><circle cx="20.8" cy="10" r="2" /></I>,
  doc: () => <I><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></I>,
  flask: () => <I><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" /><path d="M7.5 15h9" /></I>,
  mic: () => <I><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></I>,
  lock: () => <I><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></I>,
  cloud: () => <I d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.7 1.5A4 4 0 0 0 6 19z" />,
  cal: () => <I><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></I>,
  apple: () => <I sw="0.2"><path fill="currentColor" stroke="none" d="M17.05 12.5c-.03-2.6 2.12-3.84 2.22-3.9-1.21-1.77-3.1-2.02-3.77-2.05-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.16-.46 7.83 1.3 10.4.86 1.25 1.88 2.66 3.22 2.6 1.3-.05 1.78-.83 3.35-.83 1.56 0 2 .83 3.37.8 1.39-.02 2.27-1.27 3.12-2.53.98-1.45 1.38-2.85 1.4-2.92-.03-.01-2.7-1.03-2.73-4.1zM14.6 4.84c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.28.69-3.02 1.56-.66.76-1.24 1.99-1.08 3.16 1.15.09 2.32-.58 3.03-1.43z" /></I>,
};

const ROLES = [
  {
    key: "patient", side: "top", num: "01", label: "Patient", icon: "pill",
    title: "Patient",
    lede: "Never miss a dose. Gentle reminders, smart alarms, and a caregiver who always knows you're okay.",
    rows: [
      { t: "Smart medication alarms", d: "Schedule every tablet with vibration, sound, and full-screen alerts that won't be ignored." },
      { t: "One-tap confirmation", d: "Mark doses as taken and your caregiver is notified instantly — no message needed." },
      { t: "Voice & accessibility", d: "Speech-to-text logging and large, high-contrast controls built for every patient." },
    ],
  },
  {
    key: "doctor", side: "right", num: "02", label: "Doctor", icon: "stethoscope",
    title: "Doctor",
    lede: "Take your clinic fully digital — on us. Prescribe by voice, track adherence live, and leave handwritten scripts and paper records behind.",
    demoVideo: "assets/UMC DoctorVideo-2.mp4",
    rows: [
      { t: "Free digital clinic setup", d: "We give you a free server to take your clinic fully digital — records, schedules and patient history, set up at no cost." },
      { t: "Voice prescriptions", d: "Prescribe by simply speaking. No more handwritten scripts or paper files — it's logged and sent to the patient instantly." },
      { t: "Live patient tracking", d: "Watch adherence as it happens — see exactly when each patient takes their medication, in real time." },
    ],
  },
  {
    key: "pharmacy", side: "bottom", num: "03", label: "Pharmacy", icon: "flask",
    title: "Pharmacy",
    lede: "Close the loop on refills. Connect to nearby patients and keep prescriptions flowing without the phone tag.",
    rows: [
      { t: "Refill coordination", d: "See upcoming refill needs and notify patients before they run out." },
      { t: "Location matching", d: "Geolocation connects patients to the nearest participating pharmacy." },
      { t: "Inventory-aware", d: "Confirm availability and reserve medication ahead of pickup." },
    ],
  },
  {
    key: "diagnostics", side: "left", num: "04", label: "Diagnostics", icon: "doc",
    title: "Diagnostics",
    lede: "Tests, scheduled and surfaced. Diagnostic centers plug directly into each patient's care timeline.",
    rows: [
      { t: "Test scheduling", d: "Book labs and scans that appear right inside the patient's calendar." },
      { t: "Result delivery", d: "Securely deliver results to patients and their care team in one place." },
      { t: "Care timeline", d: "Every test mapped against medication history for the full picture." },
    ],
  },
];

Object.assign(window, { Icons, ROLES });
