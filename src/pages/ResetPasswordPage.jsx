import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError("Passwords don't match")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(onDone, 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-pink-100 p-8 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-4xl mb-3">🐰</div>
          <h1 className="text-xl font-bold text-rose-700 leading-snug">
            <span className="block">Choose a new</span>
            <span className="block">password</span>
          </h1>
        </div>

        {success ? (
          <div className="px-3 py-2 bg-green-50 border border-green-100 text-green-700 rounded-lg text-sm text-center">
            Password updated! Signing you in...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-pink-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 rounded-lg border border-pink-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-rose-400 hover:bg-rose-500 disabled:bg-rose-200 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Saving...' : 'Update Password'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-rose-200">🐾 designed for May Joy Hu 🐾</p>
      </div>
    </div>
  )
}
