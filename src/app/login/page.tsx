'use client'

import { createClient } from '@/lib/supabase/client'
import { Bot, Loader2, LogIn } from 'lucide-react'
import { useState } from 'react'

export default function LoginPage() {
  const supabase = createClient()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setMessage('')

    const response =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
          })

    setIsLoading(false)

    if (response.error) {
      setMessage(response.error.message)
      return
    }

    if (mode === 'signup' && !response.data.session) {
      setMessage('Account created. Check your email to confirm your signup, then sign in.')
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7fb] px-4 py-10 text-[#15171c]">
      <section className="w-full max-w-md rounded-lg border border-[#e0e4ed] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#115e59] text-white">
            <Bot size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">FinCoach AI</h1>
            <p className="text-sm text-[#6b7280]">Sign in to manage your money workspace</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-md bg-[#eef1f6] p-1 text-sm font-medium">
          <button
            className={`rounded px-3 py-2 ${mode === 'signin' ? 'bg-white shadow-sm' : 'text-[#6b7280]'}`}
            onClick={() => setMode('signin')}
            type="button"
          >
            Sign in
          </button>
          <button
            className={`rounded px-3 py-2 ${mode === 'signup' ? 'bg-white shadow-sm' : 'text-[#6b7280]'}`}
            onClick={() => setMode('signup')}
            type="button"
          >
            Create
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label className="block text-sm font-medium">
              Full name
              <input
                className="mt-2 h-11 w-full rounded-md border border-[#d8dde8] px-3 outline-none focus:border-[#115e59]"
                onChange={(event) => setFullName(event.target.value)}
                value={fullName}
              />
            </label>
          )}
          <label className="block text-sm font-medium">
            Email
            <input
              className="mt-2 h-11 w-full rounded-md border border-[#d8dde8] px-3 outline-none focus:border-[#115e59]"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              className="mt-2 h-11 w-full rounded-md border border-[#d8dde8] px-3 outline-none focus:border-[#115e59]"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {message && (
            <p className="rounded-md bg-[#fff7ed] px-3 py-2 text-sm text-[#9a3412]">{message}</p>
          )}

          <button
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#115e59] text-sm font-semibold text-white disabled:opacity-60"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" size={17} /> : <LogIn size={17} />}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  )
}
