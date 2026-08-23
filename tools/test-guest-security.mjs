import { readFileSync } from 'node:fs'

const parseEnv = (path) => Object.fromEntries(readFileSync(path, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#') && line.includes('=')).map((line) => {
  const index = line.indexOf('=')
  return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, '')]
}))

const env = { ...parseEnv('.env.local'), ...process.env }
const url = env.VITE_SUPABASE_URL ?? env.SUPABASE_TEST_URL
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_TEST_PUBLISHABLE_KEY
if (!url || !key) throw new Error('Supabase public configuration is missing')

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
const probes = [
  ['private profile', '/rest/v1/profiles?select=id&limit=1', 'GET'],
  ['student progress', '/rest/v1/student_progress?select=user_id&limit=1', 'GET'],
  ['student achievements', '/rest/v1/student_achievements?select=user_id&limit=1', 'GET'],
  ['student activity', '/rest/v1/student_activity?select=id&limit=1', 'GET'],
  ['private contacts', '/rest/v1/user_private_contacts?select=user_id,phone&limit=1', 'GET'],
  ['own contact RPC', '/rest/v1/rpc/get_my_private_contact', 'POST', {}],
  ['leaderboard RPC', '/rest/v1/rpc/get_leaderboard', 'POST', { p_period: 'total', p_section: null, p_grade: null, p_limit: 1, p_offset: 0 }],
  ['personal rank RPC', '/rest/v1/rpc/get_my_rank', 'POST', { p_period: 'total', p_section: null, p_grade: null }],
  ['nearby rivals RPC', '/rest/v1/rpc/get_nearby_leaderboard', 'POST', { p_period: 'total' }],
  ['admin dashboard RPC', '/rest/v1/rpc/get_admin_dashboard', 'POST', {}],
  ['admin contact RPC', '/rest/v1/rpc/get_admin_student_contact', 'POST', { p_user_id: '00000000-0000-0000-0000-000000000000' }],
]

let failed = 0
for (const [name, path, method, body] of probes) {
  const response = await fetch(`${url}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const denied = response.status === 401 || response.status === 403 || response.status === 404
  console.log(`${denied ? 'PASS' : 'FAIL'}  guest ${name} blocked (HTTP ${response.status})`)
  if (!denied) failed += 1
}

if (failed) {
  console.error(`Guest security cloud QA failed: ${failed} endpoint(s) exposed.`)
  process.exit(1)
}
console.log(`Guest security cloud QA passed: ${probes.length} private endpoints blocked.`)
