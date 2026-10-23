import { useState } from 'react'

export type AuthMode = 'login' | 'register'

const field =
  'mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

/** Login/register form; the parent decides what a successful submit does. */
export default function AuthForm({ onSubmit }: { onSubmit: (mode: AuthMode, email: string, password: string) => Promise<void> }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSubmit(mode, email, password)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-3xl bg-white p-8 shadow-2xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="text-sm text-slate-500">
          {mode === 'login' ? 'Log in to browse the showroom.' : 'The first account registered becomes the admin.'}
        </p>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Password
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={field}
        />
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {mode === 'login' ? 'Log in' : 'Register'}
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        className="w-full text-sm text-indigo-600 hover:underline"
      >
        {mode === 'login' ? 'Need an account? Create an account' : 'Already registered? Log in'}
      </button>
    </form>
  )
}
