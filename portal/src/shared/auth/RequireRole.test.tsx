import { describe, it, expect, vi } from 'vitest'
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
        <Route path="/login" element={<div>LOGIN</div>} />
        <Route path="/wrong-role" element={<div>WRONG ROLE</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireRole', () => {
  it('renders protected content for a matching role', () => {
    renderAt({ status: 'signed-in', profile: { role: 'doctor' } })
    expect(screen.getByText('PROTECTED')).toBeInTheDocument()
  })
  it('redirects an unauthenticated user to /login', () => {
    renderAt({ status: 'signed-out', profile: null })
    expect(screen.getByText('LOGIN')).toBeInTheDocument()
  })
  it('redirects a non-matching role to /wrong-role', () => {
    renderAt({ status: 'signed-in', profile: { role: 'pharmacy' } })
    expect(screen.getByText('WRONG ROLE')).toBeInTheDocument()
  })
})
