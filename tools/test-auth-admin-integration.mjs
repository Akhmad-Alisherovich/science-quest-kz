import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_TEST_URL
const key = process.env.SUPABASE_TEST_PUBLISHABLE_KEY
const adminEmail = process.env.SUPABASE_ADMIN_TEST_EMAIL
const adminPassword = process.env.SUPABASE_ADMIN_TEST_PASSWORD
if (!url || !key) {
  console.error('Set SUPABASE_TEST_URL and SUPABASE_TEST_PUBLISHABLE_KEY.')
  process.exit(1)
}

const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
const students = []
const suffix = Date.now().toString(36).slice(-7)
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const denied = (result, message) => assert(Boolean(result.error), message)

async function makeStudent(index) {
  const api = client()
  const signed = await api.auth.signInAnonymously()
  if (signed.error || !signed.data.user) throw signed.error ?? new Error('Anonymous sign-in failed')
  const item = { api, id: signed.data.user.id }
  students.push(item)
  const profile = await api.rpc('save_profile', { p_nickname: `AuthQA${index}_${suffix}`, p_display_name: `Science QA ${index}`, p_grade: 5 + index, p_school: null, p_avatar: index ? '🚀' : '🧑‍🔬', p_show_grade: true })
  if (profile.error) throw profile.error
  return item
}

try {
  const unauthenticated = client()
  denied(await unauthenticated.rpc('get_my_role'), 'Unauthenticated role RPC was accepted')

  const first = await makeStudent(0)
  const second = await makeStudent(1)
  for (const student of students) {
    const role = await student.api.rpc('get_my_role')
    assert(!role.error && role.data === 'student', 'New user did not receive student role')
    denied(await student.api.rpc('get_admin_dashboard'), 'Student reached admin dashboard RPC')
    denied(await student.api.from('user_roles').select('*'), 'Student read user_roles')
    denied(await student.api.from('user_roles').insert({ user_id: student.id, role: 'admin' }), 'Student inserted admin role')
    denied(await student.api.from('user_roles').update({ role: 'admin' }).eq('user_id', student.id), 'Student updated admin role')
    denied(await student.api.from('user_roles').delete().eq('user_id', student.id), 'Student deleted role')
    denied(await student.api.from('student_activity').insert({ user_id: student.id, event_type: 'LOGIN' }), 'Student inserted activity directly')
  }
  console.log('Student authorization / role escalation: PASS')

  const started = await first.api.rpc('record_my_activity', { p_event_type: 'LEVEL_STARTED', p_level_id: 'scientific-thinking-know' })
  if (started.error) throw started.error
  const firstProfiles = await first.api.from('profiles').select('id')
  const firstActivity = await first.api.from('student_activity').select('user_id,event_type,metadata')
  assert(!firstProfiles.error && firstProfiles.data.length === 1 && firstProfiles.data[0].id === first.id, 'Profile RLS isolation failed')
  assert(!firstActivity.error && firstActivity.data.length > 0 && firstActivity.data.every((row) => row.user_id === first.id), 'Activity RLS isolation failed')
  assert(!firstActivity.data.some((row) => /email|phone|password|token/i.test(JSON.stringify(row.metadata))), 'Sensitive activity metadata detected')
  const secondProfiles = await second.api.from('profiles').select('id').eq('id', first.id)
  assert(!secondProfiles.error && secondProfiles.data.length === 0, 'Cross-user profile read succeeded')
  console.log('Student activity / privacy / RLS: PASS')

  if (adminEmail && adminPassword) {
    const admin = client()
    const login = await admin.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
    if (login.error) throw login.error
    const role = await admin.rpc('get_my_role')
    assert(!role.error && role.data === 'admin', 'Admin role check failed')
    const calls = [
      admin.rpc('get_admin_dashboard'),
      admin.rpc('get_admin_students', { p_search: null, p_grade: null, p_active: 'all', p_sort: 'xp_desc', p_limit: 50, p_offset: 0 }),
      admin.rpc('get_admin_student_detail', { p_user_id: first.id }),
      admin.rpc('get_admin_student_progress', { p_user_id: first.id }),
      admin.rpc('get_admin_student_history', { p_user_id: first.id, p_limit: 50, p_offset: 0 }),
      admin.rpc('get_admin_activity', { p_days: 7, p_event_type: null, p_user_id: null, p_grade: null, p_search: null, p_limit: 50, p_offset: 0 }),
      admin.rpc('get_admin_daily_analytics', { p_days: 14 }),
      admin.rpc('get_admin_weak_topics', { p_limit: 20 }),
      admin.rpc('get_admin_leaderboard', { p_period: 'total', p_section: null, p_grade: null, p_limit: 100, p_offset: 0 }),
    ]
    const results = await Promise.all(calls)
    assert(results.every((result) => !result.error), `Admin RPC failed: ${results.find((result) => result.error)?.error?.message ?? 'unknown'}`)
    assert(!/(email|phone|password|token)/i.test(JSON.stringify(results.map((result) => result.data))), 'Admin RPC exposed contact/auth data')
    await admin.auth.signOut()
    console.log('Admin authorization / dashboard / analytics: PASS')
  } else {
    console.log('Admin live QA: WAITING_ADMIN_CREDENTIALS')
  }
} finally {
  let cleaned = 0
  for (const student of students) {
    const result = await student.api.rpc('delete_my_account')
    if (!result.error) cleaned += 1
  }
  console.log(`Auth/admin test-user cleanup: ${cleaned}/${students.length}`)
}
