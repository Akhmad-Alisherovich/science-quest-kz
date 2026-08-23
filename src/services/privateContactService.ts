import { supabase } from '../lib/supabase'

const requireClient = () => {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')
  return supabase
}

export const normalizePhone = (phone: string) => phone.replace(/[\s()-]/g, '')
export const isValidPhone = (phone: string) => /^\+[1-9]\d{7,14}$/.test(normalizePhone(phone))

export const formatPhone = (phone: string) => {
  const normalized = normalizePhone(phone)
  const kz = normalized.match(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/)
  return kz ? `+7 ${kz[1]} ${kz[2]} ${kz[3]} ${kz[4]}` : normalized
}

export async function fetchMyPrivateContact(): Promise<string | null> {
  const { data, error } = await requireClient().rpc('get_my_private_contact')
  if (error) throw error
  const row = (data as Array<{ phone?: unknown }> | null)?.[0]
  return typeof row?.phone === 'string' ? row.phone : null
}

export async function saveMyPrivateContact(phone: string): Promise<string> {
  const normalized = normalizePhone(phone)
  if (!isValidPhone(normalized)) throw new Error('PHONE_INVALID')
  const { error } = await requireClient().rpc('save_my_private_contact', { p_phone: normalized })
  if (error) throw error
  return normalized
}
