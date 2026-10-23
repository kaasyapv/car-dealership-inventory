import { useState } from 'react'
import * as api from './api'
import AuthForm, { type AuthMode } from './AuthForm'
import Dashboard from './Dashboard'

export default function App() {
  const [session, setSession] = useState(api.loadSession)

  const authenticate = async (mode: AuthMode, email: string, password: string) => {
    const next = await (mode === 'login' ? api.login : api.register)(email, password)
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
