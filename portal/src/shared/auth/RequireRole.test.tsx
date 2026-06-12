import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RequireRole } from './RequireRole'
import * as AuthModule from './AuthContext'

function renderAt(authValue: Partial<ReturnType<typeof AuthModule.useAuth>>) {
  vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
    status: 'signed-out', user: null, profile: null,
    signInWithGoogle: vi.fn(), logout: vi.fn(),
    ...authValue,
  } as ReturnType<typeof AuthModule.useAuth>)

  return render(
    <MemoryRouter initialEntries={['/doctor']}>
      <Routes>
        <Route path="/doctor" element={<RequireRole role="doctor" />}>
          <Route index element={<div>PROTECTED</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireRole', () => {
  // Sign-in lives at the site root (/login), so redirects are full-page
  // (window.location.href), not in-router Navigates.
  let original: Location
  beforeEach(() => {
    original = window.location
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: { href: '' } })
  })
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: original })
  })

  it('renders protected content for a matching role', () => {
    renderAt({ status: 'signed-in', profile: { role: 'doctor' } })
    expect(screen.getByText('PROTECTED')).toBeInTheDocument()
  })
  it('redirects an unauthenticated user to /login', () => {
    renderAt({ status: 'signed-out', profile: null })
    expect(window.location.href).toBe('/login')
  })
  it('redirects a non-matching role to /login?e=wrong-role', () => {
    renderAt({ status: 'signed-in', profile: { role: 'pharmacy' } })
    expect(window.location.href).toBe('/login?e=wrong-role')
  })
})
