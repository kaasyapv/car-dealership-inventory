import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from './api'
import App from './App'

vi.mock('./api')

const session = { token: 't', user: { id: 1, email: 'a@x.com', role: 'user' as const } }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.searchVehicles).mockResolvedValue({ items: [], total: 0 })
})

describe('App', () => {
  it('shows the login form when there is no session', () => {
    vi.mocked(api.loadSession).mockReturnValue(null)
    render(<App />)
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
  })

  it('logs in, saves the session and shows the dashboard', async () => {
    vi.mocked(api.loadSession).mockReturnValue(null)
    vi.mocked(api.login).mockResolvedValue(session)
    render(<App />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@x.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('a@x.com')).toBeInTheDocument()
    expect(api.saveSession).toHaveBeenCalledWith(session)
  })

  it('restores a saved session and logs out', async () => {
    vi.mocked(api.loadSession).mockReturnValue(session)
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }))
    expect(api.clearSession).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
  })
})
