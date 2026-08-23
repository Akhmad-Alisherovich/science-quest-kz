import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_TEST_URL
const publishableKey = process.env.SUPABASE_TEST_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  console.error('Supabase configuration is missing.')
  process.exit(1)
}

const client = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

let authenticated = false
let cleanupAvailable = false

try {
  console.log('Supabase client: CONFIGURED')
  const auth = await client.auth.signInAnonymously()
  if (auth.error || !auth.data.user) {
    if (/anonymous.*(disabled|not enabled)|signups not allowed/i.test(auth.error?.message ?? '')) {
      console.error('Anonymous Sign-Ins must be enabled in Supabase Dashboard.')
      process.exitCode = 2
    } else {
      console.error(`Anonymous Auth: FAIL (${auth.error?.code ?? 'unknown'})`)
      process.exitCode = 1
    }
  } else {
    authenticated = true
    console.log('Anonymous Auth: PASS')

    const database = await client.from('game_levels').select('level_id', { count: 'exact', head: true })
    if (database.error) {
      console.error(`Database schema: FAIL (${database.error.code ?? 'unknown'})`)
      process.exitCode = 3
    } else {
      console.log(`Database schema: PASS (${database.count ?? 0} levels)`)
      const health = await client.rpc('check_leaderboard_health')
      if (health.error || !health.data?.[0]?.ok) {
        console.error(`Leaderboard RPC: FAIL (${health.error?.code ?? 'unknown'})`)
        process.exitCode = 4
      } else {
        cleanupAvailable = true
        console.log(`Leaderboard RPC: PASS (schema ${health.data[0].schema_version})`)
      }
    }
  }
} finally {
  if (authenticated && cleanupAvailable) {
    const cleanup = await client.rpc('delete_my_account')
    console.log(cleanup.error ? 'Connectivity user cleanup: FAIL' : 'Connectivity user cleanup: PASS')
  }
}
