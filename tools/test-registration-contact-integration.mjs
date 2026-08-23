import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_TEST_URL
const key = process.env.SUPABASE_TEST_PUBLISHABLE_KEY
const adminEmail = process.env.SUPABASE_ADMIN_TEST_EMAIL
const adminPassword = process.env.SUPABASE_ADMIN_TEST_PASSWORD
if (!url || !key) {
  console.error('Set SUPABASE_TEST_URL and SUPABASE_TEST_PUBLISHABLE_KEY.')
  process.exit(1)
}

const makeClient = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
const students = []
const suffix = Date.now().toString(36).slice(-7)
const assert = (condition, message) => { if (!condition) throw new Error(message) }

async function createStudent(index) {
  const api = makeClient()
  const auth = await api.auth.signInAnonymously()
  if (auth.error || !auth.data.user) throw auth.error ?? new Error('Anonymous compatibility sign-in failed')
  const student = { api, id: auth.data.user.id, phone: `+77001234${String(index).padStart(3, '0')}` }
  students.push(student)
  const profile = await api.rpc('save_profile', { p_nickname: `ContactQA${index}_${suffix}`, p_display_name: `Contact QA ${index}`, p_grade: 5 + index, p_school: null, p_avatar: index ? '🚀' : '🧑‍🔬', p_show_grade: true })
  if (profile.error) throw profile.error
  const contact = await api.rpc('save_my_private_contact', { p_phone: `+7 (700) 123-4${String(index).padStart(3, '0')}` })
  if (contact.error) throw contact.error
  return student
}

try {
  const guest = makeClient()
  const guestContact = await guest.rpc('get_my_private_contact')
  assert(Boolean(guestContact.error), 'Unauthenticated contact RPC was accepted')

  const first = await createStudent(0)
  const second = await createStudent(1)

  const own = await first.api.rpc('get_my_private_contact')
  assert(!own.error && own.data?.[0]?.phone === first.phone, 'Student could not read normalized own phone')

  const ownTable = await first.api.from('user_private_contacts').select('user_id,phone')
  assert(!ownTable.error && ownTable.data.length === 1 && ownTable.data[0].user_id === first.id, 'Own-contact RLS failed')

  const other = await first.api.from('user_private_contacts').select('user_id,phone').eq('user_id', second.id)
  assert(!other.error && other.data.length === 0, 'Student A read Student B phone')

  const profile = await first.api.from('profiles').select('*').eq('id', first.id).single()
  assert(!profile.error && !Object.hasOwn(profile.data, 'phone'), 'Phone leaked into public profile')

  const board = await first.api.rpc('get_leaderboard', { p_period: 'total', p_section: null, p_grade: null, p_limit: 50, p_offset: 0 })
  assert(!board.error && !/phone|77001234/i.test(JSON.stringify(board.data)), 'Phone leaked into leaderboard RPC')

  console.log('Student own phone: PASS')
  console.log('Other student phone denied: PASS')
  console.log('Profile / leaderboard phone privacy: PASS')

  if (adminEmail && adminPassword) {
    const admin = makeClient()
    const login = await admin.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
    if (login.error) throw login.error
    const contact = await admin.rpc('get_admin_student_contact', { p_user_id: first.id })
    assert(!contact.error && contact.data?.[0]?.phone === first.phone, 'Admin contact detail RPC failed')
    console.log('Admin student contact detail: PASS')
    await admin.auth.signOut()
  } else {
    console.log('Admin student contact detail: WAITING_ADMIN_CREDENTIALS')
  }
} finally {
  let cleaned = 0
  for (const student of students) {
    const result = await student.api.rpc('delete_my_account')
    if (!result.error) cleaned += 1
  }
  console.log(`Contact QA cleanup: ${cleaned}/${students.length}`)
}
