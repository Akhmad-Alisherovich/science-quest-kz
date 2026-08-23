import { supabase } from '../lib/supabase'
import type { AppRole, AuthActionResult } from '../types/auth'
import { normalizePhone, saveMyPrivateContact } from './privateContactService'

const requireClient = () => {
  if (!supabase) throw new Error('AUTH_NOT_CONFIGURED')
  return supabase
}

export async function getMyRole(): Promise<AppRole> {
  const { data, error } = await requireClient().rpc('get_my_role')
  if (error) throw error
  return data === 'admin' ? 'admin' : 'student'
}

export async function registerWithEmail(email: string, password: string, phone: string, isAnonymous: boolean): Promise<AuthActionResult> {
  const client = requireClient()
  const normalizedPhone = normalizePhone(phone)
  if (isAnonymous) {
    await saveMyPrivateContact(normalizedPhone)
    const { data, error } = await client.auth.updateUser({ email: email.trim() })
    if (error) throw error
    if (!data.user.is_anonymous) {
      const passwordResult = await client.auth.updateUser({ password })
      if (passwordResult.error) throw passwordResult.error
      return {}
    }
    return { confirmationRequired: true }
  }
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: window.location.origin, data: { registration_phone: normalizedPhone } },
  })
  if (error) throw error
  return { confirmationRequired: !data.session }
}

export async function loginWithEmail(email: string, password: string) {
  const { error } = await requireClient().auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
}

export async function sendPasswordRecovery(email: string) {
  const { error } = await requireClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
  if (error) throw error
}

export async function updatePassword(password: string) {
  const { error } = await requireClient().auth.updateUser({ password })
  if (error) throw error
}

export async function resendEmail(email: string, emailChange = false) {
  const { error } = await requireClient().auth.resend({ type: emailChange ? 'email_change' : 'signup', email: email.trim(), options: { emailRedirectTo: window.location.origin } })
  if (error) throw error
}

export async function signOut() {
  const { error } = await requireClient().auth.signOut()
  if (error) throw error
}

export async function logLogin() {
  const { error } = await requireClient().rpc('record_my_activity', { p_event_type: 'LOGIN', p_level_id: null })
  if (error) throw error
}

export async function logLevelStarted(levelId: string) {
  const { error } = await requireClient().rpc('record_my_activity', { p_event_type: 'LEVEL_STARTED', p_level_id: levelId })
  if (error) throw error
}
