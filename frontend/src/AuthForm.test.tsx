import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AuthForm from './AuthForm'

describe('AuthForm', () => {
  it('submits email and password in login mode', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<AuthForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@x.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(onSubmit).toHaveBeenCalledWith('login', 'a@x.com', 'password123')
  })

  it('switches to register mode', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<AuthForm onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: /create an account/i }))
    await userEvent.type(screen.getByLabelText('Email'), 'a@x.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect(onSubmit).toHaveBeenCalledWith('register', 'a@x.com', 'password123')
  })

  it('shows the error when submission fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Invalid email or password'))
    render(<AuthForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@x.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })
})
