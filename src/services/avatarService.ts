import { supabase } from '../lib/supabase'

export const AVATAR_BUCKET = 'avatars'
export const AVATAR_MAX_SOURCE_BYTES = 5 * 1024 * 1024
export const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

const client = () => {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')
  return supabase
}

export function avatarPublicUrl(value: string) {
  const [path, version] = value.split('?v=', 2)
  if (!/^[0-9a-f-]{36}\/avatar\.webp$/i.test(path)) return null
  if (!supabase) return null
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return version ? `${data.publicUrl}?v=${encodeURIComponent(version)}` : data.publicUrl
}

export function validateAvatarSource(file: File) {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type as typeof AVATAR_ALLOWED_TYPES[number])) throw new Error('AVATAR_TYPE_INVALID')
  if (file.size > AVATAR_MAX_SOURCE_BYTES) throw new Error('AVATAR_TOO_LARGE')
}

export async function uploadOwnAvatar(blob: Blob) {
  if (blob.type !== 'image/webp') throw new Error('AVATAR_WEBP_REQUIRED')
  const storage = client()
  const { data: sessionData, error: sessionError } = await storage.auth.getSession()
  if (sessionError) throw sessionError
  const userId = sessionData.session?.user.id
  if (!userId) throw new Error('AUTHENTICATION_REQUIRED')
  const path = `${userId}/avatar.webp`
  const { error } = await storage.storage.from(AVATAR_BUCKET).upload(path, blob, {
    contentType: 'image/webp',
    cacheControl: '60',
    upsert: true,
  })
  if (error) throw error
  return path
}
