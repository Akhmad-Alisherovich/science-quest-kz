import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const app = read('src/App.tsx')
const landing = read('src/pages/PublicLandingPage.tsx')
const landingCopy = read('src/content/publicLanding.ts')
const authStore = read('src/store/AuthStore.tsx')
const onlineStore = read('src/store/OnlineStore.tsx')
const gameStore = read('src/store/GameStore.tsx')
const leaderboardService = read('src/services/leaderboardService.ts')
const migration1 = read('supabase/migrations/202608220001_leaderboard.sql')
const migration2 = read('supabase/migrations/202608220002_auth_admin.sql')
const appRuntime = [app, authStore, onlineStore, leaderboardService].join('\n')

const checks = [
  ['public and private paths are explicit', /PUBLIC_PATHS[\s\S]*?'\/login'[\s\S]*?'\/register'[\s\S]*?'\/forgot-password'[\s\S]*?'\/verify'/.test(app) && /'\/profile'/.test(app) && /'\/leaderboard'/.test(app) && /'\/achievements'/.test(app)],
  ['session loading splash prevents guest flash', /auth\.phase === 'loading'[\s\S]*?return <AppLoading \/>/.test(app) && /function AppLoading\(\)[\s\S]*?className="app-loading"/.test(app)],
  ['guest branch renders the dedicated public landing', /!auth\.user[\s\S]*?PublicLandingPage/.test(app)],
  ['guest private URL is replaced with root', /!PUBLIC_PATHS\.has\(path\)[\s\S]*?navigate\('\/', true\)/.test(app)],
  ['public landing contains no private components or online store', !/(useOnline|Leaderboard|ProfilePage|AchievementsPage|GameMap|RankMovement|fetch[A-Z]|supabase)/.test(landing)],
  ['public landing contains only static feature copy', /Интерактивті тәжірибелер/.test(landingCopy) && /Интерактивные эксперименты/.test(landingCopy) && !/(\bXP\b|personal rank|nearby rivals|weekly leaders)/i.test(landingCopy)],
  ['login and registration CTAs have real routes', /onLogin=\{\(\) => navigate\('\/login'\)\}/.test(app) && /onRegister=\{\(\) => navigate\('\/register'\)\}/.test(app)],
  ['automatic anonymous sign-in is absent from runtime source', !/signInAnonymously/.test(appRuntime) && !/ensureAnonymousSession/.test(appRuntime)],
  ['backend service requires an existing session', /function requireAuthenticatedUser/.test(leaderboardService) && /throw new Error\('AUTHENTICATION_REQUIRED'\)/.test(leaderboardService)],
  ['online store exits before private fetches without a session', /if \(!session\) \{[\s\S]*?setStatus\('unauthenticated'\)[\s\S]*?return[\s\S]*?setStatus\('connecting'\)/.test(onlineStore)],
  ['logout removes private in-memory account state', /deactivateAccount/.test(gameStore) && /setProfile\(null\)[\s\S]*?setRankMovement\(0\)[\s\S]*?deactivateAccount\(\)/.test(onlineStore)],
  ['admin access uses server role state', /auth\.role === 'admin'/.test(app) && /getMyRole/.test(authStore)],
  ['student profile setup guard remains active', /status === 'ready' && !profile[\s\S]*?ProfileSetupPage/.test(app)],
  ['leaderboard tables are denied to anon', /revoke all on public\.profiles[\s\S]*?from anon, authenticated/.test(migration1)],
  ['leaderboard RPC is denied to anon', /revoke all on function public\.get_leaderboard[\s\S]*?from public, anon/.test(migration1)],
  ['admin data and RPCs are denied to anon', /revoke all on public\.user_roles, public\.student_activity from anon, authenticated/.test(migration2) && /revoke all on function public\.get_admin_dashboard\(\) from public, anon/.test(migration2)],
]

let failed = 0
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) failed += 1
}
if (failed) {
  console.error(`Authentication gate QA failed: ${failed} check(s).`)
  process.exit(1)
}
console.log(`Authentication gate QA passed: ${checks.length} checks.`)
