import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email for a confirmation link!')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setMessage('Password reset email sent! Check your inbox.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function switchMode(next) {
    setMode(next)
    setError(null)
    setMessage(null)
  }

  const subtitle = { login: 'Sign in to your account', signup: 'Create a new account', forgot: 'Reset your password' }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-pink-100 p-8 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-4xl mb-3">🐰</div>
          <h1 className="text-xl font-bold text-rose-700 leading-snug">
            <span className="block">Bunny and Cage Master</span>
            <span className="block">To-Do List</span>
          </h1>
          <p className="text-slate-400 text-xs mt-2">{subtitle[mode]}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-pink-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 rounded-lg border border-pink-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          )}

          {mode === 'login' && (
            <div className="text-right -mt-1">
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-xs text-rose-400 hover:text-rose-500"
              >
                Forgot password?
              </button>
            </div>
          )}

          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="px-3 py-2 bg-green-50 border border-green-100 text-green-700 rounded-lg text-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-rose-400 hover:bg-rose-500 disabled:bg-rose-200 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Email'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          {mode === 'forgot' ? (
            <>
              Remember it?{' '}
              <button onClick={() => switchMode('login')} className="text-rose-500 hover:text-rose-600 font-medium">
                Sign In
              </button>
            </>
          ) : mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button onClick={() => switchMode('signup')} className="text-rose-500 hover:text-rose-600 font-medium">
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => switchMode('login')} className="text-rose-500 hover:text-rose-600 font-medium">
                Sign In
              </button>
            </>
          )}
        </p>

        <p className="mt-6 text-center text-xs text-rose-200">🐾 designed for May Joy Hu 🐾</p>
      </div>
    </div>
  )
}
