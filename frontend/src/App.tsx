import { useState } from 'react'
import * as api from './api'
import AuthForm from './AuthForm'
import Dashboard from './Dashboard'

// APP: shows the login page, or the dashboard once logged in
export default function App() {
  const [session, setSession] = useState(api.loadSession())

  const authenticate = async (mode: 'login' | 'register', email: string, password: string) => {
    const next = mode === 'login' ? await api.login(email, password) : await api.register(email, password)
    api.saveSession(next)
    setSession(next)
  }

  const logout = () => {
    api.clearSession()
    setSession(null)
  }

  if (session) return <Dashboard user={session.user} onLogout={logout} />
  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-4">
      <div className="flex w-full flex-col items-center gap-8">
        <h1 className="text-4xl font-black tracking-tight text-white">
          <span className="text-indigo-400">▲</span> Showroom
        </h1>
        <AuthForm onSubmit={authenticate} />
      </div>
    </main>
  )
}
