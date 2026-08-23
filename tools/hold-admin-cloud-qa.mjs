import { createClient } from '@supabase/supabase-js'
import { createInterface } from 'node:readline'

const url = process.env.SUPABASE_TEST_URL
const key = process.env.SUPABASE_TEST_PUBLISHABLE_KEY
if (!url || !key) process.exit(1)

const options = { auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false } }
const makeClient = () => createClient(url, key, options)
const users = []
const suffix = Date.now().toString(36).slice(-7)
const assert = (condition, message) => { if (!condition) throw new Error(message) }

async function createUser(label, grade, avatar) {
  const api = makeClient()
  const auth = await api.auth.signInAnonymously()
  if (auth.error || !auth.data.user) throw auth.error ?? new Error('Anonymous sign-in failed')
  users.push(api)
  const profile = await api.rpc('save_profile', {
    p_nickname: `${label}_${suffix}`,
    p_display_name: `${label} Cloud QA`,
    p_grade: grade,
    p_school: 'QA School',
    p_avatar: avatar,
    p_show_grade: true,
  })
  if (profile.error) throw profile.error
  return { api, id: auth.data.user.id }
}

let adminCandidate
let student
try {
  adminCandidate = await createUser('ControlQA', 6, '⚗️')
  student = await createUser('StudentQA', 5, '🌍')
  for (const [levelId, accuracy] of [['scientific-thinking-know', 100], ['scientific-thinking-understand', 82]]) {
    const result = await student.api.rpc('submit_level_result', {
      p_level_id: levelId,
      p_accuracy: accuracy,
      p_mistakes: accuracy === 100 ? 0 : 1,
      p_submission_id: crypto.randomUUID(),
    })
    if (result.error) throw result.error
  }
  const started = await student.api.rpc('record_my_activity', { p_event_type: 'LEVEL_STARTED', p_level_id: 'scientific-thinking-apply' })
  if (started.error) throw started.error
  console.log(`ADMIN_QA_USER_ID=${adminCandidate.id}`)
  console.log('WAITING_FOR_SERVER_ROLE_ASSIGNMENT')

  const input = createInterface({ input: process.stdin, output: process.stdout })
  await new Promise((resolve) => input.once('line', resolve))
  input.close()

  const role = await adminCandidate.api.rpc('get_my_role')
  assert(!role.error && role.data === 'admin', 'Server role is not admin')
  const calls = {
    dashboard: adminCandidate.api.rpc('get_admin_dashboard'),
    students: adminCandidate.api.rpc('get_admin_students', { p_search: 'StudentQA', p_grade: 5, p_active: 'all', p_sort: 'xp_desc', p_limit: 50, p_offset: 0 }),
    detail: adminCandidate.api.rpc('get_admin_student_detail', { p_user_id: student.id }),
    progress: adminCandidate.api.rpc('get_admin_student_progress', { p_user_id: student.id }),
    history: adminCandidate.api.rpc('get_admin_student_history', { p_user_id: student.id, p_limit: 50, p_offset: 0 }),
    activity: adminCandidate.api.rpc('get_admin_activity', { p_days: 7, p_event_type: null, p_user_id: student.id, p_grade: 5, p_search: 'StudentQA', p_limit: 50, p_offset: 0 }),
    leaderboard: adminCandidate.api.rpc('get_admin_leaderboard', { p_period: 'total', p_section: 'research', p_grade: 5, p_limit: 100, p_offset: 0 }),
    analytics: adminCandidate.api.rpc('get_admin_daily_analytics', { p_days: 14 }),
    weak: adminCandidate.api.rpc('get_admin_weak_topics', { p_limit: 20 }),
  }
  const names = Object.keys(calls)
  const results = await Promise.all(Object.values(calls))
  for (let index = 0; index < results.length; index += 1) {
    if (results[index].error) throw new Error(`${names[index]}: ${results[index].error.message}`)
  }
  const data = Object.fromEntries(names.map((name, index) => [name, results[index].data ?? []]))
  assert(data.dashboard.length === 1 && Number(data.dashboard[0].total_students) >= 1, 'Dashboard data missing')
  assert(data.students.some((row) => row.user_id === student.id), 'Students search/filter data missing')
  assert(data.detail.length === 1 && data.detail[0].user_id === student.id, 'Student detail missing')
  assert(data.progress.length === 6, 'Section progress missing')
  assert(data.history.length === 2, 'Student history missing')
  assert(data.activity.length > 0, 'Activity data missing')
  assert(data.leaderboard.some((row) => row.nickname.startsWith('StudentQA')), 'Admin leaderboard data missing')
  assert(data.analytics.length === 14, 'Daily analytics data missing')
  assert(data.weak.length > 0, 'Weak topics data missing')
  assert(!/(email|phone|password|token)/i.test(JSON.stringify(data)), 'Admin RPC exposed auth/contact data')
  console.log('Admin authorization: PASS')
  console.log('Admin Dashboard/Students/Detail/Activity/Leaderboard/Analytics/Weak Topics: PASS')
} finally {
  let cleaned = 0
  for (const api of users) {
    const result = await api.rpc('delete_my_account')
    if (!result.error) cleaned += 1
  }
  console.log(`Held admin QA cleanup: ${cleaned}/${users.length}`)
}
