import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { isLeaderboardConfigured, supabase } from '../lib/supabase'
import { getMyRole, logLogin, loginWithEmail, registerWithEmail, sendPasswordRecovery, signOut, updatePassword } from '../services/authService'
import { isValidPhone, normalizePhone } from '../services/privateContactService'
import type { AuthContextState } from '../types/auth'

const PASSWORD_SETUP_KEY = 'science-quest-kz-password-setup-v1'

interface AuthContextValue extends AuthContextState {
  registerEmail: (email: string, password: string, phone: string) => Promise<void>
  loginEmail: (email: string, password: string) => Promise<void>
  recoverEmail: (email: string) => Promise<void>
  finishPasswordSetup: (password: string) => Promise<void>
  logout: () => Promise<void>
  refreshRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [phase, setPhase] = useState<AuthContextState['phase']>(isLeaderboardConfigured ? 'loading' : 'error')
  const [role, setRole] = useState<AuthContextState['role']>('student')
  const [roleLoading, setRoleLoading] = useState(false)
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(() => sessionStorage.getItem(PASSWORD_SETUP_KEY) === 'true')

  const loadRole = useCallback(async (activeSession: Session | null) => {
    if (!activeSession) { setRole('student'); setRoleLoading(false); return }
    setRoleLoading(true)
    try { setRole(await getMyRole()) }
    catch { setRole('student') }
    finally { setRoleLoading(false) }
  }, [])

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) { setPhase('error'); return }
      setSession(data.session)
      setPhase(data.session ? 'authenticated' : 'guest')
      void loadRole(data.session)
      if (data.session) void logLogin().catch(() => undefined)
    })
    const { data } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setPhase(nextSession ? 'authenticated' : 'guest')
      window.setTimeout(() => {
        void loadRole(nextSession)
        if (nextSession && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) void logLogin().catch(() => undefined)
        if (event === 'PASSWORD_RECOVERY') { sessionStorage.setItem(PASSWORD_SETUP_KEY, 'true'); setNeedsPasswordSetup(true) }
      }, 0)
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [loadRole])

  const isAnonymous = Boolean(session?.user.is_anonymous)
  const value = useMemo<AuthContextValue>(() => ({
    phase,
    session,
    user: session?.user ?? null,
    role,
    roleLoading,
    isAnonymous,
    needsPasswordSetup,
    registerEmail: async (email, password, phone) => {
      const normalizedPhone = normalizePhone(phone)
      if (!isValidPhone(normalizedPhone)) throw new Error('PHONE_INVALID')
      await registerWithEmail(email, password, normalizedPhone, isAnonymous)
    },
    loginEmail: loginWithEmail,
    recoverEmail: sendPasswordRecovery,
    finishPasswordSetup: async (password) => { await updatePassword(password); sessionStorage.removeItem(PASSWORD_SETUP_KEY); setNeedsPasswordSetup(false) },
    logout: async () => {
      await signOut()
      sessionStorage.removeItem(PASSWORD_SETUP_KEY)
      setNeedsPasswordSetup(false)
      setRole('student')
    },
    refreshRole: () => loadRole(session),
  }), [phase, session, role, roleLoading, isAnonymous, needsPasswordSetup, loadRole])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
