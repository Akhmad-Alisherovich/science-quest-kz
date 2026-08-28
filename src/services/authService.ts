import { supabase } from '../lib/supabase'
import type { AppRole } from '../types/auth'
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

export async function registerWithEmail(email: string, password: string, phone: string, isAnonymous: boolean): Promise<void> {
  const client = requireClient()
  const normalizedPhone = normalizePhone(phone)
  if (isAnonymous) {
    const { data, error } = await client.auth.updateUser({ email: email.trim(), password })
    if (error) throw error
    const { data: sessionData, error: sessionError } = await client.auth.getSession()
    if (sessionError) throw sessionError
    if (data.user.is_anonymous || !sessionData.session) throw new Error('REGISTRATION_SESSION_MISSING')
    await saveMyPrivateContact(normalizedPhone)
    return
  }
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { registration_phone: normalizedPhone } },
  })
  if (import.meta.env.DEV) {
    console.log('SIGNUP ERROR', error)
    console.log('SIGNUP USER', data?.user)
    console.log('SIGNUP SESSION', data?.session)
  }
  if (error) throw error
  if (data.user && !data.session) throw new Error('REGISTRATION_SESSION_MISSING')
  if (!data.session) throw new Error('SIGNUP_RESPONSE_INCOMPLETE')
  await saveMyPrivateContact(normalizedPhone)
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
