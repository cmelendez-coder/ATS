import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getSessionUser } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(undefined) // undefined = cargando

  useEffect(() => {
    getSessionUser()
      .then(user => setSessionState(user ? { user } : null))
      .catch(() => {
        // Token inválido o expirado — limpiar y pedir login
        supabase.auth.signOut()
        setSessionState(null)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, supaSession) => {
      if (event === 'SIGNED_OUT') setSessionState(null)
      if (event === 'TOKEN_REFRESHED' && !supaSession) setSessionState(null)
      if (event === 'SIGNED_IN' && !supaSession) setSessionState(null)
      // Refresh token inválido → limpiar localStorage y forzar login
      if (event === 'INITIAL_SESSION' && !supaSession) {
        localStorage.removeItem('sb-tcizdsspibdoqqgpreay-auth-token')
        setSessionState(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  function setSession(user) {
    setSessionState({ user })
  }

  async function clearSession() {
    await supabase.auth.signOut()
    setSessionState(null)
  }

  if (session === undefined) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#071D47',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
      }}>
        <span className="material-symbols-outlined animate-spin" style={{ color: '#50B152', fontSize: 28 }}>
          progress_activity
        </span>
        <span style={{ color: '#50B152', fontSize: 14, fontWeight: 600 }}>Cargando…</span>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ session, setSession, clearSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
