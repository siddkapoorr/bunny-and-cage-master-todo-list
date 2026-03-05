import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import Board from './components/Board'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isRecovery, setIsRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
      } else if (event === 'USER_UPDATED') {
        setIsRecovery(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    )
  }

  if (isRecovery) {
    return <ResetPasswordPage onDone={() => setIsRecovery(false)} />
  }

  if (!session) {
    return <AuthPage />
  }

  return <Board session={session} />
}
