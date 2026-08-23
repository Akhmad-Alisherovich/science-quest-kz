import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_TEST_URL
const publishableKey = process.env.SUPABASE_TEST_PUBLISHABLE_KEY
if (!url || !publishableKey) {
  console.error('Set SUPABASE_TEST_URL and SUPABASE_TEST_PUBLISHABLE_KEY for a disposable Supabase test project.')
  process.exit(1)
}

const students = []
const unique = Date.now().toString(36).slice(-7)
const avatars = ['🧑‍🔬', '🚀', '🌍', '🧬', '⚗️']
const openingLevels = ['scientific-thinking-know', 'scientific-thinking-understand', 'scientific-thinking-apply', 'scientific-thinking-challenge']

const memoryStorage = () => {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

const clientFor = (storage) => createClient(url, publishableKey, {
  auth: { persistSession: Boolean(storage), autoRefreshToken: false, detectSessionInUrl: false, ...(storage ? { storage } : {}) },
})

async function createStudent(index) {
  const storage = index === 0 ? memoryStorage() : null
  const client = clientFor(storage)
  const auth = await client.auth.signInAnonymously()
  if (auth.error || !auth.data.user) throw auth.error ?? new Error('Anonymous auth failed')
  const nickname = `SciTest${index + 1}_${unique}`
  const student = { client, nickname, userId: auth.data.user.id, storage }
  students.push(student)
  const profile = await client.rpc('save_profile', {
    p_nickname: nickname,
    p_display_name: `ScienceTester${index + 1}`,
    p_grade: 5 + index % 2,
    p_school: null,
    p_avatar: avatars[index],
    p_show_grade: true,
  })
  if (profile.error) throw profile.error
  return student
}

async function submit(student, levelId, accuracy, submissionId = crypto.randomUUID()) {
  const result = await student.client.rpc('submit_level_result', {
    p_level_id: levelId,
    p_accuracy: accuracy,
    p_mistakes: accuracy >= 95 ? 0 : 1,
    p_submission_id: submissionId,
  })
  if (result.error) throw result.error
  return result.data?.[0]
}

async function leaderboard(client, period = 'total', section = null, grade = null) {
  const result = await client.rpc('get_leaderboard', {
    p_period: period,
    p_section: section,
    p_grade: grade,
    p_limit: 50,
    p_offset: 0,
  })
  if (result.error) throw result.error
  return result.data
}

const testRows = (rows) => rows.filter((row) => row.nickname.endsWith(unique))
const mustReject = (result, label) => {
  if (!result.error) throw new Error(`RLS failed: ${label} was accepted`)
}

try {
  for (let index = 0; index < 5; index += 1) await createStudent(index)
  console.log('Real anonymous users: 5/5')

  const reloadedClient = clientFor(students[0].storage)
  const reloadedSession = await reloadedClient.auth.getSession()
  if (reloadedSession.error || reloadedSession.data.session?.user.id !== students[0].userId) throw new Error('Session persistence failed')
  console.log('Session persistence: PASS')

  for (const level of openingLevels.slice(0, 2)) await submit(students[0], level, 80)
  for (const level of openingLevels.slice(0, 2)) await submit(students[1], level, 60)
  for (const level of openingLevels) await submit(students[2], level, 80)
  for (const level of openingLevels.slice(0, 3)) await submit(students[3], level, level.endsWith('apply') ? 100 : 80)

  const offlineSubmissionId = crypto.randomUUID()
  const deliveries = await Promise.all([
    submit(students[4], openingLevels[0], 80, offlineSubmissionId),
    submit(students[4], openingLevels[0], 80, offlineSubmissionId),
  ])
  if (deliveries.some((result) => Number(result?.awarded_xp) !== 40)) throw new Error('Idempotency failed: duplicate delivery returned a different award')
  console.log('Idempotency/offline duplicate delivery: PASS')

  const repeated = await submit(students[0], openingLevels[1], 80)
  if (Number(repeated?.awarded_xp) !== 0) throw new Error('Anti-farm failed: repeated level awarded base XP')
  console.log('Anti-farm: PASS')

  const board = await leaderboard(students[0].client)
  const totalRows = testRows(board)
  if (totalRows.length !== 5) throw new Error('General leaderboard does not contain all five test students')
  const a = totalRows.find((row) => row.nickname.startsWith('SciTest1_'))
  const b = totalRows.find((row) => row.nickname.startsWith('SciTest2_'))
  const e = totalRows.find((row) => row.nickname.startsWith('SciTest5_'))
  if (!a || !b || Number(a.xp) !== Number(b.xp) || Number(a.rank) >= Number(b.rank)) throw new Error('Stars tie-breaker failed')
  if (!e || Number(e.xp) !== 40) throw new Error('Idempotency failed: duplicate delivery was counted twice')
  if (board.length < 3 || board.slice(0, 3).map((row) => Number(row.rank)).join(',') !== '1,2,3') throw new Error('Top 3 failed')
  const privateFields = ['user_id', 'email', 'phone', 'school', 'token', 'provider_data', 'auth_metadata']
  if (board.some((row) => privateFields.some((field) => field in row))) throw new Error('Leaderboard privacy failed')
  console.log('General leaderboard / Top 3 / privacy: PASS')

  for (const period of ['week', 'month']) {
    const rows = await leaderboard(students[0].client, period)
    if (testRows(rows).length !== 5) throw new Error(`${period} leaderboard failed`)
    console.log(`${period === 'week' ? 'Weekly' : 'Monthly'} leaderboard: PASS`)
  }

  const sectionRows = await leaderboard(students[0].client, 'total', 'research')
  if (testRows(sectionRows).length !== 5) throw new Error('Section leaderboard failed')
  console.log('Section leaderboard: PASS')

  const grade5 = testRows(await leaderboard(students[0].client, 'total', null, 5))
  const grade6 = testRows(await leaderboard(students[1].client, 'total', null, 6))
  if (grade5.length !== 3 || grade6.length !== 2 || grade5.some((row) => Number(row.grade) !== 5) || grade6.some((row) => Number(row.grade) !== 6)) throw new Error('Grade leaderboard failed')
  console.log('Grade leaderboard: PASS')

  const mine = await students[3].client.rpc('get_my_rank', { p_period: 'total', p_section: null, p_grade: null })
  if (mine.error || mine.data.length !== 1 || !mine.data[0].is_current) throw mine.error ?? new Error('Personal rank failed')
  console.log('Personal rank: PASS')

  const nearby = await students[3].client.rpc('get_nearby_leaderboard', { p_period: 'total' })
  if (nearby.error || nearby.data.length > 7 || !nearby.data.some((row) => row.is_current)) throw nearby.error ?? new Error('Nearby rivals failed')
  const currentIndex = nearby.data.findIndex((row) => row.is_current)
  if (currentIndex > 3 || nearby.data.length - currentIndex - 1 > 3) throw new Error('Nearby rivals exceeded ±3')
  console.log('Nearby rivals: PASS')

  const health = await students[0].client.rpc('check_leaderboard_health')
  if (health.error || !health.data?.[0]?.ok || Number(health.data[0].level_count) !== 98) throw health.error ?? new Error('Backend health check failed')

  mustReject(await students[0].client.from('xp_transactions').insert({ user_id: students[0].userId, level_id: openingLevels[0], xp: 300, reason: 'level_completion', transaction_key: 'hack' }), 'direct XP insert')
  mustReject(await students[0].client.from('xp_transactions').update({ xp: 300 }).eq('user_id', students[1].userId), 'foreign XP update')
  mustReject(await students[0].client.from('profiles').update({ display_name: 'Hacked' }).eq('id', students[1].userId), 'foreign profile update')
  mustReject(await students[0].client.from('student_progress').delete().eq('user_id', students[1].userId), 'foreign progress delete')
  mustReject(await students[0].client.from('xp_transactions').delete().eq('user_id', students[1].userId), 'foreign transaction delete')
  const foreignProfile = await students[0].client.from('profiles').select('*').eq('id', students[1].userId)
  if (foreignProfile.error || foreignProfile.data.length !== 0) throw new Error('RLS failed: foreign profile was readable')
  console.log('RLS write/read isolation: PASS')

  const perfectUpgrade = await submit(students[1], openingLevels[1], 100)
  const repeatedPerfect = await submit(students[1], openingLevels[1], 100)
  if (Number(perfectUpgrade?.awarded_xp) !== 20 || Number(repeatedPerfect?.awarded_xp) !== 0) throw new Error('One-time perfect bonus failed')
  console.log('One-time improvement bonus: PASS')

  const raceNickname = `SciKing_${unique}`
  const raceResults = await Promise.all([
    students[0].client.rpc('save_profile', { p_nickname: raceNickname, p_display_name: 'Science King A', p_grade: 5, p_school: null, p_avatar: '🧑‍🔬', p_show_grade: true }),
    students[1].client.rpc('save_profile', { p_nickname: raceNickname, p_display_name: 'Science King B', p_grade: 6, p_school: null, p_avatar: '🚀', p_show_grade: true }),
  ])
  const successes = raceResults.filter((result) => !result.error)
  const conflicts = raceResults.filter((result) => /nickname_taken/i.test(result.error?.message ?? ''))
  if (successes.length !== 1 || conflicts.length !== 1) throw new Error('Concurrent nickname uniqueness failed')
  console.log('Concurrent nickname uniqueness: PASS')

  console.log('Supabase public-client integration QA: PASS')
} finally {
  let cleaned = 0
  for (const student of students) {
    const result = await student.client.rpc('delete_my_account')
    if (!result.error) cleaned += 1
  }
  console.log(`Test-user cleanup: ${cleaned}/${students.length}`)
}
