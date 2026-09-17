import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { User } from 'firebase/auth'
import { RemindersPage } from './RemindersPage'
import * as AuthModule from '../../shared/auth/AuthContext'

vi.mock('./data/reminderAuth', () => ({
  sendOtp: vi.fn(), confirmOtp: vi.fn(), resetOtp: vi.fn(), signOutReminders: vi.fn(),
}))

function renderWith(authValue: Partial<ReturnType<typeof AuthModule.useAuth>>) {
  vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
    status: 'signed-out', user: null, profile: null,
    ...authValue,
  } as ReturnType<typeof AuthModule.useAuth>)
  return render(<RemindersPage />)
}

describe('RemindersPage', () => {
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
  it('shows the OTP-proven number when signed in (no users doc required)', () => {
    renderWith({
      status: 'signed-in', profile: null,
      user: { phoneNumber: '+917799440022' } as unknown as User,
    })
    expect(screen.getByText('+91 77994 40022')).toBeInTheDocument()
    expect(screen.getByText('Not you? Sign out')).toBeInTheDocument()
  })
})
