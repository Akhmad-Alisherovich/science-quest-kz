import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_TEST_URL
const key = process.env.SUPABASE_TEST_PUBLISHABLE_KEY
if (!url || !key) {
  console.error('Set SUPABASE_TEST_URL and SUPABASE_TEST_PUBLISHABLE_KEY.')
  process.exit(1)
}

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
const original = createClient(url, key, options)
const suffix = Date.now().toString(36)
const email = `sciencequest.qa.${suffix}@example.com`
const password = `SqKz-${crypto.randomUUID()}!`
let authenticated = false

const assert = (condition, message) => { if (!condition) throw new Error(message) }

try {
  const anonymous = await original.auth.signInAnonymously()
  if (anonymous.error || !anonymous.data.user) throw anonymous.error ?? new Error('Anonymous sign-in failed')
  authenticated = true
  const userId = anonymous.data.user.id
  const profile = await original.rpc('save_profile', {
    p_nickname: `LinkQA_${suffix.slice(-7)}`,
    p_display_name: 'Linking QA',
    p_grade: 6,
    p_school: null,
    p_avatar: '🧬',
    p_show_grade: true,
  })
  if (profile.error) throw profile.error
  const submissionId = crypto.randomUUID()
  const submitted = await original.rpc('submit_level_result', {
    p_level_id: 'scientific-thinking-know',
    p_accuracy: 100,
    p_mistakes: 0,
    p_submission_id: submissionId,
  })
  if (submitted.error) throw submitted.error
  const before = await original.from('student_progress').select('level_id,stars').eq('user_id', userId)
  assert(!before.error && before.data.length === 1, 'Pre-link progress was not created')

  const linked = await original.auth.updateUser({ email })
  if (linked.error) throw linked.error
  const afterSession = await original.auth.getSession()
  assert(!afterSession.error && afterSession.data.session?.user.id === userId, 'Anonymous linking changed user UUID')
  const after = await original.from('student_progress').select('level_id,stars').eq('user_id', userId)
  assert(!after.error && JSON.stringify(after.data) === JSON.stringify(before.data), 'Progress changed during identity linking')
  console.log('Anonymous linking UUID/progress preservation: PASS')

  const currentUser = afterSession.data.session.user
  if (!currentUser.is_anonymous) {
    const passwordSet = await original.auth.updateUser({ password })
    if (passwordSet.error) throw passwordSet.error
    const loginClient = createClient(url, key, options)
    const login = await loginClient.auth.signInWithPassword({ email, password })
    assert(!login.error && login.data.user?.id === userId, 'Email/password login did not restore the linked account')
    const loginProgress = await loginClient.from('student_progress').select('level_id,stars').eq('user_id', userId)
    assert(!loginProgress.error && JSON.stringify(loginProgress.data) === JSON.stringify(before.data), 'Progress was not preserved after email login')
    const recovery = await loginClient.auth.resetPasswordForEmail(email, { redirectTo: 'http://localhost:4173/' })
    if (recovery.error) throw recovery.error
    await loginClient.auth.signOut()
    console.log('Email signup/login/recovery request: PASS')
  } else {
    const recovery = await original.auth.resetPasswordForEmail(email, { redirectTo: 'http://localhost:4173/' })
    if (recovery.error) throw recovery.error
    console.log('Email confirmation: REQUIRED')
    console.log('Email signup/login completion: WAITING_EMAIL_CONFIRMATION')
    console.log('Email recovery request endpoint: PASS')
  }
} finally {
  if (authenticated) {
    const cleanup = await original.rpc('delete_my_account')
    console.log(cleanup.error ? 'Auth linking test-user cleanup: FAIL' : 'Auth linking test-user cleanup: PASS')
  }
}
