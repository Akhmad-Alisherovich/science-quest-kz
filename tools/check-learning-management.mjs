import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const migration = read('supabase/migrations/202608230002_learning_management.sql')
const migration1 = read('supabase/migrations/202608220001_leaderboard.sql')
const migration2 = read('supabase/migrations/202608220002_auth_admin.sql')
const app = [read('src/admin/AdminApp.tsx'), read('src/admin/AdminAssignments.tsx'), read('src/admin/AdminContentControl.tsx'), read('src/admin/AdminMonitoring.tsx'), read('src/admin/AdminSitePreview.tsx'), read('src/admin/AdminStudentLearningDetail.tsx'), read('src/game/GameMap.tsx'), read('src/pages/LandingPage.tsx'), read('src/store/LearningStore.tsx'), read('src/services/learningService.ts')].join('\n')

const checks = [
  ['applied migrations remain independent', !migration1.includes('learning_content_catalog') && !migration2.includes('learning_content_catalog')],
  ['catalog uses all stable content layers', /learning_content_catalog/.test(migration) && /'section','research'/.test(migration) && /'photosynthesis','life'/.test(migration) && /from public\.game_levels/.test(migration)],
  ['assignment schema is complete', ['assignments','assignment_targets','assignment_items','student_assignment_progress'].every((name) => migration.includes(`public.${name}`))],
  ['access states distinguish locked and hidden', /access_state in \('open','locked','hidden','assigned'\)/.test(migration)],
  ['student learning tables use RLS', ['learning_content_catalog','content_access_rules','assignments','assignment_items','student_assignment_progress','admin_learning_audit'].every((name) => migration.includes(`alter table public.${name} enable row level security`))],
  ['students receive no mutation grants', !/grant\s+(insert|update|delete|all)[\s\S]*?(assignments|content_access_rules|student_assignment_progress)\s+to authenticated/i.test(migration)],
  ['admin RPCs enforce server role', ['admin_set_content_access','admin_clear_content_access','admin_create_assignment','admin_update_assignment','admin_get_assignments','admin_get_student_access','admin_get_content_overview','admin_get_learning_dashboard','admin_get_learning_audit'].every((name) => new RegExp(`function public\\.${name}[\\s\\S]{0,900}?public\\._is_admin\\(\\)`).test(migration))],
  ['invalid content is rejected server-side', /raise exception 'content_not_found'/.test(migration)],
  ['access writes are idempotent', /on conflict\(target_type,target_value,content_type,content_id\) do update/.test(migration)],
  ['admin actions are audited', /ADMIN_ASSIGNMENT_CREATED/.test(migration) && /ADMIN_CONTENT_LOCKED/.test(migration) && /admin_learning_audit/.test(migration)],
  ['effective access combines rules assignments and progression', /_resolve_learning_rule/.test(migration) && /_find_learning_assignment/.test(migration) && /_normal_learning_access/.test(migration) && /get_my_content_access/.test(migration)],
  ['server submissions enforce effective access', /v_effective_access := public\._effective_learning_access/.test(migration) && /raise exception 'level_locked'/.test(migration)],
  ['offline idempotency and anti-farm receipts remain', /p_submission_id uuid/.test(migration) && /pg_advisory_xact_lock/.test(migration) && /transaction_key/.test(migration)],
  ['preview is explicitly read-only', /ADMIN PREVIEW · NO XP · NO SUBMISSIONS/.test(app) && !/completeLevel|completeBoss|enqueueCompetitiveResult/.test(read('src/admin/AdminSitePreview.tsx'))],
  ['student map uses server access', /useLearning/.test(read('src/game/GameMap.tsx')) && /accessState/.test(read('src/game/GameMap.tsx'))],
  ['Kazakh management vocabulary is present', ['Оқушылар','Тапсырмалар','Тақырыптар мен квесттер','Ойын барысы','Қолжетімділік','Құлыптау','Жасыру','Тағайындау'].every((term) => app.includes(term))],
]

let failed = 0
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) failed += 1 }
if (failed) { console.error(`Learning management QA failed: ${failed} check(s).`); process.exit(1) }
console.log(`Learning management QA passed: ${checks.length} checks.`)
