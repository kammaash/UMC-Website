import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type ClickEvent = {
  action: string
  notification: { data: unknown; close: ReturnType<typeof vi.fn> }
  stopImmediatePropagation: ReturnType<typeof vi.fn>
  waitUntil: (promise: Promise<unknown>) => void
}

const source = readFileSync(resolve(process.cwd(), 'public/firebase-messaging-sw.js'), 'utf8')

function loadWorker(fetchResult: { ok: boolean; status: number }) {
  let click: ((event: ClickEvent) => void) | undefined
  const showNotification = vi.fn().mockResolvedValue(undefined)
  const fetchMock = vi.fn().mockResolvedValue(fetchResult)
  const focus = vi.fn().mockResolvedValue(undefined)
  const openWindow = vi.fn().mockResolvedValue(undefined)
  const worker = {
    location: { href: 'https://unifiedmedicalcare.com/reminders/firebase-messaging-sw.js?apiKey=a' },
    registration: { showNotification },
    addEventListener: vi.fn((name: string, handler: (event: ClickEvent) => void) => {
      if (name === 'notificationclick') click = handler
    }),
  }
  const clientsMock = {
    matchAll: vi.fn().mockResolvedValue([{ url: 'https://unifiedmedicalcare.com/reminders/', navigate: vi.fn(), focus }]),
    openWindow,
  }
  const firebase = { initializeApp: vi.fn(), messaging: vi.fn() }
  // Execute the shipped worker itself with browser globals replaced by mocks.
  new Function('self', 'clients', 'fetch', 'importScripts', 'firebase', source)(
    worker, clientsMock, fetchMock, vi.fn(), firebase,
  )
  if (!click) throw new Error('notificationclick handler was not registered')
  return { click, fetchMock, showNotification, clientsMock, focus }
}

function takenEvent() {
  let completion: Promise<unknown> | undefined
  const event: ClickEvent = {
    action: 'taken',
    notification: {
      data: {
        FCM_MSG: {
          data: { actionToken: 'signed-dose-token', logId: 'dose-1' },
          fcmOptions: { link: 'https://unifiedmedicalcare.com/reminders/?dose=dose-1' },
        },
      },
      close: vi.fn(),
    },
    stopImmediatePropagation: vi.fn(),
    waitUntil: (promise) => { completion = promise },
  }
  return { event, done: async () => completion }
}

describe('firebase messaging service worker — Taken notification action', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('marks the dose through the signed-token endpoint without opening the webpage', async () => {
    const worker = loadWorker({ ok: true, status: 200 })
    const { event, done } = takenEvent()
    worker.click(event)
    await done()

    expect(event.stopImmediatePropagation).toHaveBeenCalledOnce()
    expect(event.notification.close).toHaveBeenCalledOnce()
    expect(worker.fetchMock).toHaveBeenCalledWith(
      'https://asia-south1-tablet-reminder-app-111204.cloudfunctions.net/markDoseFromPush',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'signed-dose-token' }),
      }),
    )
    expect(worker.clientsMock.matchAll).not.toHaveBeenCalled()
    expect(worker.showNotification).not.toHaveBeenCalled()
  })

  it('shows a retry notification that opens the webpage when the mark fails', async () => {
    const worker = loadWorker({ ok: false, status: 403 })
    const { event, done } = takenEvent()
    worker.click(event)
    await done()

    expect(worker.showNotification).toHaveBeenCalledWith(
      'Not marked as taken',
      expect.objectContaining({ body: expect.stringContaining('expired') }),
    )
  })
})
