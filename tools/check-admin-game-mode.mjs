import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const app = read('src/App.tsx')
const auth = read('src/store/AuthStore.tsx')
const map = read('src/game/GameMap.tsx')
const level = read('src/pages/LevelPage.tsx')
const boss = read('src/game/BossMission.tsx')
const header = read('src/components/AppHeader.tsx')
const profile = read('src/admin/AdminProfile.tsx')
const migration = read('supabase/migrations/202608230002_learning_management.sql')

const checks = [
  ['server role is loaded', auth.includes('setRole(await getMyRole())')],
  ['role is not inferred from email', !/role\s*=.*email|email.*role\s*=/i.test(auth)],
  ['admin skips student profile setup', app.includes("auth.role !== 'admin' && status === 'ready' && !profile")],
  ['admin game button opens map', (app.match(/onGame=\{\(\) => navigate\('\/game\/map'\)\}/g) ?? []).length >= 2],
  ['admin game mode derives from server role', app.includes("const adminMode = role === 'admin'")],
  ['admin starts no activity event', app.includes('if (!adminMode) void logLevelStarted')],
  ['admin bypasses teacher locks', app.includes('const blocked = !adminMode')],
  ['admin banner is visible', app.includes('ADMIN MODE') && app.includes('Әкімші режимі')],
  ['admin return action is visible', header.includes('header-admin-return') && app.includes('onAdmin={onAdmin}')],
  ['map opens all content for admin', map.includes('const unlocked = adminMode ||') && map.includes('const bossUnlocked = adminMode ||')],
  ['every admin topic level has a direct route', map.includes('admin-level-picker') && map.includes('levelList.map((level)') && map.includes('onOpenLevel(level.id)')],
  ['level completion is read-only', level.includes('if (!adminMode) completeLevel')],
  ['boss completion is read-only', boss.includes('if (!adminMode) completeBoss')],
  ['competitive notifications are hidden', app.includes('{!adminMode && <AchievementModal />}') && app.includes('{!adminMode && <RankMovementToast />}')],
  ['admin profile is separate and local', profile.includes('science-quest-kz-admin-profile-v1:') && !profile.includes('saveProfile') && !profile.includes('useOnline')],
  ['server rejects admin submissions', migration.includes("raise exception 'admin_read_only'")],
  ['leaderboard includes students only', /_leaderboard_snapshot[\s\S]*?join public\.user_roles role_row[\s\S]*?role_row\.role = 'student'/.test(migration)],
]

const failures = checks.filter(([, ok]) => !ok).map(([name]) => name)
if (failures.length) {
  console.error(`Admin Game Mode QA failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log(`Admin Game Mode QA OK: ${checks.length} invariants.`)
