/* firebase-messaging-sw.js — service worker for the patient reminders page.
 *
 * Served at /reminders/firebase-messaging-sw.js (copied from the portal bundle
 * by the deploy workflow) so its scope is /reminders/. The page registers it
 * with the Firebase web config in the query string, because Vite cannot inject
 * env values into a public/ file. Those values are public web config, not
 * secrets (same as the VITE_FB_* values in the bundle).
 *
 * Push display is done by the Firebase SDK: the sender (functions/
 * webReminderSender.js) sends a notification message with webpush options
 * (tag = dose log id, requireInteraction, a "Taken" action, and the page link
 * with ?dose=<logId>). The SDK stores the whole message on the notification as
 * data.FCM_MSG.
 *
 * Clicks are handled HERE, ahead of the SDK's own listener (registered first +
 * stopImmediatePropagation):
 *   - action "taken"  → POST the signed action token to markDoseFromPush. The
 *                       worker has no Firebase session; the token IS the auth
 *                       (HMAC-bound to one group + one dose, 6h expiry).
 *   - anything else   → open/focus the page at the dose link.
 * iOS shows no action buttons, so there a tap always opens the page, and the
 * page marks the dose (piece 5).
 */
/* global importScripts, firebase, clients */
'use strict';

const SDK = '12.14.0'; // keep equal to the firebase version in package.json
const MARK_DOSE_URL = 'https://asia-south1-tablet-reminder-app-111204.cloudfunctions.net/markDoseFromPush';
const PAGE_URL = 'https://unifiedmedicalcare.com/reminders/';

const params = new URL(self.location.href).searchParams;
const config = {
  apiKey: params.get('apiKey'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

function messageOf(notification) {
  const d = (notification && notification.data) || {};
  const msg = d.FCM_MSG || d;
  return {
    data: (msg && msg.data) || {},
    link: (msg && msg.fcmOptions && msg.fcmOptions.link) || (msg && msg.data && msg.data.link) || '',
  };
}

async function openPage(url) {
  const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of all) {
    if (c.url.startsWith(PAGE_URL) || c.url.includes('/reminders')) {
      try { await c.navigate(url); } catch (e) { /* ignore */ }
      return c.focus();
    }
  }
  return clients.openWindow(url);
}

async function markTaken(data, link) {
  let ok = false;
  let reason = '';
  try {
    const res = await fetch(MARK_DOSE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: data.actionToken }),
    });
    ok = res.ok;
    if (!ok) reason = String(res.status);
  } catch (e) {
    reason = 'network';
  }
  if (ok) return;
  // The write did not happen. Say so, and make the tap open the page where the
  // dose can be marked with a signed-in session.
  const why = reason === '503' ? 'Reminders are paused right now.'
    : reason === '403' ? 'This reminder has expired.'
    : "Couldn't reach the server.";
  await self.registration.showNotification("Not marked as taken", {
    body: why + ' Tap to open the page and mark it there.',
    tag: (data.logId || 'dose') + '-retry',
    requireInteraction: true,
    data: { FCM_MSG: { data, fcmOptions: { link } } },
  });
}

self.addEventListener('notificationclick', (event) => {
  event.stopImmediatePropagation();
  const { data, link } = messageOf(event.notification);
  const url = link || (PAGE_URL + (data.logId ? '?dose=' + encodeURIComponent(data.logId) : ''));
  event.notification.close();
  if (event.action === 'taken' && data.actionToken) {
    event.waitUntil(markTaken(data, url));
  } else {
    event.waitUntil(openPage(url));
  }
});

importScripts('https://www.gstatic.com/firebasejs/' + SDK + '/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/' + SDK + '/firebase-messaging-compat.js');
firebase.initializeApp(config);
firebase.messaging(); // installs the SDK's push handler (displays the notification)
