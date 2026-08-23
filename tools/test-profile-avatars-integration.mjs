import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_TEST_URL
const key = process.env.SUPABASE_TEST_PUBLISHABLE_KEY
if (!url || !key) {
  console.error('Set SUPABASE_TEST_URL and SUPABASE_TEST_PUBLISHABLE_KEY.')
  process.exit(1)
}

const makeClient = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
const students = []
const suffix = Date.now().toString(36).slice(-7)
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const webp = (marker) => new Blob([new Uint8Array([0x52,0x49,0x46,0x46,marker,0,0,0,0x57,0x45,0x42,0x50,0x56,0x50,0x38,0x20])], { type: 'image/webp' })

async function createStudent(index) {
  const api = makeClient()
  const signed = await api.auth.signInAnonymously()
  if (signed.error || !signed.data.user) throw signed.error ?? new Error('Anonymous sign-in failed')
  const student = { api, id: signed.data.user.id, path: `${signed.data.user.id}/avatar.webp` }
  students.push(student)
  const upload = await api.storage.from('avatars').upload(student.path, webp(index + 1), { contentType: 'image/webp', upsert: true })
  if (upload.error) throw upload.error
  const profile = await api.rpc('save_profile_with_avatar', { p_nickname: `AvatarQA${index}_${suffix}`, p_display_name: `Avatar QA ${index}`, p_grade: 5 + index, p_school: null, p_avatar: index ? '🚀' : '🧑‍🔬', p_show_grade: true, p_avatar_path: student.path })
  if (profile.error) throw profile.error
  return student
}

try {
  const first = await createStudent(0)
  const second = await createStudent(1)

  const overwriteOwn = await first.api.storage.from('avatars').upload(first.path, webp(9), { contentType: 'image/webp', upsert: true })
  assert(!overwriteOwn.error, `User A could not upsert own avatar: ${overwriteOwn.error?.message ?? ''}`)
  console.log('User A own avatar upload/upsert: PASS')

  const overwriteOther = await first.api.storage.from('avatars').upload(second.path, webp(8), { contentType: 'image/webp', upsert: true })
  assert(Boolean(overwriteOther.error), 'User A overwrote User B avatar')
  const deleteOther = await first.api.storage.from('avatars').remove([second.path])
  assert(Boolean(deleteOther.error) || deleteOther.data.length === 0, 'User A deleted User B avatar')
  const secondAfterAttack = await second.api.storage.from('avatars').list(second.id)
  assert(!secondAfterAttack.error && secondAfterAttack.data.some((item) => item.name === 'avatar.webp'), 'User B avatar disappeared after User A attack')
  console.log('User A overwrite/delete User B avatar: DENIED')

  const ownRows = await first.api.storage.from('avatars').list(first.id)
  assert(!ownRows.error && ownRows.data.some((item) => item.name === 'avatar.webp'), 'User A cannot read own stored avatar')
  const board = await first.api.rpc('get_leaderboard', { p_period: 'total', p_section: null, p_grade: null, p_limit: 50, p_offset: 0 })
  assert(!board.error && board.data.some((row) => String(row.avatar).startsWith(`${first.path}?v=`)), 'Leaderboard did not return avatar path')
  console.log('Storage read and leaderboard avatar propagation: PASS')
} finally {
  let cleaned = 0
  for (const student of students) {
    await student.api.storage.from('avatars').remove([student.path])
    const result = await student.api.rpc('delete_my_account')
    if (!result.error) cleaned += 1
  }
  console.log(`Avatar QA cleanup: ${cleaned}/${students.length}`)
}
