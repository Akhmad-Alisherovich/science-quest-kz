import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const migration = read('supabase/migrations/202608220002_auth_admin.sql')
const authService = read('src/services/authService.ts')
const authStore = read('src/store/AuthStore.tsx')
const app = read('src/App.tsx')
const adminRoute = read('src/admin/AdminRoute.tsx')
const envExample = read('.env.example')
const source = [authService, authStore, app, adminRoute, read('src/services/adminService.ts')].join('\n')
const leaderboardService = read('src/services/leaderboardService.ts')

const checks = [
  ['new migration is additive', !/^\s*(drop\s+table|truncate|delete\s+from)\b/im.test(migration)],
  ['student/admin role constraint', /role\s+in\s*\('student','admin'\)/.test(migration)],
  ['new users default to student', /after insert on auth\.users[\s\S]*?_handle_new_user_role/.test(migration) && /values \(new\.id, 'student'\)/.test(migration)],
  ['role table has no client grants', /revoke all on public\.user_roles, public\.student_activity from anon, authenticated/.test(migration) && !/grant\s+(select|insert|update|delete)[^;]*user_roles/i.test(migration)],
  ['admin RPCs check server role', [...migration.matchAll(/create or replace function public\.(get_admin_[^(]+)/g)].every(([, name]) => new RegExp(`function public\\.${name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}[\\s\\S]*?if not public\\._is_admin\\(\\)`, 'i').test(migration))],
  ['daily analytics uses non-conflicting CTE date aliases', /calendar_days[\s\S]*?as day_date[\s\S]*?order by d\.day_date/.test(migration) && !/::date\s+(?:as\s+)?day\b/i.test(migration)],
  ['private admin helper is not executable by clients', /revoke all on function public\._is_admin\(uuid\) from public, anon, authenticated/.test(migration)],
  ['admin outputs exclude contacts and auth secrets', !/returns table\([^)]*(email|phone|password|access_token|refresh_token)/i.test(migration)],
  ['activity payload is allow-listed', /p_event_type not in \('LOGIN','LEVEL_STARTED'\)/.test(migration) && !/(email|phone|password|token)'\s*,\s*new\./i.test(migration)],
  ['official Supabase email auth', /auth\.signUp/.test(authService) && /auth\.signInWithPassword/.test(authService) && /resetPasswordForEmail/.test(authService)],
  ['phone OTP auth is removed', !/auth\.signInWithOtp|auth\.verifyOtp|sendPhoneOtp|verifyPhoneOtp/.test(authService)],
  ['anonymous linking uses email update and private contact storage', /isAnonymous[\s\S]*?saveMyPrivateContact[\s\S]*?auth\.updateUser\(\{ email/.test(authService)],
  ['passwords and tokens are not persisted', !/(localStorage|sessionStorage)\.setItem\([^,\n]+,\s*(password|otp|token|session\.|.*access_token|.*refresh_token)/i.test(source)],
  ['protected admin route is wired', /path\.startsWith\('\/admin'\)/.test(app) && /role !== 'admin'/.test(adminRoute)],
  ['offline results are scoped to user UUID', /type QueuedCompetitiveResult[^\n]*ownerId/.test(leaderboardService) && /queued\.ownerId === user\.id/.test(leaderboardService)],
  ['frontend env exposes publishable values only', /VITE_SUPABASE_PUBLISHABLE_KEY/.test(envExample) && !/(service_role|sb_secret|admin_secret)/i.test(envExample)],
]

let failed = 0
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) failed += 1
}
if (failed) {
  console.error(`Auth/admin static QA failed: ${failed} check(s).`)
  process.exit(1)
}
console.log(`Auth/admin static QA passed: ${checks.length} checks.`)
