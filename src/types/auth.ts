import type { Session, User } from '@supabase/supabase-js'

export type AppRole = 'student' | 'admin'
export type AuthPhase = 'loading' | 'guest' | 'authenticated' | 'error'

export interface AuthContextState {
  phase: AuthPhase
  session: Session | null
  user: User | null
  role: AppRole
  roleLoading: boolean
  isAnonymous: boolean
  needsPasswordSetup: boolean
}

export interface AuthActionResult {
  confirmationRequired?: boolean
}
